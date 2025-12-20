import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Phone, Mail, DollarSign, Tag, Calendar, History, User, AlertTriangle, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useContactHistory } from '@/hooks/useContacts';
import { MarkLostModal } from './MarkLostModal';
import { ReactivateContactModal } from './ReactivateContactModal';
import type { Contact } from '@/types/contacts';

interface ContactDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onMarkWon?: () => void;
}

export function ContactDetailModal({ open, onOpenChange, contact, onMarkWon }: ContactDetailModalProps) {
  const { data: history, isLoading: historyLoading } = useContactHistory(contact.id);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Criado',
      stage_change: 'Movido de etapa',
      assignment: 'Atribuído',
      lost: 'Marcado como perdido',
      won: 'Marcado como ganho',
      reactivated: 'Reativado',
      funnel_change: 'Mudou de funil',
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
                <DialogTitle className="text-xl">{contact.full_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={contact.status === 'active' ? 'default' : contact.status === 'lost' ? 'destructive' : 'secondary'}>
                    {contact.status === 'active' ? 'Ativo' : contact.status === 'lost' ? 'Perdido' : 'Ganho'}
                  </Badge>
                  {contact.is_dirty_base && (
                    <Badge variant="outline" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Base Suja
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
                  <span>{contact.phone}</span>
                </div>
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.income && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>R$ {contact.income.toLocaleString('pt-BR')}</span>
                  </div>
                )}
                {contact.source && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span>{contact.source}</span>
                  </div>
                )}
                {contact.campaign && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span>Campanha: {contact.campaign}</span>
                  </div>
                )}
                {contact.owner && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Responsável: {contact.owner.full_name}</span>
                  </div>
                )}
              </div>

              {/* Current Stage */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Etapa Atual
                </p>
                <p className="font-medium">{contact.current_stage?.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Funil: {contact.current_funnel?.name}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Desde {format(new Date(contact.stage_entered_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* Lost Info */}
              {contact.status === 'lost' && contact.lost_reason && (
                <div className="bg-destructive/10 rounded-lg p-4">
                  <p className="text-xs text-destructive uppercase tracking-wider mb-1">
                    Motivo da Perda
                  </p>
                  <p className="font-medium text-destructive">{contact.lost_reason.name}</p>
                  {contact.lost_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Perdido em {format(new Date(contact.lost_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              )}

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
              {contact.status === 'lost' && (
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
              {contact.status === 'active' && (
                <>
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowLostModal(true)}
                  >
                    Marcar Perdido
                  </Button>
                  {onMarkWon && (
                    <Button onClick={onMarkWon}>
                      Marcar Ganho
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
          contact={contact}
        />
      )}

      {showReactivateModal && (
        <ReactivateContactModal
          open={showReactivateModal}
          onOpenChange={setShowReactivateModal}
          contact={contact}
        />
      )}
    </>
  );
}
