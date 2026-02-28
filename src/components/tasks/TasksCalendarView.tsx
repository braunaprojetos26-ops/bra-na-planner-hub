import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  addWeeks, subWeeks, format, isSameMonth, isSameDay, isToday, startOfDay, endOfDay,
  getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Task } from '@/types/tasks';
import { QuickTaskModal } from './QuickTaskModal';

type CalendarMode = 'month' | 'week' | 'day';

interface TasksCalendarViewProps {
  tasks: Task[];
  isLoading: boolean;
}

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function getTaskColor(task: Task) {
  if (task.status === 'completed') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (task.status === 'overdue') return 'bg-destructive/10 text-destructive';
  if (task.title.startsWith('[Atividade Crítica]')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
  return 'bg-primary/10 text-primary';
}

function cleanTitle(title: string) {
  return title.replace('[Atividade Crítica] ', '');
}

export function TasksCalendarView({ tasks, isLoading }: TasksCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<CalendarMode>('month');
  const [quickTaskDate, setQuickTaskDate] = useState<Date | null>(null);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      const key = format(new Date(task.scheduled_at), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return map;
  }, [tasks]);

  // Navigate
  const goNext = () => {
    if (mode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (mode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const goPrev = () => {
    if (mode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (mode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -1));
  };
  const goToday = () => setCurrentDate(new Date());

  const headerLabel = useMemo(() => {
    if (mode === 'month') return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    if (mode === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, 'dd/MM')} - ${format(we, 'dd/MM/yyyy')}`;
    }
    return format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  }, [currentDate, mode]);

  // Generate days grid
  const days = useMemo(() => {
    if (mode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      const result: Date[] = [];
      let day = calStart;
      while (day <= calEnd) {
        result.push(day);
        day = addDays(day, 1);
      }
      return result;
    }
    if (mode === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    }
    return [startOfDay(currentDate)];
  }, [currentDate, mode]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold capitalize ml-2">{headerLabel}</h3>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(['month', 'week', 'day'] as CalendarMode[]).map(m => (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode(m)}
              className="text-xs"
            >
              {m === 'month' ? 'Mês' : m === 'week' ? 'Semana' : 'Dia'}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      {mode === 'month' && (
        <div className="border rounded-lg overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {WEEKDAY_LABELS.map(label => (
              <div key={label} className="p-2 text-center text-xs font-medium text-muted-foreground border-b">
                {label}
              </div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDay.get(key) || [];
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);

              return (
                <div
                  key={idx}
                  className={cn(
                    'min-h-[100px] border-b border-r p-1 cursor-pointer hover:bg-muted/30 transition-colors',
                    !inMonth && 'bg-muted/20 opacity-50',
                  )}
                  onClick={() => setQuickTaskDate(day)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                      today && 'bg-primary text-primary-foreground',
                    )}>
                      {format(day, 'd')}
                    </span>
                    {dayTasks.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {dayTasks.length}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-0.5 overflow-hidden max-h-[72px]">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className={cn(
                          'text-[10px] px-1 py-0.5 rounded truncate leading-tight',
                          getTaskColor(task),
                        )}
                        title={cleanTitle(task.title)}
                      >
                        {cleanTitle(task.title)}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-muted-foreground pl-1">
                        +{dayTasks.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'week' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50">
            {days.map((day, idx) => (
              <div key={idx} className="p-2 text-center border-b">
                <div className="text-xs text-muted-foreground">{WEEKDAY_LABELS[idx]}</div>
                <div className={cn(
                  'text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto',
                  isToday(day) && 'bg-primary text-primary-foreground',
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDay.get(key) || [];
              return (
                <div
                  key={idx}
                  className="min-h-[200px] border-r p-2 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setQuickTaskDate(day)}
                >
                  <div className="space-y-1">
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        className={cn(
                          'text-xs px-2 py-1 rounded truncate',
                          getTaskColor(task),
                        )}
                        title={cleanTitle(task.title)}
                      >
                        <span className="font-medium">{format(new Date(task.scheduled_at), 'HH:mm')}</span>
                        {' '}
                        {cleanTitle(task.title)}
                      </div>
                    ))}
                    {dayTasks.length === 0 && (
                      <div className="flex items-center justify-center h-full min-h-[60px] opacity-0 hover:opacity-100 transition-opacity">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'day' && (
        <div className="border rounded-lg p-4">
          <div className="space-y-2">
            {(() => {
              const key = format(currentDate, 'yyyy-MM-dd');
              const dayTasks = tasksByDay.get(key) || [];
              if (dayTasks.length === 0) {
                return (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Nenhuma tarefa para este dia</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setQuickTaskDate(currentDate)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar tarefa
                    </Button>
                  </div>
                );
              }
              return dayTasks
                .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                .map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border',
                      task.status === 'completed' && 'opacity-60',
                    )}
                  >
                    <div className={cn('w-1 h-10 rounded-full shrink-0', 
                      task.status === 'overdue' ? 'bg-destructive' :
                      task.status === 'completed' ? 'bg-emerald-500' :
                      'bg-primary'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-medium text-sm', task.status === 'completed' && 'line-through')}>
                        {cleanTitle(task.title)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.scheduled_at), 'HH:mm')}
                        {task.assigned_to_profile?.full_name && ` • ${task.assigned_to_profile.full_name}`}
                      </p>
                    </div>
                    <Badge variant={
                      task.status === 'overdue' ? 'destructive' :
                      task.status === 'completed' ? 'secondary' : 'outline'
                    } className="shrink-0">
                      {task.status === 'overdue' ? 'Atrasada' :
                       task.status === 'completed' ? 'Concluída' : 'Pendente'}
                    </Badge>
                  </div>
                ));
            })()}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setQuickTaskDate(currentDate)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar tarefa
          </Button>
        </div>
      )}

      <QuickTaskModal
        open={!!quickTaskDate}
        onOpenChange={(open) => { if (!open) setQuickTaskDate(null); }}
        defaultDate={quickTaskDate}
      />
    </div>
  );
}
