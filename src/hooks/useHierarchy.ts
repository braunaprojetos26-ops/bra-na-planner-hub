import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserPosition } from '@/lib/positionLabels';

export interface HierarchyUser {
  user_id: string;
  full_name: string;
  email: string;
  position: UserPosition | null;
  manager_user_id: string | null;
  is_active: boolean;
  children: HierarchyUser[];
}

export function useHierarchy() {
  const { user, role } = useAuth();
  
  const canViewStructure = ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role || '');

  return useQuery({
    queryKey: ['hierarchy'],
    queryFn: async () => {
      // Buscar todos os profiles com suas hierarquias
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, position, is_active')
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Buscar hierarquias
      const { data: hierarchies, error: hierarchyError } = await supabase
        .from('user_hierarchy')
        .select('user_id, manager_user_id');

      if (hierarchyError) throw hierarchyError;

      // Criar mapa de manager_user_id por user_id
      const hierarchyMap = new Map(
        hierarchies?.map(h => [h.user_id, h.manager_user_id]) || []
      );

      // Combinar dados
      const users: HierarchyUser[] = (profiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        position: p.position as UserPosition | null,
        manager_user_id: hierarchyMap.get(p.user_id) || null,
        is_active: p.is_active,
        children: [],
      }));

      // Construir árvore
      const userMap = new Map(users.map(u => [u.user_id, u]));
      const roots: HierarchyUser[] = [];

      users.forEach(u => {
        if (u.manager_user_id && userMap.has(u.manager_user_id)) {
          const manager = userMap.get(u.manager_user_id)!;
          manager.children.push(u);
        } else {
          roots.push(u);
        }
      });

      // Ordenar children por nome
      const sortChildren = (node: HierarchyUser) => {
        node.children.sort((a, b) => a.full_name.localeCompare(b.full_name));
        node.children.forEach(sortChildren);
      };
      roots.forEach(sortChildren);

      return roots;
    },
    enabled: !!user && canViewStructure,
  });
}

export function useUpdateUserPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, position }: { userId: string; position: UserPosition | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ position })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['planejadores'] });
    },
  });
}

export function useUpdateUserManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, managerId }: { userId: string; managerId: string | null }) => {
      const { error } = await supabase
        .from('user_hierarchy')
        .update({ manager_user_id: managerId })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
    },
  });
}

export function useCanManageStructure() {
  const { role } = useAuth();
  return role === 'superadmin';
}
