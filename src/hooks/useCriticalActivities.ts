import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CriticalActivity {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  urgency: string;
  target_positions: string[] | null;
  deadline: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export interface CreateActivityData {
  title: string;
  description?: string;
  urgency: string;
  target_positions: string[] | null;
  deadline: string;
}

export function useCriticalActivities() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === 'superadmin' || role === 'gerente';

  // Fetch my assignments (for all users)
  const myAssignmentsQuery = useQuery({
    queryKey: ['critical-activity-assignments', 'mine'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('critical_activity_assignments')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CriticalActivityAssignment[];
    },
    enabled: !!user,
  });

  // Fetch activities that I'm assigned to
  const myActivitiesQuery = useQuery({
    queryKey: ['critical-activities', 'mine'],
    queryFn: async () => {
      // First get my assignment activity_ids
      const { data: assignments, error: aErr } = await supabase
        .from('critical_activity_assignments')
        .select('activity_id, status, completed_at')
        .eq('user_id', user!.id);
      if (aErr) throw aErr;

      if (!assignments || assignments.length === 0) return [];

      const activityIds = assignments.map(a => a.activity_id);
      const { data: activities, error: actErr } = await supabase
        .from('critical_activities')
        .select('*')
        .in('id', activityIds)
        .eq('is_active', true)
        .order('deadline', { ascending: true });
      if (actErr) throw actErr;

      // Merge assignment status
      return (activities || []).map(act => {
        const assignment = assignments.find(a => a.activity_id === act.id);
        return {
          ...act,
          my_status: assignment?.status || 'pending',
          my_completed_at: assignment?.completed_at || null,
        };
      });
    },
    enabled: !!user,
  });

  // Admin: fetch all activities with stats
  const allActivitiesQuery = useQuery({
    queryKey: ['critical-activities', 'all'],
    queryFn: async () => {
      const { data: activities, error } = await supabase
        .from('critical_activities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get stats for each activity
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

        // Get user profiles for assignments
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
        })
        .select()
        .single();
      if (error) throw error;

      // Distribute to users
      const { data: count, error: distErr } = await supabase
        .rpc('distribute_critical_activity', { p_activity_id: activity.id });
      if (distErr) throw distErr;

      return { activity, distributed_count: count };
    },
    onSuccess: (result) => {
      toast.success(`Atividade criada e distribuída para ${result.distributed_count} usuário(s)`);
      queryClient.invalidateQueries({ queryKey: ['critical-activities'] });
      queryClient.invalidateQueries({ queryKey: ['critical-activity-assignments'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar atividade: ' + error.message);
    },
  });

  // Complete assignment
  const completeAssignment = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('critical_activity_assignments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('activity_id', activityId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Atividade marcada como concluída!');
      queryClient.invalidateQueries({ queryKey: ['critical-activities'] });
      queryClient.invalidateQueries({ queryKey: ['critical-activity-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['critical-activity-detail'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao concluir atividade: ' + error.message);
    },
  });

  return {
    myActivities: myActivitiesQuery.data || [],
    myActivitiesLoading: myActivitiesQuery.isLoading,
    allActivities: allActivitiesQuery.data || [],
    allActivitiesLoading: allActivitiesQuery.isLoading,
    isAdmin,
    createActivity,
    completeAssignment,
    useActivityDetail,
  };
}
