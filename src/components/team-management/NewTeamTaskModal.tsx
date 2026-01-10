import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DateInput } from '@/components/ui/date-input';
import { TaskType, TASK_TYPE_LABELS, TeamTaskFormData } from '@/types/tasks';
import { useCreateTeamTask } from '@/hooks/useTeamTasks';

interface TeamMember {
  userId: string;
  fullName: string;
}

interface NewTeamTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMember[];
}

const TASK_TYPE_OPTIONS = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function NewTeamTaskModal({ open, onOpenChange, teamMembers }: NewTeamTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('follow_up');
  const [assignedTo, setAssignedTo] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('09:00');

  const { mutateAsync: createTask, isPending } = useCreateTeamTask();

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTaskType('follow_up');
    setAssignedTo('');
    setScheduledDate(undefined);
    setScheduledTime('09:00');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !assignedTo || !scheduledDate) return;

    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const dateTime = new Date(scheduledDate);
    dateTime.setHours(hours, minutes, 0, 0);

    const formData: TeamTaskFormData = {
      assigned_to: assignedTo,
      title: title.trim(),
      description: description.trim() || undefined,
      task_type: taskType,
      scheduled_at: dateTime.toISOString(),
    };

    await createTask(formData);
    resetForm();
    onOpenChange(false);
  };

  const memberOptions = teamMembers.map(m => ({
    value: m.userId,
    label: m.fullName,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Tarefa para a Equipe</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Responsável *</Label>
            <SearchableSelect
              value={assignedTo}
              onValueChange={setAssignedTo}
              options={memberOptions}
              placeholder="Selecione o membro da equipe"
              searchPlaceholder="Buscar membro..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título da Tarefa *</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Ligar para cliente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task_type">Tipo de Tarefa</Label>
            <SearchableSelect
              value={taskType}
              onValueChange={v => setTaskType(v as TaskType)}
              options={TASK_TYPE_OPTIONS}
              placeholder="Selecione o tipo"
              searchPlaceholder="Buscar tipo..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <DateInput
                value={scheduledDate}
                onChange={setScheduledDate}
                placeholder="DD/MM/AAAA"
                toYear={new Date().getFullYear() + 1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes adicionais sobre a tarefa..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || !title.trim() || !assignedTo || !scheduledDate}
            >
              {isPending ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
