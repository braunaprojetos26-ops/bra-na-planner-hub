import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PlannerCase {
  id: string;
  planner_id: string;
  title: string;
  description: string | null;
  initial_value: number | null;
  final_value: number | null;
  advantage: number | null;
  is_active: boolean;
  order_position: number;
  created_at: string;
  updated_at: string;
}

export interface PlannerCaseInsert {
  title: string;
  description?: string;
  initial_value?: number;
  final_value?: number;
  advantage?: number;
  order_position?: number;
}

export function useMyCases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['planner-cases', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('planner_cases')
        .select('*')
        .eq('planner_id', user.id)
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      return data as PlannerCase[];
    },
    enabled: !!user,
  });
}

export function usePlannerCases(plannerId: string | undefined) {
  return useQuery({
    queryKey: ['planner-cases', plannerId],
    queryFn: async () => {
      if (!plannerId) return [];

      const { data, error } = await supabase
        .from('planner_cases')
        .select('*')
        .eq('planner_id', plannerId)
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      return data as PlannerCase[];
    },
    enabled: !!plannerId,
  });
}

export function useCaseMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const createCase = useMutation({
    mutationFn: async (data: PlannerCaseInsert) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data: caseData, error } = await supabase
        .from('planner_cases')
        .insert({
          ...data,
          planner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return caseData as PlannerCase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-cases'] });
      toast({
        title: 'Case adicionado',
        description: 'O case foi salvo com sucesso.',
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

  const updateCase = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PlannerCaseInsert> & { id: string }) => {
      const { data: caseData, error } = await supabase
        .from('planner_cases')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return caseData as PlannerCase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-cases'] });
      toast({
        title: 'Case atualizado',
        description: 'O case foi atualizado com sucesso.',
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

  const deleteCase = useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase
        .from('planner_cases')
        .update({ is_active: false })
        .eq('id', caseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-cases'] });
      toast({
        title: 'Case removido',
        description: 'O case foi removido com sucesso.',
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

  const reorderCases = useMutation({
    mutationFn: async (cases: { id: string; order_position: number }[]) => {
      const updates = cases.map(({ id, order_position }) =>
        supabase
          .from('planner_cases')
          .update({ order_position })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-cases'] });
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
    createCase,
    updateCase,
    deleteCase,
    reorderCases,
  };
}
