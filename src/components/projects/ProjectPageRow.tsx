import { MoreHorizontal, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import { ProjectPage } from '@/hooks/useProjectPages';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectPageRowProps {
  page: ProjectPage;
  onClick: () => void;
  onUpdate: (data: Partial<ProjectPage>) => void;
  onDelete: () => void;
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Não iniciada', color: 'bg-muted text-muted-foreground' },
  { value: 'in_progress', label: 'Em andamento', color: 'bg-green-500/20 text-green-500' },
  { value: 'done', label: 'Concluída', color: 'bg-blue-500/20 text-blue-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: 'bg-blue-500/20 text-blue-500' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-500/20 text-yellow-500' },
  { value: 'high', label: 'Alta', color: 'bg-red-500/20 text-red-500' },
];

export function ProjectPageRow({ page, onClick, onUpdate, onDelete }: ProjectPageRowProps) {
  const statusOption = STATUS_OPTIONS.find((s) => s.value === page.status) || STATUS_OPTIONS[0];
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === page.priority) || PRIORITY_OPTIONS[0];

  const handleStatusChange = (value: string) => {
    onUpdate({ status: value as ProjectPage['status'] });
  };

  const handlePriorityChange = (value: string) => {
    onUpdate({ priority: value as ProjectPage['priority'] });
  };

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{page.icon}</span>
          <span className="font-medium">{page.title}</span>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex -space-x-2">
          {page.assignees?.slice(0, 3).map((assignee) => (
            <Avatar key={assignee.user_id} className="h-6 w-6 border-2 border-background">
              <AvatarFallback className="text-xs">
                {assignee.profile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          ))}
          {(page.assignees?.length || 0) > 3 && (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
              +{page.assignees!.length - 3}
            </div>
          )}
        </div>
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select value={page.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-7 w-[130px] border-0 bg-transparent">
            <Badge className={`${statusOption.color} border-0`}>
              {statusOption.label}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <Badge className={`${option.color} border-0`}>{option.label}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell onClick={onClick}>
        {page.due_date ? (
          <span className="text-sm text-muted-foreground">
            {format(new Date(page.due_date), 'dd MMM yyyy', { locale: ptBR })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select value={page.priority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="h-7 w-[100px] border-0 bg-transparent">
            <Badge className={`${priorityOption.color} border-0`}>
              {priorityOption.label}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <Badge className={`${option.color} border-0`}>{option.label}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
