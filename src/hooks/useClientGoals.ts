import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientGoal {
  index: number;
  goal_type: string;
  name: string;
  target_value_brl: number;
  target_date: string;
  priority: number;
  how: string;
}

export interface GoalMilestone {
  id: string;
  contact_id: string;
  goal_index: number;
  goal_name: string;
  title: string;
  target_value: number | null;
  target_date: string;
  status: string;
  completed_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useClientGoals(contactId: string | undefined) {
  return useQuery({
    queryKey: ['client-goals', contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_data_collections')
        .select('data_collection')
        .eq('contact_id', contactId!)
        .maybeSingle();

      if (error) throw error;
      if (!data?.data_collection) return [];

      const dc = data.data_collection as Record<string, unknown>;
      const goalsList = (dc as any)?.objectives?.goals_list;
      if (!Array.isArray(goalsList)) return [];

      return goalsList.map((g: any, i: number) => ({
        index: i,
        goal_type: g.goal_type || '',
        name: g.name || '',
        target_value_brl: parseFloat(g.target_value_brl) || 0,
        target_date: g.target_date || '',
        priority: parseInt(g.priority) || 0,
        how: g.how || '',
      })) as ClientGoal[];
    },
  });
}

export function useGoalMilestones(contactId: string | undefined) {
  return useQuery({
    queryKey: ['goal-milestones', contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_milestones')
        .select('*')
        .eq('contact_id', contactId!)
        .order('target_date', { ascending: true });

      if (error) throw error;
      return (data || []) as GoalMilestone[];
    },
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (milestone: {
      contact_id: string;
      goal_index: number;
      goal_name: string;
      title: string;
      target_value: number | null;
      target_date: string;
      notes: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('goal_milestones')
        .insert({ ...milestone, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['goal-milestones', vars.contact_id] });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId, ...updates }: {
      id: string;
      contactId: string;
      status?: string;
      completed_at?: string | null;
      title?: string;
      target_value?: number | null;
      target_date?: string;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('goal_milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['goal-milestones', vars.contactId] });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from('goal_milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['goal-milestones', vars.contactId] });
    },
  });
}
