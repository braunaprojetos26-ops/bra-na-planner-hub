import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus, TaskType, TeamTaskFormData } from '@/types/tasks';
import { toast } from 'sonner';

export interface TeamTaskFilters {
  startDate?: Date;
  endDate?: Date;
  memberId?: string;
  taskType?: TaskType | 'all';
  status?: TaskStatus | 'all';
}

export interface TeamTaskStats {
  total: number;
  pending: number;
  overdue: number;
  completed: number;
}

export function useTeamTasks(teamMemberIds: string[], filters?: TeamTaskFilters) {
  return useQuery({
    queryKey: ['team-tasks', teamMemberIds, filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || teamMemberIds.length === 0) return [];

      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name),
          created_by_profile:profiles!tasks_created_by_fkey(full_name)
        `)
        .eq('created_by', user.id)
        .in('assigned_to', teamMemberIds)
        .order('scheduled_at', { ascending: true });

      // Apply member filter
      if (filters?.memberId && filters.memberId !== 'all') {
        query = query.eq('assigned_to', filters.memberId);
      }

      // Apply date filters
      if (filters?.startDate) {
        query = query.gte('scheduled_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('scheduled_at', filters.endDate.toISOString());
      }

      // Apply task type filter
      if (filters?.taskType && filters.taskType !== 'all') {
        query = query.eq('task_type', filters.taskType);
      }

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Update overdue status for pending tasks
      const now = new Date();
      return (data || []).map(task => {
        if (task.status === 'pending' && new Date(task.scheduled_at) < now) {
          return { ...task, status: 'overdue' as TaskStatus };
        }
        return task;
      }) as unknown as Task[];
    },
    enabled: teamMemberIds.length > 0,
  });
}

export function useTeamTaskStats(teamMemberIds: string[]) {
  return useQuery({
    queryKey: ['team-task-stats', teamMemberIds],
    queryFn: async (): Promise<TeamTaskStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || teamMemberIds.length === 0) {
        return { total: 0, pending: 0, overdue: 0, completed: 0 };
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('id, status, scheduled_at')
        .eq('created_by', user.id)
        .in('assigned_to', teamMemberIds);

      if (error) throw error;

      const now = new Date();
      const tasks = (data || []).map(task => {
        if (task.status === 'pending' && new Date(task.scheduled_at) < now) {
          return { ...task, status: 'overdue' as TaskStatus };
        }
        return task;
      });

      return {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        overdue: tasks.filter(t => t.status === 'overdue').length,
        completed: tasks.filter(t => t.status === 'completed').length,
      };
    },
    enabled: teamMemberIds.length > 0,
  });
}

export function useCreateTeamTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: TeamTaskFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: formData.title,
          description: formData.description || null,
          task_type: formData.task_type,
          scheduled_at: formData.scheduled_at,
          assigned_to: formData.assigned_to,
          created_by: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['team-task-stats'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-tasks'] });
      toast.success('Tarefa criada para o membro da equipe!');
    },
    onError: (error) => {
      console.error('Error creating team task:', error);
      toast.error('Erro ao criar tarefa');
    },
  });
}

export function useCompleteTeamTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['team-task-stats'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-tasks'] });
      toast.success('Tarefa concluída!');
    },
    onError: (error) => {
      console.error('Error completing task:', error);
      toast.error('Erro ao concluir tarefa');
    },
  });
}

export function useDeleteTeamTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['team-task-stats'] });
      toast.success('Tarefa excluída!');
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Erro ao excluir tarefa');
    },
  });
}
