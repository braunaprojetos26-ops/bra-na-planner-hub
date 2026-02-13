import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { ContributionStep } from "@/types/dreams";

interface ContributionStepsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: ContributionStep[];
  onConfirm: (steps: ContributionStep[]) => void;
  maxYears: number;
}

export function ContributionStepsModal({ open, onOpenChange, steps, onConfirm, maxYears }: ContributionStepsModalProps) {
  const [localSteps, setLocalSteps] = useState<ContributionStep[]>([]);

  useEffect(() => {
    if (open) {
      setLocalSteps(steps.length > 0 ? steps.map(s => ({ ...s })) : [
        { id: crypto.randomUUID(), durationYears: 1, monthlyAmount: 0 },
      ]);
    }
  }, [open, steps]);

  const totalYears = localSteps.reduce((sum, s) => sum + s.durationYears, 0);

  const handleAdd = () => {
    setLocalSteps(prev => [
      ...prev,
      { id: crypto.randomUUID(), durationYears: 1, monthlyAmount: 0 },
    ]);
  };

  const handleRemove = (id: string) => {
    setLocalSteps(prev => prev.filter(s => s.id !== id));
  };

  const handleYearsChange = (id: string, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const num = cleaned === "" ? 0 : parseInt(cleaned, 10);
    setLocalSteps(prev => prev.map(s => s.id === id ? { ...s, durationYears: num } : s));
  };

  const handleYearsBlur = (id: string) => {
    setLocalSteps(prev => prev.map(s => s.id === id ? { ...s, durationYears: Math.max(1, s.durationYears) } : s));
  };

  const handleAmountChange = (id: string, value: string) => {
    const num = parseFloat(value.replace(/\D/g, "")) || 0;
    setLocalSteps(prev => prev.map(s => s.id === id ? { ...s, monthlyAmount: num } : s));
  };

  const handleConfirm = () => {
    onConfirm(localSteps.filter(s => s.durationYears > 0));
    onOpenChange(false);
  };

  const handleClear = () => {
    onConfirm([]);
    onOpenChange(false);
  };

  // Build cumulative year labels
  let cumYears = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aportes escalonados</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-[24px_1fr_1fr_32px] gap-2 items-center text-xs font-medium text-muted-foreground">
            <span>#</span>
            <span>Período (anos)</span>
            <span>Aporte mensal</span>
            <span />
          </div>

          {localSteps.map((step, idx) => {
            const startYear = cumYears;
            cumYears += step.durationYears;
            const periodLabel = step.durationYears <= 1
              ? `Ano ${startYear + 1}`
              : `Ano ${startYear + 1} ao ${cumYears}`;

            return (
              <div key={step.id} className="space-y-1">
                <div className="grid grid-cols-[24px_1fr_1fr_32px] gap-2 items-center">
                  <span className="text-xs text-muted-foreground text-center">{idx + 1}</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={step.durationYears === 0 ? "" : String(step.durationYears)}
                    onChange={(e) => handleYearsChange(step.id, e.target.value)}
                    onBlur={() => handleYearsBlur(step.id)}
                    className="h-8 text-sm"
                    placeholder="Anos"
                  />
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10">R$</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={step.monthlyAmount > 0 ? step.monthlyAmount.toLocaleString("pt-BR") : ""}
                      onChange={(e) => handleAmountChange(step.id, e.target.value)}
                      className="h-8 text-sm pl-8"
                      placeholder="0"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(step.id)}
                    disabled={localSteps.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <span className="text-[10px] text-muted-foreground pl-[32px]">{periodLabel}</span>
              </div>
            );
          })}

          <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar faixa
          </Button>

          <div className={`text-xs text-center ${totalYears > maxYears ? "text-destructive" : "text-muted-foreground"}`}>
            Total: {totalYears} anos de {maxYears} disponíveis
            {totalYears > maxYears && " (excede o período até a aposentadoria)"}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {steps.length > 0 && (
            <Button variant="outline" onClick={handleClear} className="text-destructive">
              Desativar escalonamento
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={totalYears > maxYears}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
