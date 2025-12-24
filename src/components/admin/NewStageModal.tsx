import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { StageColorPicker } from './StageColorPicker';
import { useCreateFunnelStage } from '@/hooks/useFunnels';

interface NewStageModalProps {
  funnelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewStageModal({ funnelId, open, onOpenChange }: NewStageModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('gray');
  const [slaHours, setSlaHours] = useState('');

  const createStage = useCreateFunnelStage();

  const handleSubmit = async () => {
    if (!name.trim()) return;

    await createStage.mutateAsync({
      funnel_id: funnelId,
      name: name.trim(),
      color,
      sla_hours: slaHours ? parseInt(slaHours, 10) : null,
    });

    // Reset form
    setName('');
    setColor('gray');
    setSlaHours('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Etapa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da Etapa</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Lead Recebido"
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <StageColorPicker value={color} onChange={setColor} />
          </div>

          <div className="space-y-2">
            <Label>SLA (horas)</Label>
            <Input
              type="number"
              value={slaHours}
              onChange={e => setSlaHours(e.target.value)}
              placeholder="Ex: 24"
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio se não houver SLA para esta etapa
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name.trim() || createStage.isPending}
          >
            {createStage.isPending ? 'Criando...' : 'Criar Etapa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
