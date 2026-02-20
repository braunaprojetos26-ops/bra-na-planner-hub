import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeamFilters } from './useTeamAnalytics';

// Funnel/stage IDs
const PROSPECAO_PLANEJAMENTO_FUNNEL = '11111111-1111-1111-1111-111111111111';
const REUNIAO_AGENDADA_STAGE = 'fa3c2495-6fe4-43f0-84d0-913105bbdbb7';
const ANALISE_FEITA_STAGE = '2f1f297e-5870-4c88-9dd5-2a311a7b6978';

export interface TeamEffortMetrics {
  // Prospection
  contactsAdded: number;
  contactsConverted: number;
  contactsLost: number;
  conversionRate: number;
  // Analyses
  analysesScheduled: number;
  analysesDone: number;
}

export function useTeamEfforts(filters: TeamFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-efforts', filters, user?.id],
    queryFn: async (): Promise<TeamEffortMetrics> => {
      if (!user) throw new Error('User not authenticated');

      const dateFrom = filters.dateFrom.toISOString();
      const dateTo = filters.dateTo.toISOString();

      // Get accessible user IDs with same filter logic as useTeamAnalytics
      const { data: accessibleIds, error: accessError } = await supabase
        .rpc('get_accessible_user_ids', { _accessor_id: user.id });
      if (accessError) throw accessError;

      let targetUserIds = accessibleIds || [];

      if (filters.plannerId) {
        targetUserIds = [filters.plannerId];
      } else if (filters.leaderId) {
        const { data: leaderSubs } = await supabase
          .from('user_hierarchy').select('user_id').eq('manager_user_id', filters.leaderId);
        const leaderSubIds = leaderSubs?.map(s => s.user_id) || [];
        targetUserIds = targetUserIds.filter(id => id === filters.leaderId || leaderSubIds.includes(id));
      } else if (filters.coordinatorId) {
        const { data: coordSubs } = await supabase
          .from('user_hierarchy').select('user_id').eq('manager_user_id', filters.coordinatorId);
        const coordSubIds = coordSubs?.map(s => s.user_id) || [];
        const { data: deepSubs } = await supabase
          .from('user_hierarchy').select('user_id').in('manager_user_id', coordSubIds);
        const deepSubIds = deepSubs?.map(s => s.user_id) || [];
        const allCoordSubs = [...new Set([filters.coordinatorId, ...coordSubIds, ...deepSubIds])];
        targetUserIds = targetUserIds.filter(id => allCoordSubs.includes(id));
      }

      if (targetUserIds.length === 0) {
        return { contactsAdded: 0, contactsConverted: 0, contactsLost: 0, conversionRate: 0, analysesScheduled: 0, analysesDone: 0 };
      }

      // Parallel queries
      const [prospectionRes, scheduledRes, doneRes] = await Promise.all([
        // Prospection events from contact_history
        supabase
          .from('contact_history')
          .select('action')
          .in('changed_by', targetUserIds)
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo)
          .in('action', ['added_to_prospection', 'prospection_negotiation_started', 'prospection_no_contact']),

        // Analyses scheduled: contact_history stage_change FROM Reunião Agendada in PROSPECÇÃO funnel (won = moved out)
        supabase
          .from('contact_history')
          .select('id')
          .in('changed_by', targetUserIds)
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo)
          .eq('action', 'stage_change')
          .eq('from_stage_id', REUNIAO_AGENDADA_STAGE),

        // Analyses done: contact_history stage_change TO Análise Feita
        supabase
          .from('contact_history')
          .select('id')
          .in('changed_by', targetUserIds)
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo)
          .eq('action', 'stage_change')
          .eq('to_stage_id', ANALISE_FEITA_STAGE),
      ]);

      const prospectionEvents = prospectionRes.data || [];
      const contactsAdded = prospectionEvents.filter(e => e.action === 'added_to_prospection').length;
      const contactsConverted = prospectionEvents.filter(e => e.action === 'prospection_negotiation_started').length;
      const contactsLost = prospectionEvents.filter(e => e.action === 'prospection_no_contact').length;
      const conversionRate = contactsAdded > 0 ? (contactsConverted / contactsAdded) * 100 : 0;

      const analysesScheduled = scheduledRes.data?.length || 0;
      const analysesDone = doneRes.data?.length || 0;

      return {
        contactsAdded,
        contactsConverted,
        contactsLost,
        conversionRate,
        analysesScheduled,
        analysesDone,
      };
    },
    enabled: !!user,
  });
}
