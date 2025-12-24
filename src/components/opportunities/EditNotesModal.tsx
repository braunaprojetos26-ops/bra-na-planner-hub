import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EditNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNotes: string | null;
  onSave: (notes: string | null) => void;
  isLoading?: boolean;
}

export function EditNotesModal({
  open,
  onOpenChange,
  currentNotes,
  onSave,
  isLoading,
}: EditNotesModalProps) {
  const [notes, setNotes] = useState(currentNotes || '');

  useEffect(() => {
    if (open) {
      setNotes(currentNotes || '');
    }
  }, [open, currentNotes]);

  const handleSave = () => {
    onSave(notes.trim() || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Anotações</DialogTitle>
          <DialogDescription>
            Adicione ou edite as anotações desta negociação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Anotações</Label>
            <Textarea
              id="notes"
              placeholder="Digite suas anotações aqui..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
