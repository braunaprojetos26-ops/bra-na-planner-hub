import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAllActiveUsers } from "@/hooks/useAllActiveUsers";

interface ChurnFiltersProps {
  filters: {
    startDate?: Date;
    endDate?: Date;
    ownerId?: string;
    planType?: string;
  };
  onFiltersChange: (filters: {
    startDate?: Date;
    endDate?: Date;
    ownerId?: string;
    planType?: string;
  }) => void;
}

const periodOptions = [
  { label: "Últimos 30 dias", value: "30d" },
  { label: "Últimos 3 meses", value: "3m" },
  { label: "Últimos 6 meses", value: "6m" },
  { label: "Último ano", value: "1y" },
  { label: "Todo período", value: "all" },
  { label: "Personalizado", value: "custom" },
];

const planTypeOptions = [
  { label: "Todos os planos", value: "all" },
  { label: "4 reuniões", value: "4" },
  { label: "6 reuniões", value: "6" },
  { label: "9 reuniões", value: "9" },
  { label: "12 reuniões", value: "12" },
];

export function ChurnFilters({ filters, onFiltersChange }: ChurnFiltersProps) {
  const [period, setPeriod] = useState("6m");
  const { data: users } = useAllActiveUsers();

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = now;

    switch (value) {
      case "30d":
        startDate = subMonths(now, 1);
        break;
      case "3m":
        startDate = subMonths(now, 3);
        break;
      case "6m":
        startDate = subMonths(now, 6);
        break;
      case "1y":
        startDate = subMonths(now, 12);
        break;
      case "all":
        startDate = undefined;
        endDate = undefined;
        break;
      case "custom":
        return;
    }

    onFiltersChange({ ...filters, startDate, endDate });
  };

  const handleOwnerChange = (value: string) => {
    onFiltersChange({
      ...filters,
      ownerId: value === "all" ? undefined : value,
    });
  };

  const handlePlanTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      planType: value === "all" ? undefined : value,
    });
  };

  const clearFilters = () => {
    setPeriod("6m");
    const now = new Date();
    onFiltersChange({
      startDate: subMonths(now, 6),
      endDate: now,
      ownerId: undefined,
      planType: undefined,
    });
  };

  const hasActiveFilters = filters.ownerId || filters.planType || period === "custom";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[180px]">
          <CalendarIcon className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                {filters.startDate ? format(filters.startDate, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.startDate}
                onSelect={(date) => onFiltersChange({ ...filters, startDate: date })}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                {filters.endDate ? format(filters.endDate, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.endDate}
                onSelect={(date) => onFiltersChange({ ...filters, endDate: date })}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Select value={filters.ownerId || "all"} onValueChange={handleOwnerChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Planejador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os planejadores</SelectItem>
          {users?.map((user) => (
            <SelectItem key={user.user_id} value={user.user_id}>
              {user.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.planType || "all"} onValueChange={handlePlanTypeChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Tipo de plano" />
        </SelectTrigger>
        <SelectContent>
          {planTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
