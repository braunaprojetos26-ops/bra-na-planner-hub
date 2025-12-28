import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TicketDepartment, TicketPriority } from '@/types/tickets';

export interface EfficiencyMetrics {
  completedTickets: number;
  totalTicketsInPeriod: number;
  averageResponseTimeMinutes: number | null;
  averageCompletionTimeMinutes: number | null;
  resolutionRate: number;
}

interface UseTicketEfficiencyOptions {
  department: TicketDepartment | null;
  startDate: Date;
  endDate: Date;
  priority: TicketPriority | null;
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '-';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(minutes / 1440);
  const hours = Math.round((minutes % 1440) / 60);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export function useTicketEfficiency({ department, startDate, endDate, priority }: UseTicketEfficiencyOptions) {
  const { user } = useAuth();

  const { data: ticketsData, isLoading: isLoadingTickets } = useQuery({
    queryKey: ['efficiency-tickets', department, startDate.toISOString(), endDate.toISOString(), priority],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select('id, created_at, status, priority, resolved_at, created_by')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (department) {
        query = query.eq('department', department);
      }

      if (priority) {
        query = query.eq('priority', priority);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['efficiency-messages', ticketsData?.map(t => t.id)],
    queryFn: async () => {
      if (!ticketsData || ticketsData.length === 0) return [];

      const ticketIds = ticketsData.map(t => t.id);
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('ticket_id, created_at, created_by')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!ticketsData && ticketsData.length > 0,
  });

  const metrics = useMemo<EfficiencyMetrics | null>(() => {
    if (!ticketsData) return null;

    const totalTicketsInPeriod = ticketsData.length;
    const completedTickets = ticketsData.filter(t => 
      t.status === 'resolved' || t.status === 'closed'
    ).length;

    // Taxa de resolução
    const resolutionRate = totalTicketsInPeriod > 0 
      ? (completedTickets / totalTicketsInPeriod) * 100 
      : 0;

    // Tempo médio de conclusão
    let averageCompletionTimeMinutes: number | null = null;
    const ticketsWithResolution = ticketsData.filter(t => t.resolved_at);
    if (ticketsWithResolution.length > 0) {
      const totalMinutes = ticketsWithResolution.reduce((acc, ticket) => {
        const createdAt = new Date(ticket.created_at).getTime();
        const resolvedAt = new Date(ticket.resolved_at!).getTime();
        return acc + (resolvedAt - createdAt) / (1000 * 60);
      }, 0);
      averageCompletionTimeMinutes = totalMinutes / ticketsWithResolution.length;
    }

    // Tempo médio de resposta (primeira mensagem de alguém diferente do criador)
    let averageResponseTimeMinutes: number | null = null;
    if (messagesData && messagesData.length > 0) {
      const responseTimes: number[] = [];

      ticketsData.forEach(ticket => {
        const ticketMessages = messagesData.filter(m => m.ticket_id === ticket.id);
        const firstResponse = ticketMessages.find(m => m.created_by !== ticket.created_by);
        
        if (firstResponse) {
          const createdAt = new Date(ticket.created_at).getTime();
          const responseAt = new Date(firstResponse.created_at).getTime();
          responseTimes.push((responseAt - createdAt) / (1000 * 60));
        }
      });

      if (responseTimes.length > 0) {
        averageResponseTimeMinutes = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }
    }

    return {
      completedTickets,
      totalTicketsInPeriod,
      averageResponseTimeMinutes,
      averageCompletionTimeMinutes,
      resolutionRate,
    };
  }, [ticketsData, messagesData]);

  return {
    metrics,
    isLoading: isLoadingTickets || isLoadingMessages,
  };
}
