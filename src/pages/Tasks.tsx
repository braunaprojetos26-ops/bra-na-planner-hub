import { useState, useMemo, useEffect } from 'react';
import { startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { CheckSquare, List, CalendarDays, Star } from 'lucide-react';
import { TasksWeekSummary } from '@/components/tasks/TasksWeekSummary';
import { TasksFilters, PeriodFilter } from '@/components/tasks/TasksFilters';
import { TasksListPage } from '@/components/tasks/TasksListPage';
import { TasksCalendarView } from '@/components/tasks/TasksCalendarView';
import { useAllUserTasks, TaskFilters } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamAnalytics';
import { TaskType, TaskStatus } from '@/types/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

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

type ViewMode = 'list' | 'calendar';

const STORAGE_KEY = 'tasks-default-view';

function getDefaultView(): ViewMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'list' || saved === 'calendar') return saved;
  } catch {}
  return 'list';
}

export default function Tasks() {
  const [viewMode, setViewMode] = useState<ViewMode>(getDefaultView);
  const [period, setPeriod] = useState<PeriodFilter>('this_week');
  const [taskType, setTaskType] = useState<TaskType | 'all'>('all');
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [assignedTo, setAssignedTo] = useState<string | 'all'>('all');

  const defaultView = getDefaultView();

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

  const calendarFilters: TaskFilters = useMemo(() => ({
    taskType: taskType !== 'all' ? taskType : undefined,
    status: status !== 'all' ? status : undefined,
    assignedTo: assignedTo !== 'all' ? assignedTo : undefined,
  }), [taskType, status, assignedTo]);
  const { data: calendarTasks = [], isLoading: calendarLoading } = useAllUserTasks(
    viewMode === 'calendar' ? calendarFilters : undefined
  );

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

  const setAsDefault = (mode: ViewMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    toast.success(`Visualização "${mode === 'list' ? 'Lista' : 'Calendário'}" definida como padrão`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tarefas</h1>
            <p className="text-muted-foreground text-sm">Gerencie suas atividades</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-1" />
              Lista
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Calendário
            </Button>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setAsDefault(viewMode)}
                >
                  <Star className={`h-4 w-4 ${defaultView === viewMode ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Definir "{viewMode === 'list' ? 'Lista' : 'Calendário'}" como padrão</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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

      {viewMode === 'list' ? (
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
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-base font-medium">Calendário de Tarefas</CardTitle>
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
            <TasksCalendarView tasks={calendarTasks} isLoading={calendarLoading} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
