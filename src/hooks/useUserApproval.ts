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
        .is('deactivated_at', null)
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
      const nowIso = new Date().toISOString();

      // Best-effort cleanup of related records
      await Promise.all([
        supabase
          .from('user_hierarchy')
          .delete()
          .eq('user_id', userId),
        supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId),
      ]);

      // Try hard delete first
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (!deleteError) return;

      // Fallback to soft reject when delete is blocked (RLS/FK)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: false, deactivated_at: nowIso })
        .eq('user_id', userId);

      if (updateError) throw updateError;
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
