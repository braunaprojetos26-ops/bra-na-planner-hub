import { LayoutGrid, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  
  // Callbacks
  onFunnelChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onCampaignChange: (value: string) => void;
  onReferredByChange: (value: string) => void;
  onDirtyBaseChange: (value: string) => void;
  
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
  onFunnelChange,
  onStatusChange,
  onOwnerChange,
  onPeriodChange,
  onSourceChange,
  onCampaignChange,
  onReferredByChange,
  onDirtyBaseChange,
  viewMode,
  onViewModeChange,
}: PipelineFiltersProps) {
  const { data: planejadores } = usePlanejadores();
  const canViewPlanejadores = useCanViewPlanejadores();
  const { sources, campaigns, referrers } = useOpportunityFilterOptions(opportunities);

  // Count active filters (excluding funnel and status which are always shown)
  const activeFilterCount = [
    selectedPeriod !== 'all',
    selectedSource !== 'all',
    selectedCampaign !== 'all',
    selectedReferredBy !== 'all',
    selectedDirtyBase !== 'all',
    selectedOwnerId !== 'all',
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onPeriodChange('all');
    onSourceChange('all');
    onCampaignChange('all');
    onReferredByChange('all');
    onDirtyBaseChange('all');
    onOwnerChange('all');
  };

  return (
    <div className="space-y-3 mb-6">
      {/* First row */}
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

        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canViewPlanejadores && (
          <Select value={selectedOwnerId} onValueChange={onOwnerChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              <SelectItem value="unassigned">Sem responsável</SelectItem>
              {planejadores?.map(p => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 ml-auto">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="gap-1 text-muted-foreground"
            >
              <X className="h-3 w-3" />
              Limpar ({activeFilterCount})
            </Button>
          )}
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

      {/* Second row - additional filters */}
      <div className="flex flex-wrap items-center gap-3">
        {sources.length > 0 && (
          <Select value={selectedSource} onValueChange={onSourceChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {sources.map(source => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {campaigns.length > 0 && (
          <Select value={selectedCampaign} onValueChange={onCampaignChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign} value={campaign}>
                  {campaign}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {referrers.length > 0 && (
          <Select value={selectedReferredBy} onValueChange={onReferredByChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Indicado por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os indicadores</SelectItem>
              {referrers.map(referrer => (
                <SelectItem key={referrer.id} value={referrer.id}>
                  {referrer.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={selectedDirtyBase} onValueChange={onDirtyBaseChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Base" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as bases</SelectItem>
            <SelectItem value="clean">Base Limpa</SelectItem>
            <SelectItem value="dirty">Base Suja</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
