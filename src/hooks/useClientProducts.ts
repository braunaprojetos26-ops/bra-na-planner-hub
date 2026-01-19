import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientProduct {
  id: string;
  productName: string;
  categoryName: string;
  contractValue: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

export function useClientProducts(contactId: string | undefined) {
  return useQuery({
    queryKey: ['client-products', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_value,
          status,
          start_date,
          end_date,
          product:products(
            id,
            name,
            category:product_categories(id, name)
          )
        `)
        .eq('contact_id', contactId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const products: ClientProduct[] = (contracts || []).map(contract => ({
        id: contract.id,
        productName: (contract.product as any)?.name || 'Produto',
        categoryName: (contract.product as any)?.category?.name || '',
        contractValue: Number(contract.contract_value) || 0,
        status: contract.status,
        startDate: contract.start_date,
        endDate: contract.end_date,
      }));

      return products;
    },
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
