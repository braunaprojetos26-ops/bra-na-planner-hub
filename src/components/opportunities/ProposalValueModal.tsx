import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProposalValueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: number) => void;
  isLoading?: boolean;
  currentValue?: number | null;
  stageName?: string;
}

export function ProposalValueModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  currentValue,
  stageName,
}: ProposalValueModalProps) {
  const [value, setValue] = useState<string>(currentValue ? String(currentValue) : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(numericValue) && numericValue > 0) {
      onConfirm(numericValue);
    }
  };

  const formatCurrency = (val: string) => {
    // Remove non-numeric chars except comma and dot
    const cleaned = val.replace(/[^\d.,]/g, '');
    return cleaned;
  };

  const isValid = () => {
    const numericValue = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    return !isNaN(numericValue) && numericValue > 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Valor da Proposta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para mover a oportunidade para a etapa{' '}
            <span className="font-medium text-foreground">{stageName || 'Proposta Feita'}</span>,
            informe o valor da proposta.
          </p>

          <div className="space-y-2">
            <Label htmlFor="proposal-value">Valor (R$) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                id="proposal-value"
                type="text"
                placeholder="0,00"
                value={value}
                onChange={(e) => setValue(formatCurrency(e.target.value))}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid() || isLoading}>
              {isLoading ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
