import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type GoalType = 'sonho_grande' | 'objetivo_curto_prazo' | 'objetivo_longo_prazo';
export type GoalStatus = 'active' | 'achieved' | 'cancelled';

export interface PlannerGoal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  goalType: GoalType;
  targetDate: string | null;
  status: GoalStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function usePlannerGoals(userId: string) {
  return useQuery({
    queryKey: ['planner-goals', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(goal => ({
        id: goal.id,
        userId: goal.user_id,
        title: goal.title,
        description: goal.description,
        goalType: goal.goal_type as GoalType,
        targetDate: goal.target_date,
        status: goal.status as GoalStatus,
        createdBy: goal.created_by,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at,
      })) as PlannerGoal[];
    },
    enabled: !!userId,
  });
}

export function useCreatePlannerGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      title: string;
      description?: string;
      goalType: GoalType;
      targetDate?: string;
    }) => {
      const { error } = await supabase
        .from('planner_goals')
        .insert({
          user_id: data.userId,
          title: data.title,
          description: data.description || null,
          goal_type: data.goalType,
          target_date: data.targetDate || null,
          created_by: user!.id,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['planner-goals', variables.userId] });
      toast.success('Objetivo criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar objetivo');
    },
  });
}

export function useUpdatePlannerGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      userId: string;
      title?: string;
      description?: string;
      goalType?: GoalType;
      targetDate?: string | null;
      status?: GoalStatus;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.goalType !== undefined) updateData.goal_type = data.goalType;
      if (data.targetDate !== undefined) updateData.target_date = data.targetDate;
      if (data.status !== undefined) updateData.status = data.status;

      const { error } = await supabase
        .from('planner_goals')
        .update(updateData)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['planner-goals', variables.userId] });
      toast.success('Objetivo atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar objetivo');
    },
  });
}

export function useDeletePlannerGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('planner_goals')
        .delete()
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['planner-goals', variables.userId] });
      toast.success('Objetivo removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover objetivo');
    },
  });
}
