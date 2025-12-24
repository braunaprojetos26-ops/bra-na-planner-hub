import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Funnel, FunnelStage, LostReason } from '@/types/contacts';

// ============ FUNNELS ============

export function useFunnels() {
  return useQuery({
    queryKey: ['funnels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .eq('is_active', true)
        .order('order_position');

      if (error) throw error;
      return data as Funnel[];
    },
  });
}

// All funnels for admin (including inactive)
export function useAllFunnels() {
  return useQuery({
    queryKey: ['funnels', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .order('order_position');

      if (error) throw error;
      return data as Funnel[];
    },
  });
}

export function useCreateFunnel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      auto_create_next?: boolean;
      generates_contract?: boolean;
      contract_prompt_text?: string | null;
    }) => {
      // Get the highest order_position
      const { data: funnels } = await supabase
        .from('funnels')
        .select('order_position')
        .order('order_position', { ascending: false })
        .limit(1);

      const nextPosition = funnels && funnels.length > 0 ? funnels[0].order_position + 1 : 1;

      const { data: newFunnel, error } = await supabase
        .from('funnels')
        .insert({
          name: data.name,
          order_position: nextPosition,
          auto_create_next: data.auto_create_next ?? true,
          generates_contract: data.generates_contract ?? false,
          contract_prompt_text: data.contract_prompt_text,
        })
        .select()
        .single();

      if (error) throw error;
      return newFunnel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast({ title: 'Funil criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar funil',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateFunnel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      auto_create_next?: boolean;
      generates_contract?: boolean;
      contract_prompt_text?: string | null;
    }) => {
      const { error } = await supabase
        .from('funnels')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast({ title: 'Funil atualizado!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar funil',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useToggleFunnelActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('funnels')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast({ 
        title: variables.is_active ? 'Funil ativado!' : 'Funil desativado!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao alterar status do funil',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useReorderFunnels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update each funnel's order_position
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('funnels')
          .update({ order_position: index + 1 })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const hasError = results.some(r => r.error);
      if (hasError) throw new Error('Erro ao reordenar funis');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao reordenar funis',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============ FUNNEL STAGES ============

export function useFunnelStages(funnelId?: string) {
  return useQuery({
    queryKey: ['funnel-stages', funnelId],
    queryFn: async () => {
      let query = supabase
        .from('funnel_stages')
        .select('*')
        .order('order_position');

      if (funnelId) {
        query = query.eq('funnel_id', funnelId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FunnelStage[];
    },
  });
}

export function useCreateFunnelStage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      funnel_id: string;
      name: string;
      color?: string;
      sla_hours?: number | null;
    }) => {
      // Get the highest order_position for this funnel
      const { data: stages } = await supabase
        .from('funnel_stages')
        .select('order_position')
        .eq('funnel_id', data.funnel_id)
        .order('order_position', { ascending: false })
        .limit(1);

      const nextPosition = stages && stages.length > 0 ? stages[0].order_position + 1 : 1;

      const { data: newStage, error } = await supabase
        .from('funnel_stages')
        .insert({
          funnel_id: data.funnel_id,
          name: data.name,
          color: data.color ?? 'gray',
          sla_hours: data.sla_hours,
          order_position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return newStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-stages'] });
      toast({ title: 'Etapa criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar etapa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateFunnelStage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      color?: string;
      sla_hours?: number | null;
    }) => {
      const { error } = await supabase
        .from('funnel_stages')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-stages'] });
      toast({ title: 'Etapa atualizada!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar etapa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteFunnelStage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('funnel_stages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-stages'] });
      toast({ title: 'Etapa excluída!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir etapa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useReorderFunnelStages() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ funnelId, orderedIds }: { funnelId: string; orderedIds: string[] }) => {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('funnel_stages')
          .update({ order_position: index + 1 })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const hasError = results.some(r => r.error);
      if (hasError) throw new Error('Erro ao reordenar etapas');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-stages'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao reordenar etapas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Check if a stage has active opportunities
export function useStageOpportunitiesCount(stageId: string) {
  return useQuery({
    queryKey: ['stage-opportunities-count', stageId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('current_stage_id', stageId)
        .eq('status', 'active');

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!stageId,
  });
}

// ============ LOST REASONS ============

export function useLostReasons() {
  return useQuery({
    queryKey: ['lost-reasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lost_reasons')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as LostReason[];
    },
  });
}

export function useAllLostReasons() {
  return useQuery({
    queryKey: ['lost-reasons', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lost_reasons')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as LostReason[];
    },
  });
}

export function useCreateLostReason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('lost_reasons')
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-reasons'] });
      toast({ title: 'Motivo de perda criado!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar motivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateLostReason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name, is_active }: { id: string; name?: string; is_active?: boolean }) => {
      const updates: Partial<LostReason> = {};
      if (name !== undefined) updates.name = name;
      if (is_active !== undefined) updates.is_active = is_active;

      const { error } = await supabase
        .from('lost_reasons')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-reasons'] });
      toast({ title: 'Motivo atualizado!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar motivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============ UTILITY HOOKS ============

export function useNextFunnelFirstStage(currentFunnelId: string) {
  const { data: funnels } = useFunnels();
  const { data: allStages } = useFunnelStages();

  if (!funnels || !allStages) return { nextFunnel: null, firstStage: null };

  const currentFunnel = funnels.find(f => f.id === currentFunnelId);
  if (!currentFunnel) return { nextFunnel: null, firstStage: null };

  // If current funnel has auto_create_next = false, don't create next opportunity
  if (!currentFunnel.auto_create_next) return { nextFunnel: null, firstStage: null };

  const nextFunnel = funnels.find(f => f.order_position === currentFunnel.order_position + 1);
  if (!nextFunnel) return { nextFunnel: null, firstStage: null };

  const firstStage = allStages
    .filter(s => s.funnel_id === nextFunnel.id)
    .sort((a, b) => a.order_position - b.order_position)[0];

  return { nextFunnel, firstStage };
}
