import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, RotateCcw } from "lucide-react";

interface RateSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxaAcumulo: number;
  taxaUsufruto: number;
  onTaxaAcumuloChange: (value: number) => void;
  onTaxaUsufruteChange: (value: number) => void;
  onResetToDefaults: () => void;
  onSave: () => void;
}

const DEFAULT_TAXA_ACUMULO = 4;
const DEFAULT_TAXA_USUFRUTO = 3.5;

export function RateSettingsModal({
  open,
  onOpenChange,
  taxaAcumulo,
  taxaUsufruto,
  onTaxaAcumuloChange,
  onTaxaUsufruteChange,
  onResetToDefaults,
  onSave,
}: RateSettingsModalProps) {
  const handleSave = () => {
    onSave();
    onOpenChange(false);
  };

  const handleReset = () => {
    onResetToDefaults();
  };

  const isDefault = taxaAcumulo === DEFAULT_TAXA_ACUMULO && taxaUsufruto === DEFAULT_TAXA_USUFRUTO;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Configurações da simulação</DialogTitle>
          <DialogDescription>
            Ajuste as taxas de rentabilidade para a simulação de independência financeira.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Taxa de acúmulo */}
          <div className="space-y-2">
            <Label htmlFor="taxa-acumulo" className="text-sm font-medium">
              Taxa de juros real anual na fase de acumulação
            </Label>
            <div className="relative">
              <Input
                id="taxa-acumulo"
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={taxaAcumulo}
                onChange={(e) => onTaxaAcumuloChange(parseFloat(e.target.value) || 0)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Rentabilidade esperada durante a fase de acúmulo de patrimônio.
            </p>
          </div>

          {/* Taxa de usufruto */}
          <div className="space-y-2">
            <Label htmlFor="taxa-usufruto" className="text-sm font-medium">
              Taxa de juros real anual após aposentadoria
            </Label>
            <div className="relative">
              <Input
                id="taxa-usufruto"
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={taxaUsufruto}
                onChange={(e) => onTaxaUsufruteChange(parseFloat(e.target.value) || 0)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Rentabilidade esperada durante a fase de usufruto do patrimônio.
            </p>
          </div>

          {/* Aviso informativo */}
          <div className="flex gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              As taxas de juros padrão estão de acordo com a visão conservadora do mercado. 
              Alterar os valores pode gerar uma simulação que não condiz com a realidade. 
              Consulte um especialista para ajustar com segurança.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isDefault}
            className="sm:mr-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Voltar às taxas padrão
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
