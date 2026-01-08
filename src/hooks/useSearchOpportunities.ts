import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Opportunity } from '@/types/opportunities';

export function useSearchOpportunities(searchTerm: string) {
  return useQuery({
    queryKey: ['opportunities-search', searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          id,
          contact_id,
          current_funnel_id,
          current_stage_id,
          status,
          proposal_value,
          contact:contacts!inner(
            id,
            full_name,
            phone,
            email
          ),
          current_stage:funnel_stages!opportunities_current_stage_id_fkey(
            id,
            name,
            color
          ),
          current_funnel:funnels!opportunities_current_funnel_id_fkey(
            id,
            name
          )
        `)
        .eq('status', 'active')
        .ilike('contacts.full_name', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data as unknown as Opportunity[];
    },
    enabled: searchTerm.length >= 2,
  });
}
