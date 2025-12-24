import { useMemo } from 'react';
import { useUserTasks } from './useTasks';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Notification {
  id: string;
  type: 'task_today' | 'task_overdue';
  title: string;
  description: string;
  createdAt: Date;
  taskId?: string;
  opportunityId?: string;
}

export function useNotifications() {
  const { data: tasks, isLoading } = useUserTasks();

  const notifications = useMemo(() => {
    if (!tasks) return [];

    const notifs: Notification[] = [];

    // Tasks for today
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

    // Sort by date (most recent first for today, oldest first for overdue)
    return notifs.sort((a, b) => {
      if (a.type === 'task_overdue' && b.type === 'task_overdue') {
        return a.createdAt.getTime() - b.createdAt.getTime(); // Oldest first
      }
      return b.createdAt.getTime() - a.createdAt.getTime(); // Most recent first
    });
  }, [tasks]);

  const todayCount = notifications.filter((n) => n.type === 'task_today').length;
  const overdueCount = notifications.filter((n) => n.type === 'task_overdue').length;

  return {
    notifications,
    todayCount,
    overdueCount,
    totalCount: notifications.length,
    isLoading,
  };
}
