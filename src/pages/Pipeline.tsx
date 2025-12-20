import { useState, useMemo } from 'react';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Mail, User, AlertTriangle, Clock, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFunnels, useFunnelStages, useNextFunnelFirstStage } from '@/hooks/useFunnels';
import { useContacts, useMoveContactStage, useMarkContactWon } from '@/hooks/useContacts';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import { MarkLostModal } from '@/components/contacts/MarkLostModal';
import { ReactivateContactModal } from '@/components/contacts/ReactivateContactModal';
import { NewContactModal } from '@/components/contacts/NewContactModal';
import type { Contact, FunnelStage } from '@/types/contacts';

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
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [draggedContactId, setDraggedContactId] = useState<string | null>(null);

  const { data: funnels, isLoading: funnelsLoading } = useFunnels();
  const { data: stages } = useFunnelStages(selectedFunnelId);
  const { data: contacts, isLoading: contactsLoading } = useContacts(selectedFunnelId);
  const moveStage = useMoveContactStage();
  const markWon = useMarkContactWon();

  // Auto-select first funnel
  useState(() => {
    if (funnels?.length && !selectedFunnelId) {
      setSelectedFunnelId(funnels[0].id);
    }
  });

  // Get next funnel info for "won" action
  const { nextFunnel, firstStage: nextFirstStage } = useNextFunnelFirstStage(selectedFunnelId);

  // Separate active and lost contacts
  const activeContacts = useMemo(() => 
    contacts?.filter(c => c.status === 'active') || [], 
    [contacts]
  );
  
  const lostContacts = useMemo(() => 
    contacts?.filter(c => c.status === 'lost') || [], 
    [contacts]
  );

  // Group contacts by stage
  const contactsByStage = useMemo(() => {
    const grouped: Record<string, Contact[]> = {};
    stages?.forEach(stage => {
      grouped[stage.id] = activeContacts.filter(c => c.current_stage_id === stage.id);
    });
    return grouped;
  }, [stages, activeContacts]);

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    setDraggedContactId(contactId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    if (!draggedContactId) return;

    const contact = contacts?.find(c => c.id === draggedContactId);
    if (!contact || contact.current_stage_id === toStageId) {
      setDraggedContactId(null);
      return;
    }

    await moveStage.mutateAsync({
      contactId: draggedContactId,
      fromStageId: contact.current_stage_id,
      toStageId,
    });

    setDraggedContactId(null);
  };

  const handleMarkWon = async (contact: Contact) => {
    if (!nextFunnel || !nextFirstStage) {
      // Last funnel - just mark as won
      return;
    }

    await markWon.mutateAsync({
      contactId: contact.id,
      fromStageId: contact.current_stage_id,
      nextFunnelId: nextFunnel.id,
      nextStageId: nextFirstStage.id,
    });
  };

  const getSlaStatus = (contact: Contact, stage: FunnelStage) => {
    if (!stage.sla_hours) return null;
    const hours = differenceInHours(new Date(), new Date(contact.stage_entered_at));
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Funil</h1>
          <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
            <SelectTrigger className="w-[280px]">
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
        </div>
        <Button onClick={() => setShowNewContactModal(true)}>
          Novo Contato
        </Button>
      </div>

      {!selectedFunnelId ? (
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Selecione um funil para visualizar</p>
        </div>
      ) : contactsLoading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Carregando contatos...</p>
        </div>
      ) : (
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
                    {contactsByStage[stage.id]?.length || 0}
                  </Badge>
                </div>
              </div>

              {/* Contacts */}
              <ScrollArea className={`flex-1 rounded-b-lg border-2 border-t-0 ${stageColors[stage.color] || stageColors.gray}`}>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {contactsByStage[stage.id]?.map(contact => {
                    const slaStatus = getSlaStatus(contact, stage);
                    return (
                      <Card
                        key={contact.id}
                        className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
                          slaStatus === 'overdue' ? 'ring-2 ring-destructive' : 
                          slaStatus === 'warning' ? 'ring-2 ring-warning' : ''
                        }`}
                        draggable
                        onDragStart={e => handleDragStart(e, contact.id)}
                        onClick={() => {
                          setSelectedContact(contact);
                          setShowDetailModal(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm line-clamp-1">{contact.full_name}</p>
                          {contact.is_dirty_base && (
                            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                          )}
                        </div>
                        
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{contact.phone}</span>
                          </div>
                          {contact.owner && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{contact.owner.full_name}</span>
                            </div>
                          )}
                          {stage.sla_hours && (
                            <div className={`flex items-center gap-1 ${
                              slaStatus === 'overdue' ? 'text-destructive' : 
                              slaStatus === 'warning' ? 'text-warning' : ''
                            }`}>
                              <Clock className="w-3 h-3" />
                              <span>
                                {differenceInHours(new Date(), new Date(contact.stage_entered_at))}h / {stage.sla_hours}h
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-1 mt-3" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleMarkWon(contact)}
                            disabled={!nextFunnel}
                            title={nextFunnel ? 'Marcar Ganho' : 'Último funil'}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ganho
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedContact(contact);
                              setShowLostModal(true);
                            }}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Perdido
                          </Button>
                        </div>
                      </Card>
                    );
                  })}

                  {contactsByStage[stage.id]?.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                      Nenhum contato
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ))}

          {/* Lost Column */}
          {lostContacts.length > 0 && (
            <div className="flex-shrink-0 w-72 flex flex-col">
              <div className="rounded-t-lg px-3 py-2 bg-destructive">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white text-sm">Perdidos</span>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {lostContacts.length}
                  </Badge>
                </div>
              </div>

              <ScrollArea className="flex-1 rounded-b-lg border-2 border-t-0 border-destructive/30 bg-destructive/5">
                <div className="p-2 space-y-2 min-h-[200px]">
                  {lostContacts.map(contact => (
                    <Card
                      key={contact.id}
                      className="p-3 cursor-pointer hover:shadow-md transition-shadow opacity-80"
                      onClick={() => {
                        setSelectedContact(contact);
                        setShowDetailModal(true);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm line-clamp-1">{contact.full_name}</p>
                      </div>
                      
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{contact.phone}</span>
                        </div>
                        {contact.lost_reason && (
                          <div className="flex items-center gap-1 text-destructive">
                            <XCircle className="w-3 h-3" />
                            <span>{contact.lost_reason.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 mt-3" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setSelectedContact(contact);
                            setShowReactivateModal(true);
                          }}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reativar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedContact && showDetailModal && (
        <ContactDetailModal
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          contact={selectedContact}
          onMarkWon={nextFunnel ? () => handleMarkWon(selectedContact) : undefined}
        />
      )}

      {selectedContact && showLostModal && (
        <MarkLostModal
          open={showLostModal}
          onOpenChange={setShowLostModal}
          contact={selectedContact}
        />
      )}

      {selectedContact && showReactivateModal && (
        <ReactivateContactModal
          open={showReactivateModal}
          onOpenChange={setShowReactivateModal}
          contact={selectedContact}
        />
      )}

      <NewContactModal
        open={showNewContactModal}
        onOpenChange={setShowNewContactModal}
      />
    </div>
  );
}
