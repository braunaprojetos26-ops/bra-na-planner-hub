import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInHours, differenceInDays, isToday, startOfMonth, startOfYear, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFunnels, useFunnelStages } from '@/hooks/useFunnels';
import { useOpportunities, useMoveOpportunityStage } from '@/hooks/useOpportunities';
import { useActingUser } from '@/contexts/ActingUserContext';
import { NewOpportunityModal } from '@/components/opportunities/NewOpportunityModal';
import { OpportunitiesListView } from '@/components/opportunities/OpportunitiesListView';
import { ProposalValueModal } from '@/components/opportunities/ProposalValueModal';
import { PipelineFilters } from '@/components/opportunities/PipelineFilters';
import { OpportunityKanbanCard } from '@/components/opportunities/OpportunityKanbanCard';
import { movingToProposalStage } from '@/lib/proposalStageValidation';
import type { Opportunity } from '@/types/opportunities';
import type { FunnelStage } from '@/types/contacts';

const stageColors: Record<string, string> = {
  slate: 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600',
  blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  cyan: 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700',
  green: 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
  orange: 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  purple: 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
  gray: 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600',
};

const stageHeaderColors: Record<string, string> = {
  slate: 'bg-slate-500',
  blue: 'bg-blue-500',
  cyan: 'bg-cyan-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-500',
};

export default function Pipeline() {
  const navigate = useNavigate();
  const { isImpersonating } = useActingUser();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showNewOpportunityModal, setShowNewOpportunityModal] = useState(false);
  const [draggedOpportunityId, setDraggedOpportunityId] = useState<string | null>(null);
  
  // New filter states
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedReferredBy, setSelectedReferredBy] = useState<string>('all');
  const [selectedDirtyBase, setSelectedDirtyBase] = useState<string>('all');
  
  // Custom date range states
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  
  // State for proposal value modal
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [pendingStageMove, setPendingStageMove] = useState<{
    opportunityId: string;
    fromStageId: string;
    toStageId: string;
    stageName: string;
  } | null>(null);

  const { data: funnels, isLoading: funnelsLoading } = useFunnels();
  const { data: stages } = useFunnelStages(selectedFunnelId);
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities(selectedFunnelId);
  const moveStage = useMoveOpportunityStage();

  // Disable editing when impersonating
  const isReadOnly = isImpersonating;

  // Auto-select first funnel
  useMemo(() => {
    if (funnels?.length && !selectedFunnelId) {
      setSelectedFunnelId(funnels[0].id);
    }
  }, [funnels, selectedFunnelId]);

  // Helper function for period filtering
  const matchesPeriod = (createdAt: string, period: string): boolean => {
    const date = new Date(createdAt);
    const now = new Date();
    
    switch (period) {
      case 'today':
        return isToday(date);
      case 'week':
        return differenceInDays(now, date) <= 7;
      case 'month':
        return differenceInDays(now, date) <= 30;
      case 'this_month':
        return date >= startOfMonth(now);
      case 'this_year':
        return date >= startOfYear(now);
      case 'custom':
        // Custom date range filtering
        if (customDateStart && customDateEnd) {
          return isWithinInterval(date, {
            start: startOfDay(customDateStart),
            end: endOfDay(customDateEnd),
          });
        } else if (customDateStart) {
          return date >= startOfDay(customDateStart);
        } else if (customDateEnd) {
          return date <= endOfDay(customDateEnd);
        }
        return true;
      default:
        return true;
    }
  };

  // Filter opportunities by all criteria
  const filteredOpportunities = useMemo(() => {
    let filtered = opportunities || [];
    
    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(o => o.status === selectedStatus);
    }
    
    // Filter by owner
    if (selectedOwnerId !== 'all') {
      if (selectedOwnerId === 'unassigned') {
        filtered = filtered.filter(o => o.contact?.owner_id === null);
      } else {
        filtered = filtered.filter(o => o.contact?.owner_id === selectedOwnerId);
      }
    }
    
    // Filter by period
    if (selectedPeriod !== 'all') {
      filtered = filtered.filter(o => matchesPeriod(o.created_at, selectedPeriod));
    }
    
    // Filter by source
    if (selectedSource !== 'all') {
      filtered = filtered.filter(o => o.contact?.source === selectedSource);
    }
    
    // Filter by campaign
    if (selectedCampaign !== 'all') {
      filtered = filtered.filter(o => o.contact?.campaign === selectedCampaign);
    }
    
    // Filter by referred_by
    if (selectedReferredBy !== 'all') {
      filtered = filtered.filter(o => o.contact?.referred_by === selectedReferredBy);
    }
    
    // Filter by dirty base
    if (selectedDirtyBase !== 'all') {
      const isDirty = selectedDirtyBase === 'dirty';
      filtered = filtered.filter(o => o.contact?.is_dirty_base === isDirty);
    }
    
    return filtered;
  }, [opportunities, selectedStatus, selectedOwnerId, selectedPeriod, selectedSource, selectedCampaign, selectedReferredBy, selectedDirtyBase, customDateStart, customDateEnd]);

  // Separate active, won and lost opportunities from filtered list
  const activeAndWonOpportunities = useMemo(() => 
    filteredOpportunities.filter(o => o.status === 'active' || o.status === 'won'), 
    [filteredOpportunities]
  );
  
  const lostOpportunities = useMemo(() => 
    filteredOpportunities.filter(o => o.status === 'lost'), 
    [filteredOpportunities]
  );

  // Group opportunities by stage (include active and won)
  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<string, Opportunity[]> = {};
    stages?.forEach(stage => {
      grouped[stage.id] = activeAndWonOpportunities.filter(o => o.current_stage_id === stage.id);
    });
    return grouped;
  }, [stages, activeAndWonOpportunities]);

  const handleDragStart = (e: React.DragEvent, opportunityId: string) => {
    if (isReadOnly) {
      e.preventDefault();
      return;
    }
    setDraggedOpportunityId(opportunityId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    if (!draggedOpportunityId || !stages) return;

    const opportunity = opportunities?.find(o => o.id === draggedOpportunityId);
    if (!opportunity || opportunity.current_stage_id === toStageId) {
      setDraggedOpportunityId(null);
      return;
    }

    const toStage = stages.find(s => s.id === toStageId);

    // Check if moving to a stage that requires proposal value
    const needsProposalValue = movingToProposalStage(toStageId, selectedFunnelId, stages);
    const hasProposalValue = opportunity.proposal_value != null && opportunity.proposal_value > 0;

    if (needsProposalValue && !hasProposalValue) {
      // Show modal to capture proposal value
      setPendingStageMove({
        opportunityId: draggedOpportunityId,
        fromStageId: opportunity.current_stage_id,
        toStageId,
        stageName: toStage?.name || 'Proposta Feita',
      });
      setShowProposalModal(true);
      setDraggedOpportunityId(null);
      return;
    }

    await moveStage.mutateAsync({
      opportunityId: draggedOpportunityId,
      fromStageId: opportunity.current_stage_id,
      toStageId,
    });

    setDraggedOpportunityId(null);
  };

  const handleProposalValueConfirm = async (proposalValue: number) => {
    if (!pendingStageMove) return;

    await moveStage.mutateAsync({
      opportunityId: pendingStageMove.opportunityId,
      fromStageId: pendingStageMove.fromStageId,
      toStageId: pendingStageMove.toStageId,
      proposalValue,
    });

    setShowProposalModal(false);
    setPendingStageMove(null);
  };

  const getSlaStatus = (opportunity: Opportunity, stage: FunnelStage) => {
    if (!stage.sla_hours) return null;
    const hours = differenceInHours(new Date(), new Date(opportunity.stage_entered_at));
    if (hours > stage.sla_hours) return 'overdue';
    if (hours > stage.sla_hours * 0.8) return 'warning';
    return 'ok';
  };

  if (funnelsLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Carregando funis...</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Negociações</h1>
        {!isReadOnly && (
          <Button onClick={() => setShowNewOpportunityModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Negociação
          </Button>
        )}
      </div>

      {/* Filters */}
      <PipelineFilters
        opportunities={opportunities}
        funnels={funnels}
        selectedFunnelId={selectedFunnelId}
        selectedStatus={selectedStatus}
        selectedOwnerId={selectedOwnerId}
        selectedPeriod={selectedPeriod}
        selectedSource={selectedSource}
        selectedCampaign={selectedCampaign}
        selectedReferredBy={selectedReferredBy}
        selectedDirtyBase={selectedDirtyBase}
        customDateStart={customDateStart}
        customDateEnd={customDateEnd}
        onFunnelChange={setSelectedFunnelId}
        onStatusChange={setSelectedStatus}
        onOwnerChange={setSelectedOwnerId}
        onPeriodChange={setSelectedPeriod}
        onSourceChange={setSelectedSource}
        onCampaignChange={setSelectedCampaign}
        onReferredByChange={setSelectedReferredBy}
        onDirtyBaseChange={setSelectedDirtyBase}
        onCustomDateStartChange={setCustomDateStart}
        onCustomDateEndChange={setCustomDateEnd}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {!selectedFunnelId ? (
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Selecione um funil para visualizar</p>
        </div>
      ) : opportunitiesLoading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Carregando oportunidades...</p>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <OpportunitiesListView opportunities={filteredOpportunities} />
      ) : (
        /* Kanban View */
        <div className="flex gap-4 flex-1 overflow-x-auto overflow-y-hidden pb-4">
          {/* Stage Columns */}
          {stages?.map(stage => (
            <div
              key={stage.id}
              className="flex-shrink-0 w-72 flex flex-col"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, stage.id)}
            >
              {/* Stage Header */}
              <div className={`rounded-t-lg px-3 py-2 ${stageHeaderColors[stage.color] || stageHeaderColors.gray}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white text-sm">{stage.name}</span>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    {(opportunitiesByStage[stage.id]?.reduce((sum, o) => sum + (o.proposal_value || 0), 0) || 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Badge>
                </div>
              </div>

              {/* Opportunities */}
              <ScrollArea className={`flex-1 rounded-b-lg border-2 border-t-0 ${stageColors[stage.color] || stageColors.gray}`}>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {opportunitiesByStage[stage.id]?.map(opportunity => {
                    const slaStatus = getSlaStatus(opportunity, stage);
                    return (
                      <OpportunityKanbanCard
                        key={opportunity.id}
                        opportunity={opportunity}
                        slaStatus={slaStatus}
                        isReadOnly={isReadOnly}
                        onDragStart={handleDragStart}
                      />
                    );
                  })}

                  {opportunitiesByStage[stage.id]?.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                      Nenhuma oportunidade
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ))}

          {/* Lost Column */}
          {lostOpportunities.length > 0 && (
            <div className="flex-shrink-0 w-72 flex flex-col">
              <div className="rounded-t-lg px-3 py-2 bg-destructive">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white text-sm">Perdidas</span>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    {lostOpportunities.reduce((sum, o) => sum + (o.proposal_value || 0), 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Badge>
                </div>
              </div>

              <ScrollArea className="flex-1 rounded-b-lg border-2 border-t-0 border-destructive/30 bg-destructive/5">
                <div className="p-2 space-y-2 min-h-[200px]">
                  {lostOpportunities.map(opportunity => (
                    <OpportunityKanbanCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      slaStatus={null}
                      isReadOnly={true}
                      onDragStart={() => {}}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      <NewOpportunityModal
        open={showNewOpportunityModal}
        onOpenChange={setShowNewOpportunityModal}
        defaultFunnelId={selectedFunnelId}
      />

      <ProposalValueModal
        open={showProposalModal}
        onOpenChange={(open) => {
          setShowProposalModal(open);
          if (!open) setPendingStageMove(null);
        }}
        onConfirm={handleProposalValueConfirm}
        isLoading={moveStage.isPending}
        stageName={pendingStageMove?.stageName}
      />
    </div>
  );
}
