import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ContactOption {
  id: string;
  full_name: string;
  phone: string;
}

export function useOwnerContacts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['owner-contacts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, phone')
        .eq('owner_id', user?.id)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as ContactOption[];
    },
    enabled: !!user,
  });
}
