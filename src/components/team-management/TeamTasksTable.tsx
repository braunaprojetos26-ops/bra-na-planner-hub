import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Trash2, MoreHorizontal } from 'lucide-react';
import { Task, TASK_TYPE_LABELS, TASK_STATUS_LABELS } from '@/types/tasks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamTasksTableProps {
  tasks: Task[];
  isLoading?: boolean;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Concluída</Badge>;
    case 'overdue':
      return <Badge variant="destructive">Atrasada</Badge>;
    case 'pending':
    default:
      return <Badge variant="secondary">Pendente</Badge>;
  }
}

export function TeamTasksTable({ tasks, isLoading, onComplete, onDelete }: TeamTasksTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma tarefa encontrada
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarefa</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => (
            <TableRow key={task.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {task.assigned_to_profile?.full_name || '-'}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS] || task.task_type}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {format(new Date(task.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              </TableCell>
              <TableCell>
                {getStatusBadge(task.status)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {task.status !== 'completed' && (
                      <DropdownMenuItem onClick={() => onComplete(task.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como concluída
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => onDelete(task.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
