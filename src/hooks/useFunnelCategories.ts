import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFunnelCategories(funnelId?: string) {
  return useQuery({
    queryKey: ['funnel-categories', funnelId],
    queryFn: async () => {
      if (!funnelId) return [];
      
      const { data, error } = await supabase
        .from('funnel_product_categories')
        .select('category_id')
        .eq('funnel_id', funnelId);

      if (error) throw error;
      return data.map(row => row.category_id);
    },
    enabled: !!funnelId,
  });
}
