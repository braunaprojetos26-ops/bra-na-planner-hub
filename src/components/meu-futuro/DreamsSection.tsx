import { Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dream } from "@/types/dreams";
import { DreamCard } from "./DreamCard";

interface DreamsSectionProps {
  dreams: Dream[];
  onAddDream: () => void;
  onEditDream: (dream: Dream) => void;
  onDeleteDream: (id: string) => void;
}

export function DreamsSection({ 
  dreams, 
  onAddDream, 
  onEditDream, 
  onDeleteDream 
}: DreamsSectionProps) {
  const formatTotal = (dreams: Dream[]) => {
    const gastos = dreams.filter(d => !d.isPositive).reduce((acc, d) => acc + d.totalValue, 0);
    const aportes = dreams.filter(d => d.isPositive).reduce((acc, d) => acc + d.totalValue, 0);
    return { gastos, aportes };
  };

  const { gastos, aportes } = formatTotal(dreams);

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Meus Sonhos</h3>
          {dreams.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({dreams.length} objetivo{dreams.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>
        
        <Button variant="outline" size="sm" onClick={onAddDream}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Sonho
        </Button>
      </div>

      {dreams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg">
          <Sparkles className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm">
            Nenhum objetivo cadastrado
          </p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            Adicione sonhos para visualizar seu impacto no planejamento
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dreams.map((dream) => (
            <DreamCard
              key={dream.id}
              dream={dream}
              onEdit={onEditDream}
              onDelete={onDeleteDream}
            />
          ))}
          
          {/* Resumo */}
          <div className="flex justify-end gap-4 pt-3 border-t text-sm">
            {aportes > 0 && (
              <span className="text-emerald-500">
                Aportes: +{aportes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            )}
            {gastos > 0 && (
              <span className="text-orange-500">
                Gastos: -{gastos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
