import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTicket } from '@/hooks/useTickets';
import { TicketDepartment, TicketPriority, departmentLabels, priorityLabels } from '@/types/tickets';

interface NewTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTicketModal({ open, onOpenChange }: NewTicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<TicketDepartment>('administrativo');
  const [priority, setPriority] = useState<TicketPriority>('normal');

  const createTicket = useCreateTicket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createTicket.mutateAsync({
      title,
      description,
      department,
      priority,
    });

    setTitle('');
    setDescription('');
    setDepartment('administrativo');
    setPriority('normal');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Chamado</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumo do seu chamado"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Select value={department} onValueChange={(v) => setDepartment(v as TicketDepartment)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(departmentLabels) as TicketDepartment[]).map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {departmentLabels[dept]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(priorityLabels) as TicketPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {priorityLabels[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o seu problema ou solicitação em detalhes..."
              rows={5}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? 'Criando...' : 'Criar Chamado'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
