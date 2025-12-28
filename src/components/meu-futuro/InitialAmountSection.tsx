import { Wallet, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InitialAmountSectionProps {
  patrimonioInicial: number;
  onOpenModal: () => void;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function InitialAmountSection({
  patrimonioInicial,
  onOpenModal,
}: InitialAmountSectionProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30 mt-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Montante Inicial</p>
          {patrimonioInicial > 0 ? (
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(patrimonioInicial)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum valor definido</p>
          )}
        </div>
      </div>

      <Button
        variant={patrimonioInicial > 0 ? "outline" : "default"}
        size="sm"
        onClick={onOpenModal}
      >
        {patrimonioInicial > 0 ? (
          <>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Montante
          </>
        )}
      </Button>
    </div>
  );
}
