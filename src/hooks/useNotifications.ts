import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserTasks } from './useTasks';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  type: 'task_today' | 'task_overdue' | 'ticket_update';
  title: string;
  description: string;
  createdAt: Date;
  taskId?: string;
  opportunityId?: string;
  link?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const { data: tasks, isLoading: tasksLoading } = useUserTasks();

  // Fetch ticket notifications from notifications table
  const { data: ticketNotifications = [], isLoading: ticketLoading } = useQuery({
    queryKey: ['ticket-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'ticket_update')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

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

    // Ticket notifications
    ticketNotifications.forEach((notif) => {
      notifs.push({
        id: `ticket-${notif.id}`,
        type: 'ticket_update',
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
  }, [tasks, ticketNotifications]);

  const todayCount = notifications.filter((n) => n.type === 'task_today').length;
  const overdueCount = notifications.filter((n) => n.type === 'task_overdue').length;
  const ticketCount = notifications.filter((n) => n.type === 'ticket_update').length;

  return {
    notifications,
    todayCount,
    overdueCount,
    ticketCount,
    totalCount: notifications.length,
    isLoading: tasksLoading || ticketLoading,
  };
}

export function useMarkNotificationRead() {
  const { user } = useAuth();

  return async (notificationId: string) => {
    if (!user) return;
    
    // Extract actual notification ID from our prefixed ID
    const actualId = notificationId.replace('ticket-', '');
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', actualId);
  };
}
