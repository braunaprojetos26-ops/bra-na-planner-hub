import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CashFlowCategory {
  id: string;
  name: string;
  type: 'income' | 'fixed_expense' | 'variable_expense';
  is_active: boolean;
  order_position: number;
  budget_group: string;
}

export function useCashFlowCategories() {
  return useQuery({
    queryKey: ['cash-flow-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_flow_categories')
        .select('*')
        .eq('is_active', true)
        .order('order_position', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as CashFlowCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCashFlowCategoriesByType(type: string) {
  const { data: allCategories, ...rest } = useCashFlowCategories();
  
  const categories = (allCategories || []).filter(c => c.type === type);
  
  return { data: categories, ...rest };
}
