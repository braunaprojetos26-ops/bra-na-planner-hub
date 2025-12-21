import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FunnelSuggestedProduct, ProductCustomField } from '@/types/contracts';

export function useFunnelSuggestedProducts(funnelId?: string) {
  return useQuery({
    queryKey: ['funnel-suggested-products', funnelId],
    queryFn: async () => {
      if (!funnelId) return [];

      const { data, error } = await supabase
        .from('funnel_suggested_products')
        .select(`
          *,
          product:products(
            *,
            category:product_categories(*)
          )
        `)
        .eq('funnel_id', funnelId)
        .order('order_position');

      if (error) throw error;
      return data.map((fp) => ({
        ...fp,
        product: fp.product ? {
          ...fp.product,
          custom_fields: (fp.product.custom_fields || []) as unknown as ProductCustomField[],
        } : undefined,
      })) as FunnelSuggestedProduct[];
    },
    enabled: !!funnelId,
  });
}

export function useSetFunnelSuggestedProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      funnelId,
      productIds,
    }: {
      funnelId: string;
      productIds: string[];
    }) => {
      // Delete existing suggested products
      await supabase
        .from('funnel_suggested_products')
        .delete()
        .eq('funnel_id', funnelId);

      if (productIds.length === 0) return;

      // Insert new suggested products
      const { error } = await supabase
        .from('funnel_suggested_products')
        .insert(
          productIds.map((productId, index) => ({
            funnel_id: funnelId,
            product_id: productId,
            order_position: index,
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-suggested-products'] });
      toast({ title: 'Produtos sugeridos atualizados!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar produtos sugeridos', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateFunnelContractSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      funnelId,
      generates_contract,
      contract_prompt_text,
    }: {
      funnelId: string;
      generates_contract: boolean;
      contract_prompt_text?: string;
    }) => {
      const { error } = await supabase
        .from('funnels')
        .update({
          generates_contract,
          contract_prompt_text,
        })
        .eq('id', funnelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast({ title: 'Configuração do funil atualizada!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar funil', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}
