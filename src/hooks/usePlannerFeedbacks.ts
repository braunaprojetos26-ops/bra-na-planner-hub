import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PlannerFeedback {
  id: string;
  planner_id: string;
  client_name: string;
  feedback_text: string | null;
  media_type: 'image' | 'video' | null;
  media_url: string | null;
  is_active: boolean;
  order_position: number;
  created_at: string;
  updated_at: string;
}

export interface PlannerFeedbackInsert {
  client_name: string;
  feedback_text?: string;
  media_type?: 'image' | 'video';
  media_url?: string;
  order_position?: number;
}

export function useMyFeedbacks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['planner-feedbacks', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('planner_feedbacks')
        .select('*')
        .eq('planner_id', user.id)
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      return data as PlannerFeedback[];
    },
    enabled: !!user,
  });
}

export function usePlannerFeedbacks(plannerId: string | undefined) {
  return useQuery({
    queryKey: ['planner-feedbacks', plannerId],
    queryFn: async () => {
      if (!plannerId) return [];

      const { data, error } = await supabase
        .from('planner_feedbacks')
        .select('*')
        .eq('planner_id', plannerId)
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      return data as PlannerFeedback[];
    },
    enabled: !!plannerId,
  });
}

export function useFeedbackMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const createFeedback = useMutation({
    mutationFn: async (data: PlannerFeedbackInsert) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data: feedback, error } = await supabase
        .from('planner_feedbacks')
        .insert({
          ...data,
          planner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return feedback as PlannerFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-feedbacks'] });
      toast({
        title: 'Feedback adicionado',
        description: 'O feedback foi salvo com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateFeedback = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PlannerFeedbackInsert> & { id: string }) => {
      const { data: feedback, error } = await supabase
        .from('planner_feedbacks')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return feedback as PlannerFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-feedbacks'] });
      toast({
        title: 'Feedback atualizado',
        description: 'O feedback foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteFeedback = useMutation({
    mutationFn: async (feedbackId: string) => {
      const { error } = await supabase
        .from('planner_feedbacks')
        .update({ is_active: false })
        .eq('id', feedbackId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-feedbacks'] });
      toast({
        title: 'Feedback removido',
        description: 'O feedback foi removido com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const reorderFeedbacks = useMutation({
    mutationFn: async (feedbacks: { id: string; order_position: number }[]) => {
      const updates = feedbacks.map(({ id, order_position }) =>
        supabase
          .from('planner_feedbacks')
          .update({ order_position })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-feedbacks'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao reordenar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    createFeedback,
    updateFeedback,
    deleteFeedback,
    reorderFeedbacks,
  };
}
