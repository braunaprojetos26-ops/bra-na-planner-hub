import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Funnel, FunnelStage, LostReason } from '@/types/contacts';

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
        variant: 'destructive' 
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
        variant: 'destructive' 
      });
    },
  });
}

export function useNextFunnelFirstStage(currentFunnelId: string) {
  const { data: funnels } = useFunnels();
  const { data: allStages } = useFunnelStages();

  if (!funnels || !allStages) return { nextFunnel: null, firstStage: null };

  const currentFunnel = funnels.find(f => f.id === currentFunnelId);
  if (!currentFunnel) return { nextFunnel: null, firstStage: null };

  const nextFunnel = funnels.find(f => f.order_position === currentFunnel.order_position + 1);
  if (!nextFunnel) return { nextFunnel: null, firstStage: null };

  const firstStage = allStages
    .filter(s => s.funnel_id === nextFunnel.id)
    .sort((a, b) => a.order_position - b.order_position)[0];

  return { nextFunnel, firstStage };
}
