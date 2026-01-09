import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveUser {
  user_id: string;
  full_name: string;
  email: string;
}

export function useAllActiveUsers() {
  return useQuery({
    queryKey: ['all-active-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data as ActiveUser[];
    },
  });
}
