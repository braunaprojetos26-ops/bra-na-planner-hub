import { useState, useMemo } from 'react';
import { LayoutGrid, List, X, SlidersHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/date-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usePlanejadores, useCanViewPlanejadores } from '@/hooks/usePlanejadores';
import { useOpportunityFilterOptions } from '@/hooks/useOpportunityFilterOptions';
import { OpportunitySearchBox } from '@/components/opportunities/OpportunitySearchBox';
import type { Opportunity } from '@/types/opportunities';
import type { Funnel } from '@/types/contacts';

interface PipelineFiltersProps {
  opportunities: Opportunity[] | undefined;
  funnels: Funnel[] | undefined;
  
  // Filter values
  selectedFunnelId: string;
  selectedStatus: string;
  selectedOwnerId: string;
  selectedPeriod: string;
  selectedSource: string;
  selectedCampaign: string;
  selectedReferredBy: string;
  selectedDirtyBase: string;
  customDateStart: Date | undefined;
  customDateEnd: Date | undefined;
  
  // Callbacks
  onFunnelChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onCampaignChange: (value: string) => void;
  onReferredByChange: (value: string) => void;
  onDirtyBaseChange: (value: string) => void;
  onCustomDateStartChange: (date: Date | undefined) => void;
  onCustomDateEndChange: (date: Date | undefined) => void;
  
  // View mode
  viewMode: 'kanban' | 'list';
  onViewModeChange: (mode: 'kanban' | 'list') => void;
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

export function PipelineFilters({
  opportunities,
  funnels,
  selectedFunnelId,
  selectedStatus,
  selectedOwnerId,
  selectedPeriod,
  selectedSource,
  selectedCampaign,
  selectedReferredBy,
  selectedDirtyBase,
  customDateStart,
  customDateEnd,
  onFunnelChange,
  onStatusChange,
  onOwnerChange,
  onPeriodChange,
  onSourceChange,
  onCampaignChange,
  onReferredByChange,
  onDirtyBaseChange,
  onCustomDateStartChange,
  onCustomDateEndChange,
  viewMode,
  onViewModeChange,
}: PipelineFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: planejadores } = usePlanejadores();
  const canViewPlanejadores = useCanViewPlanejadores();
  const { sources, campaigns, referrers } = useOpportunityFilterOptions(opportunities);

  // Build active filters list for tags
  const activeFilters: { key: string; label: string }[] = [];

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

  if (selectedSource !== 'all') {
    activeFilters.push({ key: 'source', label: `Origem: ${selectedSource}` });
  }

  if (selectedOwnerId !== 'all') {
    if (selectedOwnerId === 'unassigned') {
      activeFilters.push({ key: 'owner', label: 'Sem responsável' });
    } else {
      const ownerName = planejadores?.find(p => p.user_id === selectedOwnerId)?.full_name || 'Responsável';
      activeFilters.push({ key: 'owner', label: `Responsável: ${ownerName}` });
    }
  }

  if (selectedCampaign !== 'all') {
    activeFilters.push({ key: 'campaign', label: `Campanha: ${selectedCampaign}` });
  }

  if (selectedReferredBy !== 'all') {
    const referrerName = referrers.find(r => r.id === selectedReferredBy)?.full_name || 'Indicador';
    activeFilters.push({ key: 'referredBy', label: `Indicado por: ${referrerName}` });
  }

  if (selectedDirtyBase !== 'all') {
    activeFilters.push({ key: 'dirtyBase', label: selectedDirtyBase === 'clean' ? 'Base Limpa' : 'Base Suja' });
  }

  const handleRemoveFilter = (key: string) => {
    switch (key) {
      case 'period':
        onPeriodChange('all');
        onCustomDateStartChange(undefined);
        onCustomDateEndChange(undefined);
        break;
      case 'source':
        onSourceChange('all');
        break;
      case 'owner':
        onOwnerChange('all');
        break;
      case 'campaign':
        onCampaignChange('all');
        break;
      case 'referredBy':
        onReferredByChange('all');
        break;
      case 'dirtyBase':
        onDirtyBaseChange('all');
        break;
    }
  };

  const handleClearAllFilters = () => {
    onPeriodChange('all');
    onSourceChange('all');
    onCampaignChange('all');
    onReferredByChange('all');
    onDirtyBaseChange('all');
    onOwnerChange('all');
    onCustomDateStartChange(undefined);
    onCustomDateEndChange(undefined);
  };

  return (
    <div className="space-y-3 mb-6">
      {/* Main filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <OpportunitySearchBox />
        
        <Select value={selectedFunnelId} onValueChange={onFunnelChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione um funil" />
          </SelectTrigger>
          <SelectContent>
            {funnels?.map(funnel => (
              <SelectItem key={funnel.id} value={funnel.id}>
                {funnel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Em andamento</SelectItem>
            <SelectItem value="won">Vendido</SelectItem>
            <SelectItem value="lost">Perdido</SelectItem>
          </SelectContent>
        </Select>

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

              {sources.length > 0 && (
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <SearchableSelect
                    value={selectedSource}
                    onValueChange={onSourceChange}
                    options={[
                      { value: 'all', label: 'Todas as origens' },
                      ...sources.map(source => ({ value: source, label: source }))
                    ]}
                    placeholder="Selecione a origem"
                    searchPlaceholder="Buscar origem..."
                  />
                </div>
              )}

              {canViewPlanejadores && (
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <SearchableSelect
                    value={selectedOwnerId}
                    onValueChange={onOwnerChange}
                    options={[
                      { value: 'all', label: 'Todos os responsáveis' },
                      { value: 'unassigned', label: 'Sem responsável' },
                      ...(planejadores?.map(p => ({ value: p.user_id, label: p.full_name })) || [])
                    ]}
                    placeholder="Selecione o responsável"
                    searchPlaceholder="Buscar responsável..."
                  />
                </div>
              )}

              {campaigns.length > 0 && (
                <div className="space-y-2">
                  <Label>Campanha</Label>
                  <SearchableSelect
                    value={selectedCampaign}
                    onValueChange={onCampaignChange}
                    options={[
                      { value: 'all', label: 'Todas as campanhas' },
                      ...campaigns.map(campaign => ({ value: campaign, label: campaign }))
                    ]}
                    placeholder="Selecione a campanha"
                    searchPlaceholder="Buscar campanha..."
                  />
                </div>
              )}

              {referrers.length > 0 && (
                <div className="space-y-2">
                  <Label>Indicado por</Label>
                  <SearchableSelect
                    value={selectedReferredBy}
                    onValueChange={onReferredByChange}
                    options={[
                      { value: 'all', label: 'Todos os indicadores' },
                      ...referrers.map(referrer => ({ value: referrer.id, label: referrer.full_name }))
                    ]}
                    placeholder="Selecione o indicador"
                    searchPlaceholder="Buscar indicador..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Base</Label>
                <SearchableSelect
                  value={selectedDirtyBase}
                  onValueChange={onDirtyBaseChange}
                  options={[
                    { value: 'all', label: 'Todas as bases' },
                    { value: 'clean', label: 'Base Limpa' },
                    { value: 'dirty', label: 'Base Suja' },
                  ]}
                  placeholder="Selecione o tipo de base"
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

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => onViewModeChange('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
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
