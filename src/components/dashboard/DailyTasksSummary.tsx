import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, ListChecks, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAllUserTasks } from '@/hooks/useTasks';
import { useTasks } from '@/hooks/useTasks';
import { useActingUser } from '@/contexts/ActingUserContext';
import { Task, TaskType, TASK_TYPE_LABELS } from '@/types/tasks';
import { cn } from '@/lib/utils';

const COLLAPSED_KEY = 'dashboard-tasks-collapsed';

export function DailyTasksSummary() {
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem(COLLAPSED_KEY) !== 'true';
  });

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const { data: allTasks, isLoading } = useAllUserTasks({
    startDate: startOfDay,
    endDate: endOfDay,
  });

  // Also get overdue from before today
  const { data: overdueTasks } = useAllUserTasks({
    endDate: startOfDay,
    status: 'overdue',
  });

  const { completeTask } = useTasks();
  const { actingUser } = useActingUser();
  const currentUserId = actingUser?.id;

  const todayTasks = allTasks || [];
  const overdueFromPast = (overdueTasks || []).filter(t => t.status === 'overdue');

  const stats = useMemo(() => {
    const all = [...todayTasks, ...overdueFromPast];
    const unique = all.reduce((acc: Task[], t) => {
      if (!acc.find(x => x.id === t.id)) acc.push(t);
      return acc;
    }, []);

    const pending = unique.filter(t => t.status === 'pending').length;
    const overdue = unique.filter(t => t.status === 'overdue').length;
    const completed = unique.filter(t => t.status === 'completed').length;

    const byType: Partial<Record<TaskType, number>> = {};
    unique.filter(t => t.status !== 'completed').forEach(t => {
      byType[t.task_type] = (byType[t.task_type] || 0) + 1;
    });

    return { pending, overdue, completed, total: unique.length, byType, tasks: unique };
  }, [todayTasks, overdueFromPast]);

  const activeTasks = useMemo(() => 
    stats.tasks
      .filter(t => t.status !== 'completed')
      .sort((a, b) => {
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (b.status === 'overdue' && a.status !== 'overdue') return 1;
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      }),
    [stats.tasks]
  );

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
    localStorage.setItem(COLLAPSED_KEY, open ? 'false' : 'true');
  };

  const getTaskTag = (task: Task) => {
    if (task.title.startsWith('[Atividade Crítica]'))
      return { label: 'Crítica', className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' };
    if (task.created_by !== currentUserId && task.assigned_to === currentUserId)
      return { label: 'Líder', className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' };
    return null;
  };

  const cleanTitle = (title: string) => title.replace('[Atividade Crítica] ', '');

  const typeEntries = Object.entries(stats.byType)
    .sort(([, a], [, b]) => b - a) as [TaskType, number][];

  const totalActive = stats.pending + stats.overdue;

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <Card className={cn(
        'transition-all',
        stats.overdue > 0 && 'border-destructive/30'
      )}>
        <CardHeader className={cn("pb-2", !isOpen && "pb-6")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                Tarefas de Hoje
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {format(today, "dd 'de' MMMM", { locale: ptBR })}
              </span>
              {!isOpen && totalActive > 0 && (
                <Badge variant={stats.overdue > 0 ? 'destructive' : 'secondary'} className="text-xs">
                  {totalActive} {totalActive === 1 ? 'pendente' : 'pendentes'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link to="/tasks">Ver todas</Link>
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2 space-y-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">Carregando...</div>
            ) : stats.total === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma tarefa para hoje! 🎉</p>
              </div>
            ) : (
              <>
                {/* Status counters */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-bold leading-none">{stats.pending}</p>
                      <p className="text-[10px] text-muted-foreground">Pendentes</p>
                    </div>
                  </div>
                  <div className={cn(
                    'flex items-center gap-2 p-2 rounded-lg',
                    stats.overdue > 0 ? 'bg-destructive/10' : 'bg-muted/50'
                  )}>
                    <AlertTriangle className={cn('h-4 w-4', stats.overdue > 0 ? 'text-destructive' : 'text-muted-foreground')} />
                    <div>
                      <p className={cn('text-lg font-bold leading-none', stats.overdue > 0 && 'text-destructive')}>{stats.overdue}</p>
                      <p className="text-[10px] text-muted-foreground">Atrasadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-lg font-bold leading-none text-emerald-600">{stats.completed}</p>
                      <p className="text-[10px] text-muted-foreground">Concluídas</p>
                    </div>
                  </div>
                </div>

                {/* By type breakdown (inline) */}
                {typeEntries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {typeEntries.map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-[10px] h-5 gap-1">
                        {TASK_TYPE_LABELS[type]}: {count}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Active tasks list */}
                <div className="space-y-1.5">
                  {activeTasks.slice(0, 5).map(task => {
                    const isOverdue = task.status === 'overdue';
                    const tag = getTaskTag(task);

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md border text-sm transition-colors hover:bg-muted/50',
                          isOverdue && 'border-destructive/30 bg-destructive/5'
                        )}
                      >
                        <div className={cn(
                          'w-1 h-6 rounded-full shrink-0',
                          isOverdue ? 'bg-destructive' : 'bg-primary'
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-xs">{cleanTitle(task.title)}</span>
                            {tag && (
                              <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4 shrink-0', tag.className)}>
                                {tag.label}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span>{format(new Date(task.scheduled_at), 'HH:mm')}</span>
                            <span>•</span>
                            <span>{TASK_TYPE_LABELS[task.task_type]}</span>
                            {task.opportunity?.contact?.full_name && (
                              <>
                                <span>•</span>
                                <span className="truncate">{task.opportunity.contact.full_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {!task.contact_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => completeTask(task.id)}
                            title="Concluir"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        )}
                        {task.opportunity?.id && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" asChild>
                            <Link to={`/pipeline/${task.opportunity.id}`} title="Ver oportunidade">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {activeTasks.length > 5 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs h-7" asChild>
                      <Link to="/tasks">
                        +{activeTasks.length - 5} tarefas restantes
                      </Link>
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
