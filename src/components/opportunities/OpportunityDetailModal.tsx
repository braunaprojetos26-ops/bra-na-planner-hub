import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Mail, DollarSign, Tag, Calendar, History, User, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useOpportunityHistory } from '@/hooks/useOpportunities';
import { MarkLostModal } from './MarkLostModal';
import { ReactivateOpportunityModal } from './ReactivateOpportunityModal';
import { OpportunityTasksSection } from './OpportunityTasksSection';
import type { Opportunity } from '@/types/opportunities';
interface OpportunityDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity;
  onMarkWon?: () => void;
}

export function OpportunityDetailModal({ open, onOpenChange, opportunity, onMarkWon }: OpportunityDetailModalProps) {
  const { data: history, isLoading: historyLoading } = useOpportunityHistory(opportunity.id);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Criada',
      stage_change: 'Movida de etapa',
      lost: 'Marcada como perdida',
      won: 'Marcada como ganha',
      reactivated: 'Reativada',
    };
    return labels[action] || action;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl">{opportunity.contact?.full_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={opportunity.status === 'active' ? 'default' : opportunity.status === 'lost' ? 'destructive' : 'secondary'}>
                    {opportunity.status === 'active' ? 'Ativa' : opportunity.status === 'lost' ? 'Perdida' : 'Ganha'}
                  </Badge>
                  {opportunity.temperature && (
                    <Badge variant="outline" className={
                      opportunity.temperature === 'hot' ? 'text-red-500 border-red-500' :
                      opportunity.temperature === 'warm' ? 'text-yellow-500 border-yellow-500' :
                      'text-blue-500 border-blue-500'
                    }>
                      {opportunity.temperature === 'hot' ? 'Quente' : opportunity.temperature === 'warm' ? 'Morno' : 'Frio'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{opportunity.contact?.phone}</span>
                </div>
                {opportunity.contact?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{opportunity.contact.email}</span>
                  </div>
                )}
                {opportunity.contact?.owner && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Responsável: {opportunity.contact.owner.full_name}</span>
                  </div>
                )}
              </div>

              {/* Current Stage */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Etapa Atual
                </p>
                <p className="font-medium">{opportunity.current_stage?.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Funil: {opportunity.current_funnel?.name}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Desde {format(new Date(opportunity.stage_entered_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* Qualification */}
              {opportunity.qualification && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Qualificação:</span>
                  <span className="text-yellow-500">
                    {'⭐'.repeat(opportunity.qualification)}
                  </span>
                </div>
              )}

              {/* Notes */}
              {opportunity.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Anotações
                  </p>
                  <p className="text-sm">{opportunity.notes}</p>
                </div>
              )}

              {/* Lost Info */}
              {opportunity.status === 'lost' && opportunity.lost_reason && (
                <div className="bg-destructive/10 rounded-lg p-4">
                  <p className="text-xs text-destructive uppercase tracking-wider mb-1">
                    Motivo da Perda
                  </p>
                  <p className="font-medium text-destructive">{opportunity.lost_reason.name}</p>
                  {opportunity.lost_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Perdida em {format(new Date(opportunity.lost_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              )}

              <Separator />

              {/* Tasks Section */}
              <OpportunityTasksSection opportunityId={opportunity.id} />

              <Separator />

              {/* History */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">Histórico</h3>
                </div>

                {historyLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : history?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum histórico</p>
                ) : (
                  <div className="space-y-3">
                    {history?.map(item => (
                      <div key={item.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                        <div>
                          <p className="font-medium">{getActionLabel(item.action)}</p>
                          {item.from_stage && item.to_stage && (
                            <p className="text-muted-foreground">
                              {item.from_stage.name} → {item.to_stage.name}
                            </p>
                          )}
                          {item.to_stage && !item.from_stage && (
                            <p className="text-muted-foreground">
                              → {item.to_stage.name}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-muted-foreground italic">{item.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")} 
                            {item.changed_by_profile && ` • ${item.changed_by_profile.full_name}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="p-4 border-t flex justify-between">
            <div>
              {opportunity.status === 'lost' && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowReactivateModal(true)}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reativar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {opportunity.status === 'active' && (
                <>
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowLostModal(true)}
                  >
                    Marcar Perdida
                  </Button>
                  {onMarkWon && (
                    <Button onClick={onMarkWon}>
                      Marcar Ganha
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
