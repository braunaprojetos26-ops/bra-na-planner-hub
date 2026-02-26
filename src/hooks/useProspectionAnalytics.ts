import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, differenceInHours, parseISO, format } from 'date-fns';

interface ProspectionEvent {
  id: string;
  contact_id: string;
  action: string;
  changed_by: string;
  created_at: string;
  notes: string | null;
  changed_by_profile?: {
    full_name: string;
  };
}

interface TimeSeriesPoint {
  date: string;
  added: number;
  converted: number;
  lost: number;
}

interface OwnerMetrics {
  ownerId: string;
  ownerName: string;
  added: number;
  converted: number;
  lost: number;
  conversionRate: number;
}

export interface ProspectionAnalyticsData {
  totalAdded: number;
  totalConverted: number;
  totalLost: number;
  totalPending: number;
  conversionRate: number;
  lossRate: number;
  averageTimeToConversion: number | null;
  timeSeriesData: TimeSeriesPoint[];
  ownerMetrics: OwnerMetrics[];
}

interface UseProspectionAnalyticsParams {
  startDate: Date;
  endDate: Date;
  ownerId?: string;
}

export function useProspectionAnalytics({ startDate, endDate, ownerId }: UseProspectionAnalyticsParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prospection-analytics', startDate.toISOString(), endDate.toISOString(), ownerId],
    queryFn: async (): Promise<ProspectionAnalyticsData> => {
      // Fetch all prospection-related events within the date range
      let query = supabase
        .from('contact_history')
        .select(`
          id,
          contact_id,
          action,
          changed_by,
          created_at,
          notes,
          changed_by_profile:profiles!contact_history_changed_by_fkey(full_name)
        `)
        .in('action', ['added_to_prospection', 'prospection_negotiation_started', 'prospection_no_contact'])
        .gte('created_at', startOfDay(startDate).toISOString())
        .lte('created_at', endOfDay(endDate).toISOString())
        .order('created_at', { ascending: true });

      if (ownerId) {
        query = query.eq('changed_by', ownerId);
      }

      const { data: events, error } = await query;

      if (error) throw error;

      const typedEvents = (events || []) as ProspectionEvent[];

      // Group events by contact to analyze each prospection cycle
      const contactCycles = new Map<string, ProspectionEvent[]>();
      
      typedEvents.forEach(event => {
        const existing = contactCycles.get(event.contact_id) || [];
        existing.push(event);
        contactCycles.set(event.contact_id, existing);
      });

      // Calculate metrics
      let totalAdded = 0;
      let totalConverted = 0;
      let totalLost = 0;
      const conversionTimes: number[] = [];
      const ownerStats = new Map<string, { name: string; added: number; converted: number; lost: number }>();

      // Time series data
      const dateStats = new Map<string, { added: number; converted: number; lost: number }>();

      typedEvents.forEach(event => {
        const dateKey = format(parseISO(event.created_at), 'yyyy-MM-dd');
        const existing = dateStats.get(dateKey) || { added: 0, converted: 0, lost: 0 };
        
        // Update owner stats
        const ownerName = event.changed_by_profile?.full_name || 'Desconhecido';
        const ownerStat = ownerStats.get(event.changed_by) || { name: ownerName, added: 0, converted: 0, lost: 0 };

        if (event.action === 'added_to_prospection') {
          totalAdded++;
          existing.added++;
          ownerStat.added++;
        } else if (event.action === 'prospection_negotiation_started') {
          totalConverted++;
          existing.converted++;
          ownerStat.converted++;
        } else if (event.action === 'prospection_no_contact') {
          totalLost++;
          existing.lost++;
          ownerStat.lost++;
        }

        dateStats.set(dateKey, existing);
        ownerStats.set(event.changed_by, ownerStat);
      });

      // Calculate conversion times for each contact
      contactCycles.forEach((events) => {
        // Sort events by date
        const sortedEvents = events.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Find cycles: added -> converted
        let lastAddedAt: Date | null = null;
        
        sortedEvents.forEach(event => {
          if (event.action === 'added_to_prospection') {
            lastAddedAt = parseISO(event.created_at);
          } else if (event.action === 'prospection_negotiation_started' && lastAddedAt) {
            const hours = differenceInHours(parseISO(event.created_at), lastAddedAt);
            conversionTimes.push(hours);
            lastAddedAt = null; // Reset for next potential cycle
          }
        });
      });

      // Calculate average conversion time
      const averageTimeToConversion = conversionTimes.length > 0
        ? conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
        : null;

      // Get current pending count (contacts currently in the list)
      const { count: pendingCount } = await supabase
        .from('contact_prospection_list')
        .select('*', { count: 'exact', head: true });

      // Build time series data sorted by date
      const timeSeriesData: TimeSeriesPoint[] = Array.from(dateStats.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({
          date,
          added: stats.added,
          converted: stats.converted,
          lost: stats.lost,
        }));

      // Build owner metrics
      const ownerMetrics: OwnerMetrics[] = Array.from(ownerStats.entries()).map(([ownerId, stats]) => ({
        ownerId,
        ownerName: stats.name,
        added: stats.added,
        converted: stats.converted,
        lost: stats.lost,
        conversionRate: stats.added > 0 ? (stats.converted / stats.added) * 100 : 0,
      }));

      return {
        totalAdded,
        totalConverted,
        totalLost,
        totalPending: pendingCount || 0,
        conversionRate: totalAdded > 0 ? (totalConverted / totalAdded) * 100 : 0,
        lossRate: totalAdded > 0 ? (totalLost / totalAdded) * 100 : 0,
        averageTimeToConversion,
        timeSeriesData,
        ownerMetrics,
      };
    },
    enabled: !!user,
  });
}

export function useProspectionOwners() {
  return useQuery({
    queryKey: ['prospection-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;

      return (data || []).map((p) => ({ id: p.user_id, name: p.full_name }));
    },
  });
}
