import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInHours } from 'date-fns';
import { User, AlertTriangle, Plus, Star, LayoutGrid, List, Banknote } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFunnels, useFunnelStages } from '@/hooks/useFunnels';
import { useOpportunities, useMoveOpportunityStage } from '@/hooks/useOpportunities';
import { usePlanejadores, useCanViewPlanejadores } from '@/hooks/usePlanejadores';
import { useActingUser } from '@/contexts/ActingUserContext';
import { NewOpportunityModal } from '@/components/opportunities/NewOpportunityModal';
import { OpportunitiesListView } from '@/components/opportunities/OpportunitiesListView';
import { ProposalValueModal } from '@/components/opportunities/ProposalValueModal';
import { movingToProposalStage } from '@/lib/proposalStageValidation';
import type { Opportunity } from '@/types/opportunities';
import type { FunnelStage } from '@/types/contacts';

const stageColors: Record<string, string> = {
  slate: 'bg-slate-100 border-slate-300',
  blue: 'bg-blue-50 border-blue-300',
  cyan: 'bg-cyan-50 border-cyan-300',
  green: 'bg-green-50 border-green-300',
  yellow: 'bg-yellow-50 border-yellow-300',
  orange: 'bg-orange-50 border-orange-300',
  purple: 'bg-purple-50 border-purple-300',
  gray: 'bg-gray-100 border-gray-300',
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
  const { data: planejadores } = usePlanejadores();
  const canViewPlanejadores = useCanViewPlanejadores();
  const moveStage = useMoveOpportunityStage();

  // Disable editing when impersonating
  const isReadOnly = isImpersonating;

  // Auto-select first funnel
  useMemo(() => {
    if (funnels?.length && !selectedFunnelId) {
      setSelectedFunnelId(funnels[0].id);
    }
  }, [funnels, selectedFunnelId]);

  // Filter opportunities by status and owner
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
    
    return filtered;
  }, [opportunities, selectedStatus, selectedOwnerId]);

  // Separate active and lost opportunities from filtered list
  const activeOpportunities = useMemo(() => 
    filteredOpportunities.filter(o => o.status === 'active'), 
    [filteredOpportunities]
  );
  
  const lostOpportunities = useMemo(() => 
    filteredOpportunities.filter(o => o.status === 'lost'), 
    [filteredOpportunities]
  );

  // Group opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<string, Opportunity[]> = {};
    stages?.forEach(stage => {
      grouped[stage.id] = activeOpportunities.filter(o => o.current_stage_id === stage.id);
    });
    return grouped;
  }, [stages, activeOpportunities]);

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
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
          <SelectTrigger className="w-[200px]">
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

        {canViewPlanejadores && (
          <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
            <SelectTrigger className="w-[200px]">
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

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Em andamento</SelectItem>
            <SelectItem value="won">Vendido</SelectItem>
            <SelectItem value="lost">Perdido</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
        <div className="flex gap-4 h-[calc(100%-5rem)] overflow-x-auto pb-4">
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
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {opportunitiesByStage[stage.id]?.length || 0}
                  </Badge>
                </div>
              </div>

              {/* Opportunities */}
              <ScrollArea className={`flex-1 rounded-b-lg border-2 border-t-0 ${stageColors[stage.color] || stageColors.gray}`}>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {opportunitiesByStage[stage.id]?.map(opportunity => {
                    const slaStatus = getSlaStatus(opportunity, stage);
                    return (
                      <Card
                        key={opportunity.id}
                        className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
                          slaStatus === 'overdue' ? 'ring-2 ring-destructive' : 
                          slaStatus === 'warning' ? 'ring-2 ring-warning' : ''
                        }`}
                        draggable={!isReadOnly}
                        onDragStart={e => handleDragStart(e, opportunity.id)}
                        onClick={() => navigate(`/pipeline/${opportunity.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm line-clamp-1">
                            {opportunity.contact?.full_name}
                          </p>
                          {opportunity.contact?.owner_id === null && (
                            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            {opportunity.qualification ? (
                              <div className="flex items-center gap-0.5">
                                <span>{opportunity.qualification}</span>
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              </div>
                            ) : null}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <User className="w-3.5 h-3.5 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{opportunity.contact?.owner?.full_name || 'Sem responsável'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          {opportunity.proposal_value ? (
                            <div className="flex items-center gap-1 text-accent font-medium">
                              <Banknote className="w-3.5 h-3.5" />
                              <span>
                                {new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL',
                                  notation: 'compact',
                                  maximumFractionDigits: 1
                                }).format(opportunity.proposal_value)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </Card>
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
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {lostOpportunities.length}
                  </Badge>
                </div>
              </div>

              <ScrollArea className="flex-1 rounded-b-lg border-2 border-t-0 border-destructive/30 bg-destructive/5">
                <div className="p-2 space-y-2 min-h-[200px]">
                  {lostOpportunities.map(opportunity => (
                    <Card
                      key={opportunity.id}
                      className="p-3 cursor-pointer hover:shadow-md transition-shadow opacity-80"
                      onClick={() => navigate(`/pipeline/${opportunity.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm line-clamp-1">
                          {opportunity.contact?.full_name}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          {opportunity.qualification && (
                            <div className="flex items-center gap-1">
                              <span>{opportunity.qualification}</span>
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            </div>
                          )}
                          {opportunity.lost_reason && (
                            <span className="text-destructive">{opportunity.lost_reason.name}</span>
                          )}
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <User className="w-4 h-4 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{opportunity.contact?.owner?.full_name || 'Sem responsável'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </Card>
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
