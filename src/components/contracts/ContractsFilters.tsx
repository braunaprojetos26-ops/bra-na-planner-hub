import { useState } from 'react';
import { X, SlidersHorizontal, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/date-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';

interface ContractsFiltersProps {
  // Filter values
  selectedProductId: string;
  selectedPeriod: string;
  selectedStatus: string;
  selectedPaymentStatus: string;
  customDateStart: Date | undefined;
  customDateEnd: Date | undefined;
  
  // Callbacks
  onProductChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPaymentStatusChange: (value: string) => void;
  onCustomDateStartChange: (date: Date | undefined) => void;
  onCustomDateEndChange: (date: Date | undefined) => void;
  
  // Export
  onExport: () => void;
  isExporting?: boolean;
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todos os períodos' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Últimos 7 dias' },
  { value: 'month', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'this_year', label: 'Este ano' },
  { value: 'custom', label: 'Período personalizado' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'active', label: 'Ativo' },
  { value: 'cancelled', label: 'Cancelado' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'paid', label: 'Pago' },
  { value: 'pending', label: 'Aguardando' },
  { value: 'rejected', label: 'Rejeitado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function ContractsFilters({
  selectedProductId,
  selectedPeriod,
  selectedStatus,
  selectedPaymentStatus,
  customDateStart,
  customDateEnd,
  onProductChange,
  onPeriodChange,
  onStatusChange,
  onPaymentStatusChange,
  onCustomDateStartChange,
  onCustomDateEndChange,
  onExport,
  isExporting,
}: ContractsFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: products } = useProducts();
  const { role } = useAuth();
  
  const canExport = role === 'superadmin' || role === 'gerente';

  // Build active filters list for tags
  const activeFilters: { key: string; label: string }[] = [];

  if (selectedProductId !== 'all') {
    const productName = products?.find(p => p.id === selectedProductId)?.name || 'Produto';
    activeFilters.push({ key: 'product', label: `Produto: ${productName}` });
  }

  if (selectedPeriod !== 'all') {
    if (selectedPeriod === 'custom' && (customDateStart || customDateEnd)) {
      const startStr = customDateStart ? format(customDateStart, 'dd/MM/yyyy', { locale: ptBR }) : '...';
      const endStr = customDateEnd ? format(customDateEnd, 'dd/MM/yyyy', { locale: ptBR }) : '...';
      activeFilters.push({ key: 'period', label: `${startStr} - ${endStr}` });
    } else {
      const periodLabel = PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.label || selectedPeriod;
      activeFilters.push({ key: 'period', label: periodLabel });
    }
  }

  if (selectedStatus !== 'all') {
    const statusLabel = STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label || selectedStatus;
    activeFilters.push({ key: 'status', label: `Status: ${statusLabel}` });
  }

  if (selectedPaymentStatus !== 'all') {
    const paymentLabel = PAYMENT_STATUS_OPTIONS.find(p => p.value === selectedPaymentStatus)?.label || selectedPaymentStatus;
    activeFilters.push({ key: 'paymentStatus', label: `Pagamento: ${paymentLabel}` });
  }

  const handleRemoveFilter = (key: string) => {
    switch (key) {
      case 'product':
        onProductChange('all');
        break;
      case 'period':
        onPeriodChange('all');
        onCustomDateStartChange(undefined);
        onCustomDateEndChange(undefined);
        break;
      case 'status':
        onStatusChange('all');
        break;
      case 'paymentStatus':
        onPaymentStatusChange('all');
        break;
    }
  };

  const handleClearAllFilters = () => {
    onProductChange('all');
    onPeriodChange('all');
    onStatusChange('all');
    onPaymentStatusChange('all');
    onCustomDateStartChange(undefined);
    onCustomDateEndChange(undefined);
  };

  return (
    <div className="space-y-3">
      {/* Main filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Product filter */}
        <SearchableSelect
          value={selectedProductId}
          onValueChange={onProductChange}
          options={[
            { value: 'all', label: 'Todos os produtos' },
            ...(products?.map(p => ({ value: p.id, label: p.name })) || [])
          ]}
          placeholder="Produto"
          searchPlaceholder="Buscar produto..."
          className="w-[200px]"
        />

        {/* Status filter */}
        <SearchableSelect
          value={selectedStatus}
          onValueChange={onStatusChange}
          options={STATUS_OPTIONS}
          placeholder="Status"
          searchPlaceholder="Buscar status..."
          className="w-[160px]"
        />

        {/* Advanced Filters Popover */}
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 max-h-[70vh]" align="start" side="bottom" sideOffset={8}>
            <ScrollArea className="h-full max-h-[70vh] p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <SearchableSelect
                    value={selectedPeriod}
                    onValueChange={onPeriodChange}
                    options={PERIOD_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                    placeholder="Selecione o período"
                    searchPlaceholder="Buscar período..."
                  />
                  
                  {selectedPeriod === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Data início</Label>
                        <DateInput
                          value={customDateStart}
                          onChange={onCustomDateStartChange}
                          placeholder="DD/MM/AAAA"
                          toYear={new Date().getFullYear()}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Data fim</Label>
                        <DateInput
                          value={customDateEnd}
                          onChange={onCustomDateEndChange}
                          placeholder="DD/MM/AAAA"
                          toYear={new Date().getFullYear()}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Status de Pagamento</Label>
                  <SearchableSelect
                    value={selectedPaymentStatus}
                    onValueChange={onPaymentStatusChange}
                    options={PAYMENT_STATUS_OPTIONS}
                    placeholder="Status de pagamento"
                    searchPlaceholder="Buscar..."
                  />
                </div>

                {activeFilters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllFilters}
                    className="w-full text-muted-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar todos os filtros
                  </Button>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Export button - visible only for admins */}
        {canExport && (
          <Button
            variant="outline"
            className="gap-2 ml-auto"
            onClick={onExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        )}
      </div>

      {/* Active filter tags */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {activeFilters.map(filter => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
            >
              {filter.label}
              <button
                onClick={() => handleRemoveFilter(filter.key)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAllFilters}
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            Limpar todos
          </Button>
        </div>
      )}
    </div>
  );
}
