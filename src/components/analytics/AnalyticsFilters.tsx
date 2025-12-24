import { useEffect } from 'react';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFunnels } from '@/hooks/useFunnels';
import { useProducts } from '@/hooks/useProducts';
import { useFunnelCategories } from '@/hooks/useFunnelCategories';
import { cn } from '@/lib/utils';

interface AnalyticsFiltersProps {
  startDate: Date;
  endDate: Date;
  funnelId: string | undefined;
  productId: string | undefined;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onFunnelChange: (funnelId: string | undefined) => void;
  onProductChange: (productId: string | undefined) => void;
}

const periodPresets = [
  { label: 'Últimos 7 dias', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Últimos 30 dias', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'Últimos 90 dias', getValue: () => ({ start: subDays(new Date(), 90), end: new Date() }) },
  { label: 'Este mês', getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'Este ano', getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) },
];

export function AnalyticsFilters({
  startDate,
  endDate,
  funnelId,
  productId,
  onStartDateChange,
  onEndDateChange,
  onFunnelChange,
  onProductChange,
}: AnalyticsFiltersProps) {
  const { data: funnels = [] } = useFunnels();
  const { data: products = [] } = useProducts();
  const { data: funnelCategoryIds = [] } = useFunnelCategories(funnelId);

  // Filter products based on funnel categories
  const filteredProducts = funnelCategoryIds.length > 0
    ? products.filter(p => p.category_id && funnelCategoryIds.includes(p.category_id))
    : products;

  // Set initial funnel to the first one (prospection) when funnels load
  useEffect(() => {
    if (funnels.length > 0 && !funnelId) {
      onFunnelChange(funnels[0].id);
    }
  }, [funnels, funnelId, onFunnelChange]);

  // Reset product when funnel changes if product no longer in filtered list
  useEffect(() => {
    if (productId && filteredProducts.length > 0) {
      const productInList = filteredProducts.some(p => p.id === productId);
      if (!productInList) {
        onProductChange(undefined);
      }
    }
  }, [funnelId, filteredProducts, productId, onProductChange]);

  const handlePresetClick = (preset: typeof periodPresets[0]) => {
    const { start, end } = preset.getValue();
    onStartDateChange(start);
    onEndDateChange(end);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filtros:</span>
      </div>

      {/* Period presets */}
      <div className="flex flex-wrap gap-1">
        {periodPresets.map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Date range */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => date && onStartDateChange(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground text-sm">até</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Fim"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => date && onEndDateChange(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Funnel filter - no "all" option */}
      <Select value={funnelId || ""} onValueChange={(v) => onFunnelChange(v || undefined)}>
        <SelectTrigger className="w-[200px] h-8">
          <SelectValue placeholder="Selecione um funil" />
        </SelectTrigger>
        <SelectContent>
          {funnels.map((funnel) => (
            <SelectItem key={funnel.id} value={funnel.id}>
              {funnel.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Product filter - shows products related to funnel categories */}
      <Select 
        value={productId || "all"} 
        onValueChange={(v) => onProductChange(v === "all" ? undefined : v)}
        disabled={filteredProducts.length === 0}
      >
        <SelectTrigger className="w-[200px] h-8">
          <SelectValue placeholder={filteredProducts.length === 0 ? "Sem produtos" : "Todos os produtos"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os produtos</SelectItem>
          {filteredProducts.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
