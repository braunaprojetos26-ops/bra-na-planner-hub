import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Search, AlertTriangle, Phone, Mail, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useContacts } from '@/hooks/useContacts';
import { useFunnels, useFunnelStages } from '@/hooks/useFunnels';
import { usePlanejadores, useCanViewPlanejadores } from '@/hooks/usePlanejadores';
import { NewContactModal } from '@/components/contacts/NewContactModal';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import type { Contact, ContactStatus } from '@/types/contacts';

export default function Contacts() {
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFunnel, setFilterFunnel] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterDirtyBase, setFilterDirtyBase] = useState<string>('all');
  // Novos filtros
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterIncomeMin, setFilterIncomeMin] = useState<string>('');
  const [filterIncomeMax, setFilterIncomeMax] = useState<string>('');
  const [filterReferredBy, setFilterReferredBy] = useState<string>('all');
  const [filterQualification, setFilterQualification] = useState<string>('all');
  const [filterSourceDetail, setFilterSourceDetail] = useState<string>('all');
  const [filterCampaign, setFilterCampaign] = useState<string>('all');

  const { data: contacts, isLoading } = useContacts();
  const { data: funnels } = useFunnels();
  const { data: stages } = useFunnelStages(filterFunnel !== 'all' ? filterFunnel : undefined);
  const { data: planejadores } = usePlanejadores();
  const canViewPlanejadores = useCanViewPlanejadores();

  // Listas dinâmicas extraídas dos contatos
  const sources = useMemo(() => {
    const uniqueSources = new Set<string>();
    contacts?.forEach(c => {
      if (c.source) uniqueSources.add(c.source);
    });
    return Array.from(uniqueSources).sort();
  }, [contacts]);

  const sourceDetails = useMemo(() => {
    const unique = new Set<string>();
    contacts?.forEach(c => {
      if (c.source_detail) unique.add(c.source_detail);
    });
    return Array.from(unique).sort();
  }, [contacts]);

  const campaigns = useMemo(() => {
    const unique = new Set<string>();
    contacts?.forEach(c => {
      if (c.campaign) unique.add(c.campaign);
    });
    return Array.from(unique).sort();
  }, [contacts]);

  const referrers = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string }>();
    contacts?.forEach(c => {
      if (c.referred_by_contact && c.referred_by_contact.id) {
        map.set(c.referred_by_contact.id, {
          id: c.referred_by_contact.id,
          full_name: c.referred_by_contact.full_name,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [contacts]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];

    return contacts.filter(contact => {
      // Search filter - expandido para incluir CPF e RG
      const searchLower = searchTerm.toLowerCase();
      const searchClean = searchTerm.replace(/\D/g, '');
      const matchesSearch = !searchTerm || 
        contact.full_name.toLowerCase().includes(searchLower) ||
        contact.phone.includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.cpf?.replace(/\D/g, '').includes(searchClean) ||
        contact.rg?.toLowerCase().includes(searchLower);

      // Funnel filter
      const matchesFunnel = filterFunnel === 'all' || contact.current_funnel_id === filterFunnel;

      // Stage filter
      const matchesStage = filterStage === 'all' || contact.current_stage_id === filterStage;

      // Status filter
      const matchesStatus = filterStatus === 'all' || contact.status === filterStatus;

      // Source filter
      const matchesSource = filterSource === 'all' || contact.source === filterSource;

      // Dirty base filter
      const matchesDirtyBase = filterDirtyBase === 'all' || 
        (filterDirtyBase === 'yes' && contact.is_dirty_base) ||
        (filterDirtyBase === 'no' && !contact.is_dirty_base);

      // Owner filter
      const matchesOwner = filterOwner === 'all' || 
        (filterOwner === 'unassigned' && !contact.owner_id) ||
        contact.owner_id === filterOwner;

      // Income range filter
      const minIncome = filterIncomeMin ? parseFloat(filterIncomeMin) : null;
      const maxIncome = filterIncomeMax ? parseFloat(filterIncomeMax) : null;
      const matchesIncome = 
        (!minIncome && !maxIncome) ||
        (contact.income !== null && 
          (minIncome === null || contact.income >= minIncome) &&
          (maxIncome === null || contact.income <= maxIncome));

      // Referred by filter
      const matchesReferredBy = filterReferredBy === 'all' || contact.referred_by === filterReferredBy;

      // Qualification filter
      const matchesQualification = filterQualification === 'all' || 
        contact.qualification === parseInt(filterQualification);

      // Source detail filter
      const matchesSourceDetail = filterSourceDetail === 'all' || contact.source_detail === filterSourceDetail;

      // Campaign filter
      const matchesCampaign = filterCampaign === 'all' || contact.campaign === filterCampaign;

      return matchesSearch && matchesFunnel && matchesStage && matchesStatus && 
             matchesSource && matchesDirtyBase && matchesOwner && matchesIncome &&
             matchesReferredBy && matchesQualification && matchesSourceDetail && matchesCampaign;
    });
  }, [contacts, searchTerm, filterFunnel, filterStage, filterStatus, filterSource, 
      filterDirtyBase, filterOwner, filterIncomeMin, filterIncomeMax, filterReferredBy,
      filterQualification, filterSourceDetail, filterCampaign]);

  const getStatusBadge = (status: ContactStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Ativo</Badge>;
      case 'lost':
        return <Badge variant="destructive">Perdido</Badge>;
      case 'won':
        return <Badge variant="secondary">Ganho</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contatos</h1>
          <p className="text-muted-foreground">
            {filteredContacts.length} contatos encontrados
          </p>
        </div>
        <Button onClick={() => setShowNewContactModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Contato
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Linha 1 - Busca */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone, email, CPF ou RG..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Linha 2 - Filtros Principais */}
          <div className="flex flex-wrap gap-4">
            {/* Funnel Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Funil de Venda</Label>
              <Select value={filterFunnel} onValueChange={val => {
                setFilterFunnel(val);
                setFilterStage('all');
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos os Funis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Funis</SelectItem>
                  {funnels?.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Etapa</Label>
              <Select value={filterStage} onValueChange={setFilterStage} disabled={filterFunnel === 'all'}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Todas as Etapas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Etapas</SelectItem>
                  {stages?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                  <SelectItem value="won">Ganho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Owner Filter - apenas para admins */}
            {canViewPlanejadores && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Responsável</Label>
                <Select value={filterOwner} onValueChange={setFilterOwner}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="unassigned">Não Atribuído</SelectItem>
                    {planejadores?.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dirty Base Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Base</Label>
              <Select value={filterDirtyBase} onValueChange={setFilterDirtyBase}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Base Suja</SelectItem>
                  <SelectItem value="no">Base Limpa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 3 - Filtros Financeiros */}
          <div className="flex flex-wrap gap-4 items-end">
            {/* Income Range */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Renda de</Label>
              <Input
                type="number"
                placeholder="R$ 0"
                value={filterIncomeMin}
                onChange={e => setFilterIncomeMin(e.target.value)}
                className="w-[120px]"
              />
            </div>
            <span className="pb-2 text-muted-foreground">a</span>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Renda até</Label>
              <Input
                type="number"
                placeholder="R$ ∞"
                value={filterIncomeMax}
                onChange={e => setFilterIncomeMax(e.target.value)}
                className="w-[120px]"
              />
            </div>

            {/* Qualification Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Qualificação</Label>
              <Select value={filterQualification} onValueChange={setFilterQualification}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="1">⭐</SelectItem>
                  <SelectItem value="2">⭐⭐</SelectItem>
                  <SelectItem value="3">⭐⭐⭐</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 4 - Filtros de Origem */}
          <div className="flex flex-wrap gap-4">
            {/* Referred By Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Indicado Por</Label>
              <Select value={filterReferredBy} onValueChange={setFilterReferredBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {referrers.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Origem</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {sources.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Detail Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Fonte</Label>
              <Select value={filterSourceDetail} onValueChange={setFilterSourceDetail}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {sourceDetails.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campaign Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Campanha</Label>
              <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground">Carregando contatos...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <p className="text-muted-foreground">Nenhum contato encontrado</p>
              <Button variant="outline" onClick={() => setShowNewContactModal(true)}>
                Criar primeiro contato
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map(contact => (
                  <TableRow 
                    key={contact.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedContact(contact)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{contact.full_name}</span>
                        {contact.is_dirty_base && (
                          <AlertTriangle className="w-4 h-4 text-warning" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{contact.current_stage?.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.current_funnel?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.source || '-'}
                    </TableCell>
                    <TableCell>
                      {contact.owner ? (
                        <div className="flex items-center gap-1 text-sm">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {contact.owner.full_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Não atribuído</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(contact.status)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(contact.created_at), "dd/MM/yy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <NewContactModal
        open={showNewContactModal}
        onOpenChange={setShowNewContactModal}
      />

      {selectedContact && (
        <ContactDetailModal
          open={!!selectedContact}
          onOpenChange={open => !open && setSelectedContact(null)}
          contact={selectedContact}
        />
      )}
    </div>
  );
}
