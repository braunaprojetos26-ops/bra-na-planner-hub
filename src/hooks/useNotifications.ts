import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserTasks } from './useTasks';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  type: 'task_today' | 'task_overdue' | 'ticket_update' | 'contract_update' | 'payment' | 'health_score_drop' | 'birthday' | 'project_invite' | 'assignment';
  title: string;
  description: string;
  createdAt: Date;
  taskId?: string;
  opportunityId?: string;
  link?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: tasks, isLoading: tasksLoading } = useUserTasks();

  // Fetch all notifications from notifications table (tickets and contracts)
  const { data: dbNotifications = [], isLoading: dbLoading } = useQuery({
    queryKey: ['all-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['ticket_update', 'contract_update', 'payment', 'health_score_drop', 'birthday', 'project_invite', 'assignment'])
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const notifications = useMemo(() => {
    const notifs: Notification[] = [];

    // Tasks for today
    if (tasks) {
      const todayTasks = tasks.filter(
        (task) => task.status === 'pending' && isToday(new Date(task.scheduled_at))
      );

      todayTasks.forEach((task) => {
        notifs.push({
          id: `today-${task.id}`,
          type: 'task_today',
          title: 'Tarefa para hoje',
          description: task.title,
          createdAt: new Date(task.scheduled_at),
          taskId: task.id,
          opportunityId: task.opportunity_id || undefined,
        });
      });

      // Overdue tasks
      const overdueTasks = tasks.filter((task) => task.status === 'overdue');

      overdueTasks.forEach((task) => {
        const scheduledDate = format(new Date(task.scheduled_at), "dd 'de' MMM", { locale: ptBR });
        notifs.push({
          id: `overdue-${task.id}`,
          type: 'task_overdue',
          title: 'Tarefa atrasada',
          description: `${task.title} (${scheduledDate})`,
          createdAt: new Date(task.scheduled_at),
          taskId: task.id,
          opportunityId: task.opportunity_id || undefined,
        });
      });
    }

    // DB notifications (tickets, contracts, health score, birthday, project invites, assignments)
    dbNotifications.forEach((notif) => {
      const notifType = notif.type as 'ticket_update' | 'contract_update' | 'payment' | 'health_score_drop' | 'birthday' | 'project_invite' | 'assignment';
      notifs.push({
        id: `db-${notif.id}`,
        type: notifType,
        title: notif.title,
        description: notif.message,
        createdAt: new Date(notif.created_at),
        link: notif.link || undefined,
      });
    });

    // Sort by date (most recent first for today, oldest first for overdue)
    return notifs.sort((a, b) => {
      if (a.type === 'task_overdue' && b.type === 'task_overdue') {
        return a.createdAt.getTime() - b.createdAt.getTime(); // Oldest first
      }
      return b.createdAt.getTime() - a.createdAt.getTime(); // Most recent first
    });
  }, [tasks, dbNotifications]);

  const todayCount = notifications.filter((n) => n.type === 'task_today').length;
  const overdueCount = notifications.filter((n) => n.type === 'task_overdue').length;
  const ticketCount = notifications.filter((n) => n.type === 'ticket_update').length;
  const contractCount = notifications.filter((n) => n.type === 'contract_update').length;
  const paymentCount = notifications.filter((n) => n.type === 'payment').length;
  const healthScoreDropCount = notifications.filter((n) => n.type === 'health_score_drop').length;
  const birthdayCount = notifications.filter((n) => n.type === 'birthday').length;
  const projectInviteCount = notifications.filter((n) => n.type === 'project_invite').length;
  
  // dbUnreadCount = only database notifications (tickets + contracts + payments + birthday + project invites) that can be marked as read
  const dbUnreadCount = dbNotifications.length;

  return {
    notifications,
    todayCount,
    overdueCount,
    ticketCount,
    contractCount,
    paymentCount,
    healthScoreDropCount,
    birthdayCount,
    projectInviteCount,
    dbUnreadCount,
    totalCount: notifications.length,
    isLoading: tasksLoading || dbLoading,
  };
}

export function useMarkNotificationRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return async (notificationId: string) => {
    if (!user) return;
    
    // Extract actual notification ID from our prefixed ID
    const actualId = notificationId.replace('db-', '').replace('ticket-', '');
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', actualId);
    
    // Invalidate to refresh the list
    queryClient.invalidateQueries({ queryKey: ['all-notifications', user.id] });
  };
}
