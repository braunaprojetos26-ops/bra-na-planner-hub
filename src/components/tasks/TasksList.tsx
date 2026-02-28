import { useState } from 'react';
import { format, isToday, isTomorrow, isPast, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock, Trash2, Phone, Mail, Calendar, MessageCircle, FileText, Send, MoreHorizontal, AlertTriangle, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Task, TaskType, TASK_TYPE_LABELS } from '@/types/tasks';
import { useTasks } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TasksListProps {
  opportunityId: string;
}

const TASK_TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  call: <Phone className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  meeting: <Calendar className="w-4 h-4" />,
  follow_up: <Clock className="w-4 h-4" />,
  proposal: <Send className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  scheduling_analysis: <CalendarCheck className="w-4 h-4" />,
  personal: <Circle className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

export function TasksList({ opportunityId }: TasksListProps) {
  const { tasks, isLoading, completeTask, deleteTask } = useTasks(opportunityId);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando tarefas...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Nenhuma tarefa cadastrada
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const formatScheduledDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return `Hoje, ${format(d, 'HH:mm')}`;
    if (isTomorrow(d)) return `Amanhã, ${format(d, 'HH:mm')}`;
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getOverdueText = (date: string) => {
    return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
  };

  return (
    <div className="space-y-4">
      {/* Pending/Overdue Tasks */}
      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          {pendingTasks.map((task) => {
            const isOverdue = task.status === 'overdue' || (task.status === 'pending' && isPast(new Date(task.scheduled_at)));
            
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  isOverdue ? "bg-destructive/5 border-destructive/30" : "bg-card border-border hover:bg-accent/5"
                )}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 mt-0.5"
                        onClick={() => completeTask(task.id)}
                      >
                        <Circle className={cn(
                          "w-5 h-5",
                          isOverdue ? "text-destructive" : "text-muted-foreground"
                        )} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Marcar como concluída</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "font-medium",
                      isOverdue && "text-destructive"
                    )}>
                      {task.title}
                    </span>
                    <Badge variant="outline" className="text-xs gap-1">
                      {TASK_TYPE_ICONS[task.task_type]}
                      {TASK_TYPE_LABELS[task.task_type]}
                    </Badge>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Atrasada
                      </Badge>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className={isOverdue ? "text-destructive" : ""}>
                      {formatScheduledDate(task.scheduled_at)}
                      {isOverdue && ` (${getOverdueText(task.scheduled_at)})`}
                    </span>
                  </div>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setTaskToDelete(task.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir tarefa</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Concluídas</h4>
          {completedTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 border-border/50"
            >
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-muted-foreground line-through">
                    {task.title}
                  </span>
                  <Badge variant="secondary" className="text-xs gap-1">
                    {TASK_TYPE_ICONS[task.task_type]}
                    {TASK_TYPE_LABELS[task.task_type]}
                  </Badge>
                </div>
                
                {task.completed_at && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>
                      Concluída em {format(new Date(task.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setTaskToDelete(task.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Excluir tarefa</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (taskToDelete) {
                  deleteTask(taskToDelete);
                  setTaskToDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
