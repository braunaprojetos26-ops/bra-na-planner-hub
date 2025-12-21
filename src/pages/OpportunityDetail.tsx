import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Phone, Mail, User, History, MessageSquare, RotateCcw, XCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useOpportunity, useOpportunityHistory, useMarkOpportunityWon } from '@/hooks/useOpportunities';
import { useFunnelStages, useNextFunnelFirstStage } from '@/hooks/useFunnels';
import { FunnelStagesProgress } from '@/components/opportunities/FunnelStagesProgress';
import { MarkLostModal } from '@/components/opportunities/MarkLostModal';
import { ReactivateOpportunityModal } from '@/components/opportunities/ReactivateOpportunityModal';
import { OpportunityMeetingsSection } from '@/components/opportunities/OpportunityMeetingsSection';
import { useActingUser } from '@/contexts/ActingUserContext';

const temperatureColors: Record<string, string> = {
  cold: 'bg-blue-100 text-blue-800',
  warm: 'bg-yellow-100 text-yellow-800',
  hot: 'bg-red-100 text-red-800',
};

const temperatureLabels: Record<string, string> = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente',
};

const statusLabels: Record<string, string> = {
  active: 'Em Andamento',
  won: 'Vendida',
  lost: 'Perdida',
};

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

const formatDateTime = (date: string | null | undefined) => {
  if (!date) return '-';
  try {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '-';
  }
};

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    created: 'Oportunidade criada',
    stage_change: 'Movida de etapa',
    lost: 'Marcada como perdida',
    won: 'Marcada como ganha',
    reactivated: 'Reativada',
  };
  return labels[action] || action;
};

const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col py-0.5 border-b border-border/50 last:border-0">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className="text-xs font-medium">{value || '-'}</span>
  </div>
);

export default function OpportunityDetail() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const navigate = useNavigate();
  const { isImpersonating } = useActingUser();
  const isReadOnly = isImpersonating;
  
  const [showLostModal, setShowLostModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: opportunity, isLoading: opportunityLoading } = useOpportunity(opportunityId || '');
  const { data: history, isLoading: historyLoading } = useOpportunityHistory(opportunityId || '');
  const { data: stages } = useFunnelStages(opportunity?.current_funnel_id);
  const { nextFunnel, firstStage: nextFirstStage } = useNextFunnelFirstStage(opportunity?.current_funnel_id || '');
  const markWon = useMarkOpportunityWon();

  const handleMarkWon = async () => {
    if (!opportunity || !nextFunnel || !nextFirstStage) return;

    await markWon.mutateAsync({
      opportunityId: opportunity.id,
      fromStageId: opportunity.current_stage_id,
      nextFunnelId: nextFunnel.id,
      nextStageId: nextFirstStage.id,
    });
    
    navigate('/pipeline');
  };

  if (opportunityLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Carregando negociação...</p>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">Negociação não encontrada</p>
        <Button variant="outline" onClick={() => navigate('/pipeline')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Negociações
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pipeline')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-accent">{opportunity.contact?.full_name}</h1>
            <p className="text-xs text-muted-foreground">
              {opportunity.current_funnel?.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${statusColors[opportunity.status]} text-xs`}>
                {statusLabels[opportunity.status]}
              </Badge>
              {opportunity.temperature && (
                <Badge className={`${temperatureColors[opportunity.temperature]} text-xs`}>
                  {temperatureLabels[opportunity.temperature]}
                </Badge>
              )}
              {opportunity.qualification && (
                <span className="text-yellow-500 text-sm">
                  {'⭐'.repeat(opportunity.qualification)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isReadOnly && opportunity.status === 'active' && (
            <>
              <Button size="sm" variant="destructive" onClick={() => setShowLostModal(true)}>
                <XCircle className="w-3 h-3 mr-1.5" />
                Marcar Perda
              </Button>
              {nextFunnel && (
                <Button size="sm" onClick={handleMarkWon} disabled={markWon.isPending}>
                  <CheckCircle className="w-3 h-3 mr-1.5" />
                  {markWon.isPending ? 'Processando...' : 'Marcar Venda'}
                </Button>
              )}
            </>
          )}
          {!isReadOnly && opportunity.status === 'lost' && (
            <Button size="sm" variant="outline" onClick={() => setShowReactivateModal(true)}>
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Reativar
            </Button>
          )}
        </div>
      </div>

      {/* Funnel Stages Progress */}
      {stages && stages.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <FunnelStagesProgress
              stages={stages}
              currentStageId={opportunity.current_stage_id}
              stageEnteredAt={opportunity.stage_entered_at}
            />
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Contact Info Card */}
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <User className="w-3 h-3 text-accent" />
              Informações do Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 pb-3">
            <InfoItem label="Nome" value={opportunity.contact?.full_name} />
            <InfoItem 
              label="Telefone" 
              value={
                <a href={`tel:${opportunity.contact?.phone}`} className="text-accent hover:underline">
                  {formatPhone(opportunity.contact?.phone)}
                </a>
              } 
            />
            <InfoItem 
              label="E-mail" 
              value={
                opportunity.contact?.email ? (
                  <a href={`mailto:${opportunity.contact?.email}`} className="text-accent hover:underline">
                    {opportunity.contact?.email}
                  </a>
                ) : '-'
              } 
            />
            <InfoItem label="Responsável" value={opportunity.contact?.owner?.full_name || 'Não atribuído'} />
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-accent" />
              Anotações
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {opportunity.notes ? (
              <div className="bg-secondary/50 rounded-md p-2">
                <pre className="text-xs whitespace-pre-wrap font-sans">{opportunity.notes}</pre>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma anotação</p>
            )}
          </CardContent>
        </Card>

        {/* Meetings Section */}
        <OpportunityMeetingsSection
          opportunityId={opportunity.id}
          contactId={opportunity.contact_id}
          contactName={opportunity.contact?.full_name || ''}
          isReadOnly={isReadOnly}
        />
      </div>

      {/* Lost Reason */}
      {opportunity.status === 'lost' && opportunity.lost_reason && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm flex items-center gap-1.5 text-destructive">
              <XCircle className="w-3 h-3" />
              Motivo da Perda
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="font-medium text-sm">{opportunity.lost_reason.name}</p>
            {opportunity.lost_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Perdida em {formatDateTime(opportunity.lost_at)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* History Section */}
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <History className="w-3 h-3 text-accent" />
            Histórico
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {historyLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : !history?.length ? (
            <p className="text-xs text-muted-foreground">Nenhum histórico registrado</p>
          ) : (
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              {/* Always show the last entry */}
              <div className="flex items-start gap-2 p-2 bg-secondary/50 rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{getActionLabel(history[0].action)}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateTime(history[0].created_at)}
                    </span>
                  </div>
                  {history[0].from_stage && history[0].to_stage && (
                    <p className="text-[10px] text-muted-foreground">
                      {history[0].from_stage.name} → {history[0].to_stage.name}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Por: {history[0].changed_by_profile?.full_name || '-'}
                  </p>
                  {history[0].notes && (
                    <p className="text-xs mt-0.5 italic">{history[0].notes}</p>
                  )}
                </div>
              </div>

              {/* Collapsible content with remaining entries */}
              {history.length > 1 && (
                <>
                  <CollapsibleContent className="space-y-1.5 mt-1.5">
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto scrollbar-thin">
                      {history.slice(1).map((entry) => (
                        <div key={entry.id} className="flex items-start gap-2 p-2 bg-secondary/50 rounded-md">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium">{getActionLabel(entry.action)}</p>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDateTime(entry.created_at)}
                              </span>
                            </div>
                            {entry.from_stage && entry.to_stage && (
                              <p className="text-[10px] text-muted-foreground">
                                {entry.from_stage.name} → {entry.to_stage.name}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              Por: {entry.changed_by_profile?.full_name || '-'}
                            </p>
                            {entry.notes && (
                              <p className="text-xs mt-0.5 italic">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full mt-2 text-xs h-7">
                      {historyOpen ? (
                        <>
                          <ChevronUp className="w-3 h-3 mr-1" />
                          Mostrar menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Ver mais {history.length - 1} registros
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </>
              )}
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showLostModal && (
        <MarkLostModal
          open={showLostModal}
          onOpenChange={setShowLostModal}
          opportunity={opportunity}
        />
      )}

      {showReactivateModal && (
        <ReactivateOpportunityModal
          open={showReactivateModal}
          onOpenChange={setShowReactivateModal}
          opportunity={opportunity}
        />
      )}
    </div>
  );
}
