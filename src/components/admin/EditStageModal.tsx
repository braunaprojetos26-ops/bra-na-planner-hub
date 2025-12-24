import { useState, useEffect } from 'react';
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
import { useUpdateFunnelStage } from '@/hooks/useFunnels';
import type { FunnelStage } from '@/types/contacts';

interface EditStageModalProps {
  stage: FunnelStage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditStageModal({ stage, open, onOpenChange }: EditStageModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('gray');
  const [slaHours, setSlaHours] = useState('');

  const updateStage = useUpdateFunnelStage();

  useEffect(() => {
    if (stage) {
      setName(stage.name);
      setColor(stage.color);
      setSlaHours(stage.sla_hours?.toString() ?? '');
    }
  }, [stage]);

  const handleSubmit = async () => {
    if (!stage || !name.trim()) return;

    await updateStage.mutateAsync({
      id: stage.id,
      name: name.trim(),
      color,
      sla_hours: slaHours ? parseInt(slaHours, 10) : null,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Etapa</DialogTitle>
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
            disabled={!name.trim() || updateStage.isPending}
          >
            {updateStage.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
