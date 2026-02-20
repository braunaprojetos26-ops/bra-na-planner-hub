import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveUser {
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  deactivated_at: string | null;
}

interface UseAllActiveUsersOptions {
  includeInactive?: boolean;
}

export function useAllActiveUsers(options?: UseAllActiveUsersOptions) {
  const includeInactive = options?.includeInactive ?? false;

  return useQuery({
    queryKey: ['all-active-users', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('user_id, full_name, email, is_active, deactivated_at')
        .order('full_name');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActiveUser[];
    },
  });
}
