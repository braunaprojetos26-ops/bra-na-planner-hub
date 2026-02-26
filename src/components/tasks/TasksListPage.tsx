import { useState } from 'react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Send, 
  MoreHorizontal,
  CheckCircle2,
  Trash2,
  ExternalLink,
  CalendarCheck,
  Handshake
} from 'lucide-react';
import { Task, TaskType, TASK_TYPE_LABELS } from '@/types/tasks';
import { useTasks } from '@/hooks/useTasks';
import { useActingUser } from '@/contexts/ActingUserContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { RegisterInteractionModal } from './RegisterInteractionModal';
const TASK_TYPE_ICONS: Record<TaskType, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  follow_up: MessageSquare,
  proposal: Send,
  document: FileText,
  whatsapp: MessageSquare,
  scheduling_analysis: CalendarCheck,
  other: MoreHorizontal,
};

interface TasksListPageProps {
  tasks: Task[];
  isLoading: boolean;
}

function formatScheduledDate(dateStr: string): string {
  const date = new Date(dateStr);
  
  if (isToday(date)) {
    return `Hoje, ${format(date, 'HH:mm')}`;
  }
  
  if (isTomorrow(date)) {
    return `Amanhã, ${format(date, 'HH:mm')}`;
  }
  
  if (isPast(date)) {
    return `${format(date, "dd/MM/yyyy 'às' HH:mm")} (${formatDistanceToNow(date, { locale: ptBR, addSuffix: true })})`;
  }
  
  return format(date, "dd/MM/yyyy 'às' HH:mm");
}

export function TasksListPage({ tasks, isLoading }: TasksListPageProps) {
  const { completeTask, deleteTask } = useTasks();
  const { actingUser } = useActingUser();
  const currentUserId = actingUser?.id;
  const [interactionModal, setInteractionModal] = useState<{
    open: boolean;
    contactId: string;
    contactName: string;
    taskId: string;
  }>({ open: false, contactId: '', contactName: '', taskId: '' });

  function getTaskTag(task: Task) {
    if (task.title.startsWith('[Atividade Crítica]')) {
      return { label: 'Atividade Crítica', className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' };
    }
    if (task.created_by !== currentUserId && task.assigned_to === currentUserId) {
      return { label: 'Tarefa Líder', className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' };
    }
    return { label: 'Tarefa Própria', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' };
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma tarefa encontrada</p>
        <p className="text-sm">Tente ajustar os filtros</p>
      </div>
    );
  }

  const handleComplete = async (taskId: string) => {
    await completeTask(taskId);
  };

  const handleDelete = async (taskId: string) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(taskId);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarefa</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Funil</TableHead>
            <TableHead>Agendamento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const TaskIcon = TASK_TYPE_ICONS[task.task_type];
            const isOverdue = task.status === 'overdue';
            const isCompleted = task.status === 'completed';
            const tag = getTaskTag(task);
            
            return (
              <TableRow 
                key={task.id} 
                className={isCompleted ? 'opacity-60' : ''}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isOverdue ? 'bg-destructive/10' : 
                      isCompleted ? 'bg-emerald-500/10' : 
                      'bg-primary/10'
                    }`}>
                      <TaskIcon className={`w-4 h-4 ${
                        isOverdue ? 'text-destructive' : 
                        isCompleted ? 'text-emerald-500' : 
                        'text-primary'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${isCompleted ? 'line-through' : ''}`}>
                          {task.title.replace('[Atividade Crítica] ', '')}
                        </p>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 font-medium whitespace-nowrap shrink-0 ${tag.className}`}>
                          {tag.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {TASK_TYPE_LABELS[task.task_type]}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {task.assigned_to_profile?.full_name || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  {task.opportunity?.contact?.full_name || '-'}
                </TableCell>
                <TableCell>
                  {task.opportunity?.current_funnel?.name || '-'}
                </TableCell>
                <TableCell>
                  <span className={isOverdue ? 'text-destructive' : ''}>
                    {formatScheduledDate(task.scheduled_at)}
                  </span>
                  {isCompleted && task.completed_at && (
                    <p className="text-xs text-emerald-600">
                      Concluída em {format(new Date(task.completed_at), 'dd/MM/yyyy')}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      isOverdue ? 'destructive' : 
                      isCompleted ? 'secondary' : 
                      'outline'
                    }
                  >
                    {isOverdue ? 'Atrasada' : isCompleted ? 'Concluída' : 'Pendente'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
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
                          const contactName = task.opportunity?.contact?.full_name || 
                            task.title.replace('[Atividade Crítica] ', '').split(' - ').slice(1).join(' - ') || 
                            'Cliente';
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
                      {!isCompleted && (
                        <DropdownMenuItem onClick={() => handleComplete(task.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Marcar como concluída
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDelete(task.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <RegisterInteractionModal
        open={interactionModal.open}
        onOpenChange={(open) => setInteractionModal(prev => ({ ...prev, open }))}
        contactId={interactionModal.contactId}
        contactName={interactionModal.contactName}
        taskId={interactionModal.taskId}
      />
    </div>
  );
}
