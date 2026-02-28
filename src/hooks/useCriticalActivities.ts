import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ActivityWithStats {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  urgency: string;
  target_positions: any;
  deadline: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_assigned: number;
  total_completed: number;
  completion_percentage: number;
}

export interface CriticalActivityAssignment {
  id: string;
  activity_id: string;
  user_id: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  user_profile?: {
    full_name: string;
    position: string | null;
  };
}

export interface CreateActivityData {
  title: string;
  description?: string;
  urgency: string;
  target_positions: string[] | null;
  deadline: string;
  is_perpetual?: boolean;
  rule_type?: string;
  rule_config?: Record<string, any>;
  recurrence_interval?: string;
  use_rule?: boolean;
}

export function useCriticalActivities() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === 'superadmin' || role === 'gerente';

  // Admin: fetch all activities with stats
  const allActivitiesQuery = useQuery({
    queryKey: ['critical-activities', 'all'],
    queryFn: async () => {
      const { data: activities, error } = await supabase
        .from('critical_activities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const result: ActivityWithStats[] = [];
      for (const act of activities || []) {
        const { data: assignments } = await supabase
          .from('critical_activity_assignments')
          .select('status')
          .eq('activity_id', act.id);

        const total = assignments?.length || 0;
        const completed = assignments?.filter(a => a.status === 'completed').length || 0;

        result.push({
          ...act,
          total_assigned: total,
          total_completed: completed,
          completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        });
      }
      return result;
    },
    enabled: !!user && isAdmin,
  });

  // Admin: fetch detail of one activity
  const useActivityDetail = (activityId: string | null) => {
    return useQuery({
      queryKey: ['critical-activity-detail', activityId],
      queryFn: async () => {
        if (!activityId) return null;
        
        const { data: activity, error } = await supabase
          .from('critical_activities')
          .select('*')
          .eq('id', activityId)
          .single();
        if (error) throw error;

        const { data: assignments, error: aErr } = await supabase
          .from('critical_activity_assignments')
          .select('*')
          .eq('activity_id', activityId)
          .order('status', { ascending: true });
        if (aErr) throw aErr;

        const userIds = (assignments || []).map(a => a.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, position')
          .in('user_id', userIds);

        const enrichedAssignments = (assignments || []).map(a => ({
          ...a,
          user_profile: profiles?.find(p => p.user_id === a.user_id) || undefined,
        }));

        const total = enrichedAssignments.length;
        const completed = enrichedAssignments.filter(a => a.status === 'completed').length;

        return {
          activity,
          assignments: enrichedAssignments,
          total_assigned: total,
          total_completed: completed,
          completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      },
      enabled: !!activityId && isAdmin,
    });
  };

  // Create activity
  const createActivity = useMutation({
    mutationFn: async (data: CreateActivityData) => {
      const { data: activity, error } = await supabase
        .from('critical_activities')
        .insert({
          created_by: user!.id,
          title: data.title,
          description: data.description || null,
          urgency: data.urgency,
          target_positions: data.target_positions && data.target_positions.length > 0 ? data.target_positions : null,
          deadline: data.deadline,
          is_perpetual: data.is_perpetual || false,
          rule_type: data.rule_type || null,
          rule_config: data.rule_config || {},
          recurrence_interval: data.recurrence_interval || null,
        })
        .select()
        .single();
      if (error) throw error;

      // For perpetual rule-based activities, don't distribute immediately
      if (data.is_perpetual && data.rule_type !== 'manual_recurrence') {
        return { activity, distributed_count: 0, is_perpetual: true, is_rule: false };
      }

      // One-time with rule: call edge function to evaluate and distribute
      if (data.use_rule && data.rule_type) {
        const { data: result, error: evalErr } = await supabase.functions.invoke('evaluate-single-activity', {
          body: { activity_id: activity.id },
        });
        if (evalErr) throw evalErr;
        return { activity, distributed_count: result?.tasks_created || 0, is_perpetual: false, is_rule: true };
      }

      // Distribute to users (creates assignments + tasks)
      const { data: count, error: distErr } = await supabase
        .rpc('distribute_critical_activity', { p_activity_id: activity.id });
      if (distErr) throw distErr;

      return { activity, distributed_count: count, is_perpetual: false, is_rule: false };
    },
    onSuccess: (result) => {
      if (result.is_perpetual) {
        toast.success('Atividade perpétua criada! Tarefas serão geradas automaticamente quando a condição for detectada.');
      } else if (result.is_rule) {
        toast.success(`Atividade criada! Regra avaliada e ${result.distributed_count} tarefa(s) criada(s).`);
      } else {
        toast.success(`Atividade criada e distribuída para ${result.distributed_count} usuário(s).`);
      }
      queryClient.invalidateQueries({ queryKey: ['critical-activities'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar atividade: ' + error.message);
    },
  });

  // Delete activity (cascade: tasks + assignments)
  const deleteActivity = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase.rpc('delete_critical_activity', { p_activity_id: activityId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Atividade excluída com sucesso. Tarefas associadas foram removidas.');
      queryClient.invalidateQueries({ queryKey: ['critical-activities'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir atividade: ' + error.message);
    },
  });

  return {
    allActivities: allActivitiesQuery.data || [],
    allActivitiesLoading: allActivitiesQuery.isLoading,
    isAdmin,
    createActivity,
    deleteActivity,
    useActivityDetail,
  };
}
