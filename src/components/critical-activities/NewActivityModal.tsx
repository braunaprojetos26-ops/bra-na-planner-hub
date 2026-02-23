import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { positionOptions } from '@/lib/positionLabels';
import type { CreateActivityData } from '@/hooks/useCriticalActivities';

interface NewActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateActivityData) => void;
  isSubmitting: boolean;
}

export function NewActivityModal({ open, onOpenChange, onSubmit, isSubmitting }: NewActivityModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [allPositions, setAllPositions] = useState(true);

  const handleSubmit = () => {
    if (!title.trim() || !deadline) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      urgency,
      target_positions: allPositions ? null : selectedPositions,
      deadline: new Date(deadline).toISOString(),
    });
    // Reset
    setTitle('');
    setDescription('');
    setUrgency('medium');
    setDeadline('');
    setSelectedPositions([]);
    setAllPositions(true);
  };

  const togglePosition = (pos: string) => {
    setSelectedPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Atividade Crítica</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Atualizar dados cadastrais" />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva a atividade em detalhes..." />
          </div>

          <div>
            <Label>Nível de Urgência</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="deadline">Data Máxima *</Label>
            <Input id="deadline" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>

          <div>
            <Label>Destinatários</Label>
            <div className="flex items-center gap-2 mt-2">
              <Checkbox id="all-positions" checked={allPositions} onCheckedChange={(checked) => setAllPositions(!!checked)} />
              <label htmlFor="all-positions" className="text-sm">Todos os cargos</label>
            </div>

            {!allPositions && (
              <div className="grid grid-cols-1 gap-2 mt-3 max-h-48 overflow-y-auto border rounded-md p-3">
                {positionOptions.map(pos => (
                  <div key={pos.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`pos-${pos.value}`}
                      checked={selectedPositions.includes(pos.value)}
                      onCheckedChange={() => togglePosition(pos.value)}
                    />
                    <label htmlFor={`pos-${pos.value}`} className="text-sm">{pos.label}</label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !deadline || isSubmitting || (!allPositions && selectedPositions.length === 0)}>
            {isSubmitting ? 'Criando...' : 'Criar Atividade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
