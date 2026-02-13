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
import { Separator } from "@/components/ui/separator";
import { AlertCircle, RotateCcw } from "lucide-react";

interface RateSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idadeAtual: number;
  onIdadeAtualChange: (value: number) => void;
  taxaAcumulo: number;
  taxaUsufruto: number;
  onTaxaAcumuloChange: (value: number) => void;
  onTaxaUsufruteChange: (value: number) => void;
  onResetToDefaults: () => void;
  onSave: () => void;
}

const DEFAULT_IDADE_ATUAL = 33;
const DEFAULT_TAXA_ACUMULO = 4;
const DEFAULT_TAXA_USUFRUTO = 3.5;

export function RateSettingsModal({
  open,
  onOpenChange,
  idadeAtual,
  onIdadeAtualChange,
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

  const isDefault = 
    idadeAtual === DEFAULT_IDADE_ATUAL &&
    taxaAcumulo === DEFAULT_TAXA_ACUMULO && 
    taxaUsufruto === DEFAULT_TAXA_USUFRUTO;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurações da simulação</DialogTitle>
          <DialogDescription>
            Ajuste os parâmetros para personalizar a simulação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          {/* Idade atual */}
          <div className="space-y-1.5">
            <Label htmlFor="idade-atual" className="text-sm font-medium">
              Idade atual do cliente
            </Label>
            <div className="relative">
              <Input
                id="idade-atual"
                type="text"
                inputMode="numeric"
                value={idadeAtual}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  if (digits === "") {
                    onIdadeAtualChange(18);
                    return;
                  }
                  const num = parseInt(digits, 10);
                  onIdadeAtualChange(Math.min(90, num));
                }}
                onBlur={() => {
                  onIdadeAtualChange(Math.max(18, Math.min(90, idadeAtual)));
                }}
                className="pr-12 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                anos
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ponto de partida para a simulação.
            </p>
          </div>

          <Separator />

          {/* Seção de taxas */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Taxas de rentabilidade</p>

            {/* Taxa de acúmulo */}
            <div className="space-y-1.5">
              <Label htmlFor="taxa-acumulo" className="text-sm font-medium">
                Taxa anual na fase de acumulação
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
            </div>

            {/* Taxa de usufruto */}
            <div className="space-y-1.5">
              <Label htmlFor="taxa-usufruto" className="text-sm font-medium">
                Taxa anual após aposentadoria
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
            </div>
          </div>

          {/* Aviso informativo */}
          <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              As taxas padrão seguem uma visão conservadora do mercado. Consulte um especialista antes de alterá-las.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isDefault}
            className="sm:mr-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar padrões
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
