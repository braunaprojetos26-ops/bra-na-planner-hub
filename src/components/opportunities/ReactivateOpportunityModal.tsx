import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFunnelStages } from '@/hooks/useFunnels';
import { useReactivateOpportunity } from '@/hooks/useOpportunities';
import type { Opportunity } from '@/types/opportunities';

interface ReactivateOpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity;
}

export function ReactivateOpportunityModal({ open, onOpenChange, opportunity }: ReactivateOpportunityModalProps) {
  const { data: stages } = useFunnelStages(opportunity.current_funnel_id);
  const reactivate = useReactivateOpportunity();
  const [stageId, setStageId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!stageId) return;

    await reactivate.mutateAsync({
      opportunityId: opportunity.id,
      toStageId: stageId,
      notes: notes || undefined,
    });

    setStageId('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Reativar Oportunidade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Oportunidade: <strong>{opportunity.contact?.full_name}</strong>
          </p>

          <div className="space-y-2">
            <Label>Para qual etapa? *</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent>
                {stages?.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea 
              placeholder="Motivo da reativação..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!stageId || reactivate.isPending}
            >
              {reactivate.isPending ? 'Reativando...' : 'Reativar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
