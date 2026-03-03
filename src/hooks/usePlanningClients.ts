import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlanningClient {
  contact_id: string;
  full_name: string;
  plan_id: string;
  plan_status: string;
}

export function usePlanningClients() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['planning-clients', user?.id],
    queryFn: async (): Promise<PlanningClient[]> => {
      // Fetch active client plans with their contact info
      const { data, error } = await supabase
        .from('client_plans')
        .select(`
          id,
          status,
          contact_id,
          contacts!client_plans_contact_id_fkey (
            id,
            full_name
          )
        `)
        .eq('status', 'active');

      if (error) throw error;

      return (data || [])
        .filter((plan: any) => plan.contacts)
        .map((plan: any) => ({
          contact_id: plan.contact_id,
          full_name: plan.contacts.full_name,
          plan_id: plan.id,
          plan_status: plan.status,
        }));
    },
    enabled: !!user,
  });
}
