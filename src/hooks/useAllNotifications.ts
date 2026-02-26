import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActingUser } from '@/contexts/ActingUserContext';

export interface NotificationRecord {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function useAllNotifications() {
  const { user } = useAuth();
  const { actingUser } = useActingUser();

  const effectiveUserId = actingUser?.id || user?.id;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['all-notifications-history', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as NotificationRecord[];
    },
    enabled: !!effectiveUserId,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
  };
}

export function useMarkNotificationRead() {
  const { user } = useAuth();
  const { actingUser } = useActingUser();
  const queryClient = useQueryClient();
  const effectiveUserId = actingUser?.id || user?.id;

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!effectiveUserId) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications-history', effectiveUserId] });
      queryClient.invalidateQueries({ queryKey: ['all-notifications', effectiveUserId] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const { actingUser } = useActingUser();
  const queryClient = useQueryClient();
  const effectiveUserId = actingUser?.id || user?.id;

  return useMutation({
    mutationFn: async () => {
      if (!effectiveUserId) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', effectiveUserId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications-history', effectiveUserId] });
      queryClient.invalidateQueries({ queryKey: ['all-notifications', effectiveUserId] });
    },
  });
}
