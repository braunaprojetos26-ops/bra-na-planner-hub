import { useState } from "react";
import { Pencil, Link2 } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InitialAmountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValue: number;
  onConfirm: (value: number) => void;
}

export function InitialAmountModal({
  open,
  onOpenChange,
  currentValue,
  onConfirm,
}: InitialAmountModalProps) {
  const [selectedOption, setSelectedOption] = useState<"manual" | "connect" | null>(
    currentValue > 0 ? "manual" : null
  );
  const [valorManual, setValorManual] = useState(
    currentValue > 0 ? currentValue.toString() : ""
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setValorManual(raw);
  };

  const formatInputDisplay = (value: string) => {
    if (!value) return "";
    const num = parseInt(value, 10);
    return num.toLocaleString("pt-BR");
  };

  const handleConfirm = () => {
    const numValue = parseInt(valorManual, 10) || 0;
    onConfirm(numValue);
    onOpenChange(false);
  };

  const handleRemove = () => {
    onConfirm(0);
    setValorManual("");
    setSelectedOption(null);
    onOpenChange(false);
  };

  const isValid = selectedOption === "manual" && valorManual && parseInt(valorManual, 10) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Definir Montante Inicial</DialogTitle>
          <DialogDescription>
            Informe o patrimônio inicial do cliente para a simulação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Opção 1: Manual */}
          <Card
            onClick={() => setSelectedOption("manual")}
            className={cn(
              "cursor-pointer transition-colors hover:border-primary/50",
              selectedOption === "manual" && "border-primary bg-primary/5"
            )}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Pencil className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Definir manualmente</p>
                <p className="text-sm text-muted-foreground">
                  Digite o valor do patrimônio atual do cliente
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Campo de input quando manual selecionado */}
          {selectedOption === "manual" && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/30 ml-4">
              <Label htmlFor="valor-inicial">Valor do patrimônio inicial</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  R$
                </span>
                <Input
                  id="valor-inicial"
                  placeholder="0"
                  value={formatInputDisplay(valorManual)}
                  onChange={handleInputChange}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Opção 2: Conectar dados (futuro) */}
          <Card className="opacity-60 cursor-not-allowed relative">
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                Em breve
              </Badge>
            </div>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Link2 className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-muted-foreground">
                  Conectar com dados existentes
                </p>
                <p className="text-sm text-muted-foreground">
                  Importar automaticamente o patrimônio da XP, BTG e outras corretoras
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentValue > 0 && (
            <Button
              variant="destructive"
              onClick={handleRemove}
              className="sm:mr-auto"
            >
              Remover
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
