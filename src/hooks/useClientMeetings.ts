import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ClientPlanMeeting, ClientPlanMeetingStatus } from '@/types/clients';

export function usePlanMeetings(planId: string) {
  return useQuery({
    queryKey: ['plan-meetings', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_plan_meetings')
        .select(`
          *,
          meeting:meetings(id, scheduled_at, status)
        `)
        .eq('plan_id', planId)
        .order('meeting_number', { ascending: true });

      if (error) throw error;
      return data as ClientPlanMeeting[];
    },
    enabled: !!planId,
  });
}

export function useUpdatePlanMeeting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      meetingId,
      data,
    }: {
      meetingId: string;
      data: Partial<Pick<ClientPlanMeeting, 'status' | 'completed_at' | 'meeting_id' | 'scheduled_date' | 'theme'>>;
    }) => {
      const { error } = await supabase
        .from('client_plan_meetings')
        .update(data)
        .eq('id', meetingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['client-plan'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-metrics'] });
      toast({ title: 'Reunião atualizada!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar reunião',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMarkMeetingCompleted() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase
        .from('client_plan_meetings')
        .update({
          status: 'completed' as ClientPlanMeetingStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['client-plan'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-metrics'] });
      toast({ title: 'Reunião marcada como concluída!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao marcar reunião como concluída',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
