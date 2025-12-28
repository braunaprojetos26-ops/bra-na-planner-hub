import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamMember {
  userId: string;
  fullName: string;
  email: string;
  position: string | null;
  role: string;
  isActive: boolean;
}

export function useTeamManagement() {
  const { user, role } = useAuth();
  
  const canManageTeam = ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role || '');

  return useQuery({
    queryKey: ['team-management', user?.id],
    queryFn: async () => {
      // Get accessible user IDs for this leader
      const { data: accessibleIds, error: accessError } = await supabase
        .rpc('get_accessible_user_ids', { _accessor_id: user!.id });
      
      if (accessError) throw accessError;
      
      // Filter out the current user (leader) from the list
      const subordinateIds = (accessibleIds as string[]).filter(id => id !== user!.id);
      
      if (subordinateIds.length === 0) {
        return [];
      }
      
      // Get profiles for subordinates
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, position, is_active')
        .in('user_id', subordinateIds)
        .eq('is_active', true)
        .order('full_name');
      
      if (profilesError) throw profilesError;
      
      // Get roles for subordinates
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', subordinateIds);
      
      if (rolesError) throw rolesError;
      
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      return (profiles || []).map(profile => ({
        userId: profile.user_id,
        fullName: profile.full_name,
        email: profile.email,
        position: profile.position,
        role: rolesMap.get(profile.user_id) || 'planejador',
        isActive: profile.is_active,
      })) as TeamMember[];
    },
    enabled: !!user && canManageTeam,
  });
}

export function useCanManageTeam() {
  const { role } = useAuth();
  return ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role || '');
}
