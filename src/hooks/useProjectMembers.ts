import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string | null;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  status: 'pending' | 'accepted';
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

export function useProjectMembers(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .order('invited_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for accepted members
      const userIds = data
        .filter(m => m.user_id)
        .map(m => m.user_id);

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        return data.map(member => ({
          ...member,
          role: member.role as 'viewer' | 'editor' | 'admin',
          status: member.status as 'pending' | 'accepted',
          profile: profiles?.find(p => p.user_id === member.user_id),
        })) as ProjectMember[];
      }

      return data.map(m => ({
        ...m,
        role: m.role as 'viewer' | 'editor' | 'admin',
        status: m.status as 'pending' | 'accepted',
      })) as ProjectMember[];
    },
    enabled: !!projectId,
  });

  const inviteMember = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'viewer' | 'editor' | 'admin' }) => {
      if (!projectId || !user?.id) throw new Error('Missing project or user');

      // Check if member already exists
      const { data: existing } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('email', email)
        .single();

      if (existing) {
        throw new Error('Este email já foi convidado para o projeto');
      }

      // Check if email belongs to an existing user
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .single();

      const { data, error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          email,
          role,
          user_id: profile?.user_id || null,
          status: profile?.user_id ? 'accepted' : 'pending',
          invited_by: user.id,
          accepted_at: profile?.user_id ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Convite enviado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao enviar convite');
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'viewer' | 'editor' | 'admin' }) => {
      const { error } = await supabase
        .from('project_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Permissão atualizada!');
    },
    onError: () => {
      toast.error('Erro ao atualizar permissão');
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Membro removido!');
    },
    onError: () => {
      toast.error('Erro ao remover membro');
    },
  });

  return {
    members,
    isLoading,
    inviteMember,
    updateMemberRole,
    removeMember,
  };
}

export function usePendingInvites() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: pendingInvites = [], isLoading } = useQuery({
    queryKey: ['pending-invites', user?.id],
    queryFn: async () => {
      if (!user?.email) return [];

      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          project:projects(id, title, icon)
        `)
        .eq('email', user.email)
        .eq('status', 'pending');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  const acceptInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('project_members')
        .update({
          status: 'accepted',
          user_id: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Convite aceito!');
    },
    onError: () => {
      toast.error('Erro ao aceitar convite');
    },
  });

  const declineInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      toast.success('Convite recusado');
    },
    onError: () => {
      toast.error('Erro ao recusar convite');
    },
  });

  return {
    pendingInvites,
    isLoading,
    acceptInvite,
    declineInvite,
  };
}
