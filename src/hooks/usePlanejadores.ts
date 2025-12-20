import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePlanejadores() {
  const { user, role } = useAuth();
  
  // Apenas roles administrativas podem ver todos os planejadores
  const canViewAll = ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role || '');

  return useQuery({
    queryKey: ['planejadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: !!user && canViewAll,
  });
}

export function useCanViewPlanejadores() {
  const { role } = useAuth();
  return ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role || '');
}
