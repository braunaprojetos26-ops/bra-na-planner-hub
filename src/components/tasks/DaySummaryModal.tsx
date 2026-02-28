import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Trash2, Plus, Clock, ExternalLink, Handshake, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Task, TASK_TYPE_LABELS } from '@/types/tasks';
import { useTasks } from '@/hooks/useTasks';
import { useActingUser } from '@/contexts/ActingUserContext';
import { RegisterInteractionModal } from './RegisterInteractionModal';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface DaySummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  tasks: Task[];
  onAddTask: () => void;
}

export function DaySummaryModal({ open, onOpenChange, date, tasks, onAddTask }: DaySummaryModalProps) {
  const { completeTask, deleteTask } = useTasks();
  const { actingUser } = useActingUser();
  const currentUserId = actingUser?.id;
  const [interactionModal, setInteractionModal] = useState<{
    open: boolean;
    contactId: string;
    contactName: string;
    taskId: string;
  }>({ open: false, contactId: '', contactName: '', taskId: '' });

  if (!date) return null;

  const sorted = [...tasks].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const completed = tasks.filter(t => t.status === 'completed').length;
  const overdue = tasks.filter(t => t.status === 'overdue').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  function getTaskTag(task: Task) {
    if (task.title.startsWith('[Atividade Crítica]')) {
      return { label: 'Atividade Crítica', className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' };
    }
    if (task.created_by !== currentUserId && task.assigned_to === currentUserId) {
      return { label: 'Tarefa Líder', className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' };
    }
    return { label: 'Tarefa Própria', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' };
  }

  const cleanTitle = (title: string) => title.replace('[Atividade Crítica] ', '');

  const handleComplete = async (taskId: string) => {
    await completeTask(taskId);
  };

  const handleDelete = async (taskId: string) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(taskId);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-destructive/10">
              <p className="text-lg font-bold text-destructive">{overdue}</p>
              <p className="text-xs text-muted-foreground">Atrasadas</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-emerald-500/10">
              <p className="text-lg font-bold text-emerald-600">{completed}</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </div>
          </div>

          {/* Task list */}
          <ScrollArea className="max-h-[50vh]">
            {sorted.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma tarefa para este dia</p>
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {sorted.map(task => {
                  const isCompleted = task.status === 'completed';
                  const isOverdue = task.status === 'overdue';
                  const tag = getTaskTag(task);

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                        isCompleted && 'opacity-60',
                        isOverdue && 'border-destructive/30',
                      )}
                    >
                      <div className={cn(
                        'w-1 min-h-[40px] self-stretch rounded-full shrink-0',
                        isOverdue ? 'bg-destructive' :
                        isCompleted ? 'bg-emerald-500' :
                        'bg-primary'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn('font-medium text-sm', isCompleted && 'line-through')}>
                            {cleanTitle(task.title)}
                          </p>
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5 font-medium shrink-0', tag.className)}>
                            {tag.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{format(new Date(task.scheduled_at), 'HH:mm')}</span>
                          <span>•</span>
                          <span>{TASK_TYPE_LABELS[task.task_type]}</span>
                          {task.assigned_to_profile?.full_name && (
                            <>
                              <span>•</span>
                              <span>{task.assigned_to_profile.full_name}</span>
                            </>
                          )}
                        </div>
                        {task.opportunity?.contact?.full_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Contato: {task.opportunity.contact.full_name}
                          </p>
                        )}
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {task.opportunity?.id && (
                            <DropdownMenuItem asChild>
                              <Link to={`/pipeline/${task.opportunity.id}`}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Ver oportunidade
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {task.contact_id && !isCompleted && (
                            <DropdownMenuItem onClick={() => {
                              const contactName = task.opportunity?.contact?.full_name || 'Cliente';
                              setInteractionModal({
                                open: true,
                                contactId: task.contact_id!,
                                contactName,
                                taskId: task.id,
                              });
                            }}>
                              <Handshake className="w-4 h-4 mr-2" />
                              Registrar Relacionamento
                            </DropdownMenuItem>
                          )}
                          {!task.contact_id && !isCompleted && (
                            <DropdownMenuItem onClick={() => handleComplete(task.id)}>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Marcar como concluída
                            </DropdownMenuItem>
                          )}
                          {!task.contact_id && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(task.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <Button variant="outline" size="sm" className="w-full" onClick={onAddTask}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar tarefa neste dia
          </Button>
        </DialogContent>
      </Dialog>
      <RegisterInteractionModal
        open={interactionModal.open}
        onOpenChange={(o) => setInteractionModal(prev => ({ ...prev, open: o }))}
        contactId={interactionModal.contactId}
        contactName={interactionModal.contactName}
        taskId={interactionModal.taskId}
      />
    </>
  );
}
