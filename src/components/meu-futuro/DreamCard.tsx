import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Plane, Car, Home, Users, Laptop, GraduationCap, 
  Dumbbell, Briefcase, Heart, Cloud, Target, PiggyBank,
  MoreVertical, Pencil, Trash2, TrendingUp, TrendingDown
} from "lucide-react";
import { Dream, DREAM_CATEGORIES, REPETITION_OPTIONS } from "@/types/dreams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plane, Car, Home, Users, Laptop, GraduationCap, 
  Dumbbell, Briefcase, Heart, Cloud, Target, PiggyBank,
};

interface DreamCardProps {
  dream: Dream;
  onEdit: (dream: Dream) => void;
  onDelete: (id: string) => void;
}

export function DreamCard({ dream, onEdit, onDelete }: DreamCardProps) {
  const category = DREAM_CATEGORIES.find((c) => c.value === dream.category);
  const IconComponent = category ? iconMap[category.icon] : Cloud;
  const repetition = REPETITION_OPTIONS.find((r) => r.value === dream.repetitionType);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-lg border bg-card",
      dream.isPositive ? "border-emerald-500/30" : "border-orange-500/30"
    )}>
      {/* Ícone */}
      <div className={cn(
        "flex items-center justify-center w-12 h-12 rounded-full shrink-0",
        dream.isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
      )}>
        {IconComponent && <IconComponent className="h-6 w-6" />}
      </div>

      {/* Informações */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground truncate">{dream.name}</h4>
          {dream.isPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : (
            <TrendingDown className="h-4 w-4 text-orange-500 shrink-0" />
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">
            {format(new Date(dream.realizationDate), "MMM/yyyy", { locale: ptBR })}
          </span>
          
          {dream.isInstallment && dream.installments && (
            <Badge variant="secondary" className="text-xs">
              {dream.installments}x
            </Badge>
          )}
          
          {dream.repetitionType !== "none" && dream.repetitionCount && (
            <Badge variant="outline" className="text-xs">
              {repetition?.label} ({dream.repetitionCount}x)
            </Badge>
          )}
        </div>
      </div>

      {/* Valor */}
      <div className="text-right shrink-0">
        <span className={cn(
          "font-semibold",
          dream.isPositive ? "text-emerald-500" : "text-orange-500"
        )}>
          {dream.isPositive ? "+" : "-"}{formatCurrency(dream.totalValue)}
        </span>
      </div>

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(dream)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete(dream.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
