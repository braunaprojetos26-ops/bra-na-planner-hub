import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Pencil, User, MapPin, Globe, FileText, History, MessageSquare, Briefcase, CalendarPlus, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useContact, useContactHistory, useUpdateContact } from '@/hooks/useContacts';
import { useContactOpportunities } from '@/hooks/useContactOpportunities';
import { useHasAnalysisMeeting } from '@/hooks/useContactAnalysis';
import { EditContactModal } from '@/components/contacts/EditContactModal';
import { NewOpportunityModal } from '@/components/opportunities/NewOpportunityModal';
import { ScheduleMeetingModal } from '@/components/meetings/ScheduleMeetingModal';
import { MeetingsList } from '@/components/meetings/MeetingsList';
import { MeetingMinutesList } from '@/components/meetings/MeetingMinutesList';
import { ContactProposalsSection } from '@/components/contacts/ContactProposalsSection';
import { WhatsAppHistorySection } from '@/components/contacts/WhatsAppHistorySection';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { useActingUser } from '@/contexts/ActingUserContext';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatCPF = (cpf: string | null | undefined) => {
  if (!cpf) return '-';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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

const formatDate = (date: string | null | undefined) => {
  if (!date) return '-';
  try {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return '-';
  }
};

const formatDateTime = (date: string | null | undefined) => {
  if (!date) return '-';
  try {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '-';
  }
};

const translateGender = (gender: string | null | undefined) => {
  if (!gender) return '-';
  const genders: Record<string, string> = {
    masculino: 'Masculino',
    feminino: 'Feminino',
    outro: 'Outro',
    prefiro_nao_informar: 'Prefiro não informar',
  };
  return genders[gender] || gender;
};

const translateMaritalStatus = (status: string | null | undefined) => {
  if (!status) return '-';
  const statuses: Record<string, string> = {
    solteiro: 'Solteiro(a)',
    casado: 'Casado(a)',
    divorciado: 'Divorciado(a)',
    viuvo: 'Viúvo(a)',
    uniao_estavel: 'União Estável',
  };
  return statuses[status] || status;
};

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
  active: 'Ativa',
  won: 'Ganha',
  lost: 'Perdida',
};

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col py-0.5 border-b border-border/50 last:border-0">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className="text-xs font-medium">{value || '-'}</span>
  </div>
);

export default function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { isImpersonating } = useActingUser();
  const isReadOnly = isImpersonating;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewOpportunityModal, setShowNewOpportunityModal] = useState(false);
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);
  const [scheduleMeetingType, setScheduleMeetingType] = useState<string | undefined>(undefined);
  const [newNote, setNewNote] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleScheduleAnalysis = () => {
    setScheduleMeetingType('Análise');
    setShowScheduleMeetingModal(true);
  };

  const handleScheduleRegularMeeting = () => {
    setScheduleMeetingType(undefined);
    setShowScheduleMeetingModal(true);
  };

  const { hasAnalysisMeeting, isLoading: analysisLoading } = useHasAnalysisMeeting(contactId);

  const { data: contact, isLoading: contactLoading } = useContact(contactId || '');
  const { data: history, isLoading: historyLoading } = useContactHistory(contactId || '');
  const { data: opportunities, isLoading: opportunitiesLoading } = useContactOpportunities(contactId || '');
  const updateContact = useUpdateContact();

  const handleSaveNote = async () => {
    if (!contactId || !newNote.trim()) return;
    
    const existingNotes = contact?.notes || '';
    const timestamp = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
    const updatedNotes = existingNotes 
      ? `${existingNotes}\n\n[${timestamp}]\n${newNote.trim()}`
      : `[${timestamp}]\n${newNote.trim()}`;
    
    await updateContact.mutateAsync({
      contactId,
      data: { notes: updatedNotes },
    });
    setNewNote('');
  };

  if (contactLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Carregando contato...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">Contato não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Contatos
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-accent">{contact.full_name}</h1>
            <p className="text-xs text-muted-foreground">
              Contato desde: {formatDate(contact.created_at)}
            </p>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>Consultor: <strong>{contact.owner?.full_name || 'Não atribuído'}</strong></span>
              {contact.referred_by_contact && (
                <span>Indicado por: <strong>{contact.referred_by_contact.full_name}</strong></span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {contact.qualification && (
                <span className="text-yellow-500 text-sm">
                  {'⭐'.repeat(contact.qualification)}
                </span>
              )}
              {contact.temperature && (
                <Badge className={`${temperatureColors[contact.temperature]} text-xs`}>
                  {temperatureLabels[contact.temperature]}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contact.client_code && (
            <Badge variant="outline" className="text-base font-bold px-3 py-1 border-2 border-accent text-accent">
              {contact.client_code}
            </Badge>
          )}
          {hasAnalysisMeeting ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/contacts/${contactId}/analise`)}
            >
              <BarChart3 className="w-3 h-3 mr-1.5" />
              Análise
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="opacity-50"
                  >
                    <BarChart3 className="w-3 h-3 mr-1.5" />
                    Análise
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Agende uma reunião de Análise primeiro</p>
              </TooltipContent>
            </Tooltip>
          )}
          {!isReadOnly && (
            <>
              <Button size="sm" variant="outline" onClick={handleScheduleRegularMeeting}>
                <CalendarPlus className="w-3 h-3 mr-1.5" />
                Agendar
              </Button>
              <Button size="sm" onClick={() => setShowEditModal(true)}>
                <Pencil className="w-3 h-3 mr-1.5" />
                Editar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Personal Info Card */}
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <User className="w-3 h-3 text-accent" />
              Informações do Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 pb-3">
            <InfoItem label="Nome Completo" value={contact.full_name} />
            <InfoItem label="CPF" value={formatCPF(contact.cpf)} />
            <InfoItem 
              label="RG" 
              value={contact.rg ? `${contact.rg}${contact.rg_issuer ? ` / ${contact.rg_issuer}` : ''}${contact.rg_issue_date ? ` - ${formatDate(contact.rg_issue_date)}` : ''}` : '-'} 
            />
            <InfoItem label="Gênero" value={translateGender(contact.gender)} />
            <InfoItem label="Data de Nascimento" value={formatDate(contact.birth_date)} />
            <InfoItem label="Estado Civil" value={translateMaritalStatus(contact.marital_status)} />
            <InfoItem label="Profissão" value={contact.profession} />
            <InfoItem label="Telefone" value={formatPhone(contact.phone)} />
            <InfoItem label="E-mail" value={contact.email} />
            <InfoItem label="Renda Mensal" value={formatCurrency(contact.income)} />
          </CardContent>
        </Card>

        {/* Address + Origin Card */}
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-accent" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 pb-2">
            <InfoItem label="CEP" value={contact.zip_code} />
            <InfoItem label="Endereço" value={contact.address} />
            <InfoItem label="Número" value={contact.address_number} />
            <InfoItem label="Complemento" value={contact.address_complement} />
          </CardContent>
          
          <Separator />
          
          <CardHeader className="pb-1 pt-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-accent" />
              Origem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 pb-3">
            <InfoItem label="Origem" value={contact.source} />
            <InfoItem label="Detalhe da Origem" value={contact.source_detail} />
            <InfoItem label="Campanha" value={contact.campaign} />
            <InfoItem 
              label="Indicado por" 
              value={contact.referred_by_contact?.full_name} 
            />
            <InfoItem 
              label="Base Suja" 
              value={
                <Badge variant={contact.is_dirty_base ? "destructive" : "secondary"} className="text-[10px]">
                  {contact.is_dirty_base ? 'Sim' : 'Não'}
                </Badge>
              } 
            />
          </CardContent>
        </Card>
      </div>

      {/* Opportunities Section */}
      <Card>
        <CardHeader className="pb-1 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Briefcase className="w-3 h-3 text-accent" />
              Oportunidades
            </CardTitle>
            {!isReadOnly && (
              <Button size="sm" className="h-7 text-xs" onClick={() => setShowNewOpportunityModal(true)}>
                Nova Oportunidade
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {opportunitiesLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : !opportunities?.length ? (
            <p className="text-xs text-muted-foreground">Nenhuma oportunidade cadastrada</p>
          ) : (
            <div className="space-y-1.5">
              {opportunities.map((opp) => (
                <div 
                  key={opp.id} 
                  className="flex items-center justify-between p-2 bg-secondary/50 rounded-md hover:bg-secondary cursor-pointer transition-colors"
                  onClick={() => navigate(`/pipeline/${opp.id}`)}
                >
                  <div>
                    <p className="font-medium text-xs">{opp.current_funnel?.name}</p>
                    <p className="text-[11px] text-muted-foreground">{opp.current_stage?.name}</p>
                  </div>
                  <Badge className={`${statusColors[opp.status]} text-[10px]`}>
                    {statusLabels[opp.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meetings Section */}
      {contactId && contact && <MeetingsList contactId={contactId} contactName={contact.full_name} />}
      
      {/* Meeting Minutes Section */}
      {contactId && contact && <MeetingMinutesList contactId={contactId} contactName={contact.full_name} />}

      {/* Proposals Section */}
      {contactId && contact && <ContactProposalsSection contactId={contactId} contactName={contact.full_name} />}

      {/* WhatsApp History Section */}
      {contactId && <WhatsAppHistorySection contactId={contactId} />}

      {/* Contract Section - Placeholder */}
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-accent" />
            Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-xs text-muted-foreground">Nenhum contrato cadastrado</p>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-accent" />
            Anotações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-3">
          {!isReadOnly && (
            <div className="space-y-1.5">
              <Textarea
                placeholder="Adicionar nova anotação..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                className="text-xs"
              />
              <Button 
                size="sm" 
                className="h-7 text-xs"
                onClick={handleSaveNote}
                disabled={!newNote.trim() || updateContact.isPending}
              >
                {updateContact.isPending ? 'Salvando...' : 'Salvar Anotação'}
              </Button>
            </div>
          )}
          
          {contact.notes && (
            <>
              {!isReadOnly && <Separator />}
              <div className="bg-secondary/50 rounded-md p-2">
                <pre className="text-xs whitespace-pre-wrap font-sans">{contact.notes}</pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* History Section - Collapsible */}
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
                    <p className="text-xs font-medium">{history[0].action}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateTime(history[0].created_at)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Por: {history[0].changed_by_profile?.full_name || '-'}
                  </p>
                  {history[0].notes && (
                    <p className="text-xs mt-0.5">{history[0].notes}</p>
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
                              <p className="text-xs font-medium">{entry.action}</p>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDateTime(entry.created_at)}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Por: {entry.changed_by_profile?.full_name || '-'}
                            </p>
                            {entry.notes && (
                              <p className="text-xs mt-0.5">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs text-muted-foreground hover:text-foreground">
                      {historyOpen ? (
                        <>
                          <ChevronUp className="w-3 h-3 mr-1" />
                          Ocultar histórico
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Ver histórico completo ({history.length - 1} {history.length - 1 === 1 ? 'registro' : 'registros'})
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
      {showEditModal && contact && (
        <EditContactModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          contact={contact}
        />
      )}

      {showNewOpportunityModal && contactId && (
        <NewOpportunityModal
          open={showNewOpportunityModal}
          onOpenChange={setShowNewOpportunityModal}
          defaultContactId={contactId}
        />
      )}

      {showScheduleMeetingModal && contactId && (
        <ScheduleMeetingModal
          open={showScheduleMeetingModal}
          onOpenChange={(open) => {
            setShowScheduleMeetingModal(open);
            if (!open) setScheduleMeetingType(undefined);
          }}
          contactId={contactId}
          contactName={contact.full_name}
          defaultMeetingType={scheduleMeetingType}
        />
      )}
    </div>
  );
}
