import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLostReasons } from '@/hooks/useFunnels';
import { useMarkContactLost } from '@/hooks/useContacts';
import type { Contact } from '@/types/contacts';

interface MarkLostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

export function MarkLostModal({ open, onOpenChange, contact }: MarkLostModalProps) {
  const { data: lostReasons } = useLostReasons();
  const markLost = useMarkContactLost();
  const [reasonId, setReasonId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!reasonId) return;

    await markLost.mutateAsync({
      contactId: contact.id,
      fromStageId: contact.current_stage_id,
      lostReasonId: reasonId,
      notes: notes || undefined,
    });

    setReasonId('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Marcar como Perdido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Contato: <strong>{contact.full_name}</strong>
          </p>

          <div className="space-y-2">
            <Label>Motivo da Perda *</Label>
            <Select value={reasonId} onValueChange={setReasonId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {lostReasons?.map(reason => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea 
              placeholder="Informações adicionais..."
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
              disabled={!reasonId || markLost.isPending}
              variant="destructive"
            >
              {markLost.isPending ? 'Salvando...' : 'Marcar Perdido'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
