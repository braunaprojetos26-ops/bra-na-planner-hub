import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskFormData, TaskStatus, TaskType } from '@/types/tasks';
import { useActingUser } from '@/contexts/ActingUserContext';
import { toast } from 'sonner';

export function useTasks(opportunityId?: string) {
  const { actingUser } = useActingUser();
  const queryClient = useQueryClient();
  const targetUserId = actingUser?.id;

  const tasksQuery = useQuery({
    queryKey: ['tasks', opportunityId, targetUserId],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          opportunity:opportunities(
            id,
            contact:contacts(id, full_name),
            current_funnel:funnels!opportunities_current_funnel_id_fkey(id, name)
          )
        `)
        .order('scheduled_at', { ascending: true });

      if (opportunityId) {
        query = query.eq('opportunity_id', opportunityId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Check and update overdue status
      const now = new Date();
      const tasks = (data || []).map(task => {
        if (task.status === 'pending' && new Date(task.scheduled_at) < now) {
          return { ...task, status: 'overdue' as TaskStatus };
        }
        return task;
      }) as unknown as Task[];

      // Filter by target user if impersonating
      if (targetUserId) {
        return tasks.filter(t => t.created_by === targetUserId);
      }

      return tasks;
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (formData: TaskFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...formData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Erro ao criar tarefa');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Erro ao atualizar tarefa');
    },
  });

  const completeTaskMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa concluída!');
    },
    onError: (error) => {
      console.error('Error completing task:', error);
      toast.error('Erro ao concluir tarefa');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa excluída!');
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Erro ao excluir tarefa');
    },
  });

  return {
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    completeTask: completeTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
  };
}

export function useUserTasks() {
  const { actingUser } = useActingUser();
  const targetUserId = actingUser?.id;

  return useQuery({
    queryKey: ['user-tasks', targetUserId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const userId = targetUserId || user.id;

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          opportunity:opportunities(
            id,
            contact:contacts(id, full_name),
            current_funnel:funnels!opportunities_current_funnel_id_fkey(id, name)
          )
        `)
        .eq('created_by', userId)
        .in('status', ['pending', 'overdue'])
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      // Update overdue status
      const now = new Date();
      return (data || []).map(task => {
        if (task.status === 'pending' && new Date(task.scheduled_at) < now) {
          return { ...task, status: 'overdue' as TaskStatus };
        }
        return task;
      }) as unknown as Task[];
    },
  });
}

export interface TaskFilters {
  startDate?: Date;
  endDate?: Date;
  taskType?: TaskType | 'all';
  status?: TaskStatus | 'all';
}

export function useAllUserTasks(filters?: TaskFilters) {
  const { actingUser } = useActingUser();
  const targetUserId = actingUser?.id;

  return useQuery({
    queryKey: ['all-user-tasks', targetUserId, filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const userId = targetUserId || user.id;

      let query = supabase
        .from('tasks')
        .select(`
          *,
          opportunity:opportunities(
            id,
            contact:contacts(id, full_name),
            current_funnel:funnels!opportunities_current_funnel_id_fkey(id, name)
          )
        `)
        .eq('created_by', userId)
        .order('scheduled_at', { ascending: true });

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
  });
}
