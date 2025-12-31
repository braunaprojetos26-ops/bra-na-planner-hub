import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PendingUser {
  userId: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export function usePendingUsers() {
  const { role } = useAuth();

  return useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at')
        .eq('is_active', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(profile => ({
        userId: profile.user_id,
        fullName: profile.full_name,
        email: profile.email,
        createdAt: profile.created_at,
      })) as PendingUser[];
    },
    enabled: role === 'superadmin',
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      toast.success('Usuário aprovado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao aprovar usuário');
    },
  });
}

export function useRejectUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Delete from user_hierarchy first (foreign key constraint)
      await supabase
        .from('user_hierarchy')
        .delete()
        .eq('user_id', userId);

      // Delete from user_roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Delete from profiles
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Note: The auth.users record will remain but won't have access
      // A superadmin would need to delete from Supabase dashboard
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      toast.success('Usuário rejeitado');
    },
    onError: () => {
      toast.error('Erro ao rejeitar usuário');
    },
  });
}
