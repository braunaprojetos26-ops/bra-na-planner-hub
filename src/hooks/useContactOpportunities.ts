import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ContactOpportunity {
  id: string;
  status: 'active' | 'won' | 'lost';
  created_at: string;
  current_funnel?: {
    id: string;
    name: string;
  };
  current_stage?: {
    id: string;
    name: string;
    color: string;
  };
}

export function useContactOpportunities(contactId: string) {
  return useQuery({
    queryKey: ['contact-opportunities', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          id,
          status,
          created_at,
          current_funnel:funnels!opportunities_current_funnel_id_fkey(id, name),
          current_stage:funnel_stages!opportunities_current_stage_id_fkey(id, name, color)
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContactOpportunity[];
    },
    enabled: !!contactId,
  });
}
