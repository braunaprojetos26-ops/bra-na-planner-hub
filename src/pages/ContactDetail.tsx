import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Pencil, User, MapPin, Globe, FileText, History, MessageSquare, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useContact, useContactHistory, useUpdateContact } from '@/hooks/useContacts';
import { useContactOpportunities } from '@/hooks/useContactOpportunities';
import { EditContactModal } from '@/components/contacts/EditContactModal';
import { NewOpportunityModal } from '@/components/opportunities/NewOpportunityModal';
import { useState } from 'react';

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
  <div className="flex flex-col py-1.5 border-b border-border/50 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value || '-'}</span>
  </div>
);

export default function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewOpportunityModal, setShowNewOpportunityModal] = useState(false);
  const [newNote, setNewNote] = useState('');

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-accent">{contact.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              Contato desde: {formatDate(contact.created_at)}
            </p>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>Consultor: <strong>{contact.owner?.full_name || 'Não atribuído'}</strong></span>
              {contact.referred_by_contact && (
                <span>Indicado por: <strong>{contact.referred_by_contact.full_name}</strong></span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {contact.qualification && (
                <span className="text-yellow-500">
                  {'⭐'.repeat(contact.qualification)}
                </span>
              )}
              {contact.temperature && (
                <Badge className={temperatureColors[contact.temperature]}>
                  {temperatureLabels[contact.temperature]}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => setShowEditModal(true)}>
          <Pencil className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Personal Info Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              Informações do Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
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

        {/* Address Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoItem label="CEP" value={contact.zip_code} />
            <InfoItem label="Endereço" value={contact.address} />
            <InfoItem label="Número" value={contact.address_number} />
            <InfoItem label="Complemento" value={contact.address_complement} />
          </CardContent>
        </Card>

        {/* Origin Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              Origem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
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
                <Badge variant={contact.is_dirty_base ? "destructive" : "secondary"}>
                  {contact.is_dirty_base ? 'Sim' : 'Não'}
                </Badge>
              } 
            />
          </CardContent>
        </Card>
      </div>

      {/* Opportunities Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-accent" />
              Oportunidades
            </CardTitle>
            <Button size="sm" onClick={() => setShowNewOpportunityModal(true)}>
              Nova Oportunidade
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {opportunitiesLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !opportunities?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma oportunidade cadastrada</p>
          ) : (
            <div className="space-y-2">
              {opportunities.map((opp) => (
                <div key={opp.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{opp.current_funnel?.name}</p>
                    <p className="text-xs text-muted-foreground">{opp.current_stage?.name}</p>
                  </div>
                  <Badge className={statusColors[opp.status]}>
                    {statusLabels[opp.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Section - Placeholder */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            Contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado</p>
        </CardContent>
      </Card>

      {/* History Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !history?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum histórico registrado</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{entry.action}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Por: {entry.changed_by_profile?.full_name || '-'}
                    </p>
                    {entry.notes && (
                      <p className="text-sm mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            Anotações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Adicionar nova anotação..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <Button 
              size="sm" 
              onClick={handleSaveNote}
              disabled={!newNote.trim() || updateContact.isPending}
            >
              {updateContact.isPending ? 'Salvando...' : 'Salvar Anotação'}
            </Button>
          </div>
          
          {contact.notes && (
            <>
              <Separator />
              <div className="bg-secondary/50 rounded-lg p-3">
                <pre className="text-sm whitespace-pre-wrap font-sans">{contact.notes}</pre>
              </div>
            </>
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
    </div>
  );
}
