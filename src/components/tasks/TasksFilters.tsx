import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskType, TaskStatus, TASK_TYPE_LABELS } from '@/types/tasks';

export type PeriodFilter = 'this_week' | 'next_7_days' | 'this_month' | 'all';

export interface TeamMemberOption {
  userId: string;
  fullName: string;
}

interface TasksFiltersProps {
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  taskType: TaskType | 'all';
  onTaskTypeChange: (type: TaskType | 'all') => void;
  status: TaskStatus | 'all';
  onStatusChange: (status: TaskStatus | 'all') => void;
  assignedTo?: string | 'all';
  onAssignedToChange?: (userId: string | 'all') => void;
  teamMembers?: TeamMemberOption[];
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'this_week', label: 'Esta semana' },
  { value: 'next_7_days', label: 'Próximos 7 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'all', label: 'Todas' },
];

const STATUS_OPTIONS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'completed', label: 'Concluída' },
  { value: 'overdue', label: 'Atrasada' },
];

export function TasksFilters({
  period,
  onPeriodChange,
  taskType,
  onTaskTypeChange,
  status,
  onStatusChange,
  assignedTo,
  onAssignedToChange,
  teamMembers,
}: TasksFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={period} onValueChange={(value) => onPeriodChange(value as PeriodFilter)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={taskType} onValueChange={(value) => onTaskTypeChange(value as TaskType | 'all')}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Tipo de tarefa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(value) => onStatusChange(value as TaskStatus | 'all')}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {teamMembers && teamMembers.length > 0 && onAssignedToChange && (
        <Select value={assignedTo || 'all'} onValueChange={(value) => onAssignedToChange(value as string)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {member.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
