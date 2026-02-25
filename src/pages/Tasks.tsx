import { useState, useMemo } from 'react';
import { startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { CheckSquare } from 'lucide-react';
import { TasksWeekSummary } from '@/components/tasks/TasksWeekSummary';
import { TasksFilters, PeriodFilter } from '@/components/tasks/TasksFilters';
import { TasksListPage } from '@/components/tasks/TasksListPage';
import { useAllUserTasks, TaskFilters } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamAnalytics';
import { TaskType, TaskStatus } from '@/types/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function getDateRange(period: PeriodFilter): { startDate?: Date; endDate?: Date } {
  const now = new Date();
  
  switch (period) {
    case 'this_week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case 'next_7_days':
      return {
        startDate: now,
        endDate: addDays(now, 7),
      };
    case 'this_month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
    case 'all':
    default:
      return {};
  }
}

export default function Tasks() {
  const [period, setPeriod] = useState<PeriodFilter>('this_week');
  const [taskType, setTaskType] = useState<TaskType | 'all'>('all');
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [assignedTo, setAssignedTo] = useState<string | 'all'>('all');

  const { data: teamMembers = [] } = useTeamMembers();

  const filters: TaskFilters = useMemo(() => {
    const dateRange = getDateRange(period);
    return {
      ...dateRange,
      taskType: taskType,
      status: status,
      assignedTo: assignedTo,
    };
  }, [period, taskType, status, assignedTo]);

  const { data: tasks = [], isLoading } = useAllUserTasks(filters);

  // Calculate week summary (always based on current week, regardless of filters)
  const weekRange = useMemo(() => ({
    startDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
    endDate: endOfWeek(new Date(), { weekStartsOn: 1 }),
  }), []);

  const { data: weekTasks = [] } = useAllUserTasks(weekRange);

  const weekSummary = useMemo(() => {
    return {
      total: weekTasks.length,
      pending: weekTasks.filter(t => t.status === 'pending').length,
      overdue: weekTasks.filter(t => t.status === 'overdue').length,
      completed: weekTasks.filter(t => t.status === 'completed').length,
    };
  }, [weekTasks]);

  const teamMemberOptions = useMemo(() => 
    teamMembers.map(m => ({ userId: m.userId, fullName: m.fullName })),
    [teamMembers]
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <CheckSquare className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas atividades</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Resumo da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <TasksWeekSummary {...weekSummary} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base font-medium">Lista de Tarefas</CardTitle>
            <TasksFilters
              period={period}
              onPeriodChange={setPeriod}
              taskType={taskType}
              onTaskTypeChange={setTaskType}
              status={status}
              onStatusChange={setStatus}
              assignedTo={assignedTo}
              onAssignedToChange={setAssignedTo}
              teamMembers={teamMemberOptions}
            />
          </div>
        </CardHeader>
        <CardContent>
          <TasksListPage tasks={tasks} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
