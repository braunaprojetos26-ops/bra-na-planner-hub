import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Search, Phone, Mail, User } from 'lucide-react';
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
import { useContactOpportunities } from '@/hooks/useOpportunities';
import { usePlanejadores, useCanViewPlanejadores } from '@/hooks/usePlanejadores';
import { NewContactModal } from '@/components/contacts/NewContactModal';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import type { Contact } from '@/types/contacts';

export default function Contacts() {
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterDirtyBase, setFilterDirtyBase] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterIncomeMin, setFilterIncomeMin] = useState<string>('');
  const [filterIncomeMax, setFilterIncomeMax] = useState<string>('');
  const [filterReferredBy, setFilterReferredBy] = useState<string>('all');
  const [filterQualification, setFilterQualification] = useState<string>('all');
  const [filterSourceDetail, setFilterSourceDetail] = useState<string>('all');
  const [filterCampaign, setFilterCampaign] = useState<string>('all');

  const { data: contacts, isLoading } = useContacts();
  const { data: planejadores } = usePlanejadores();
  const canViewPlanejadores = useCanViewPlanejadores();

  // Dynamic lists from contacts
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
      const searchLower = searchTerm.toLowerCase();
      const searchClean = searchTerm.replace(/\D/g, '');
      const matchesSearch = !searchTerm || 
        contact.full_name.toLowerCase().includes(searchLower) ||
        contact.phone.includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.cpf?.replace(/\D/g, '').includes(searchClean) ||
        contact.rg?.toLowerCase().includes(searchLower);

      const matchesSource = filterSource === 'all' || contact.source === filterSource;
      const matchesDirtyBase = filterDirtyBase === 'all' || 
        (filterDirtyBase === 'yes' && contact.is_dirty_base) ||
        (filterDirtyBase === 'no' && !contact.is_dirty_base);
      const matchesOwner = filterOwner === 'all' || 
        (filterOwner === 'unassigned' && !contact.owner_id) ||
        contact.owner_id === filterOwner;

      const minIncome = filterIncomeMin ? parseFloat(filterIncomeMin) : null;
      const maxIncome = filterIncomeMax ? parseFloat(filterIncomeMax) : null;
      const matchesIncome = 
        (!minIncome && !maxIncome) ||
        (contact.income !== null && 
          (minIncome === null || contact.income >= minIncome) &&
          (maxIncome === null || contact.income <= maxIncome));

      const matchesReferredBy = filterReferredBy === 'all' || contact.referred_by === filterReferredBy;
      const matchesQualification = filterQualification === 'all' || 
        contact.qualification === parseInt(filterQualification);
      const matchesSourceDetail = filterSourceDetail === 'all' || contact.source_detail === filterSourceDetail;
      const matchesCampaign = filterCampaign === 'all' || contact.campaign === filterCampaign;

      return matchesSearch && matchesSource && matchesDirtyBase && matchesOwner && 
             matchesIncome && matchesReferredBy && matchesQualification && 
             matchesSourceDetail && matchesCampaign;
    });
  }, [contacts, searchTerm, filterSource, filterDirtyBase, filterOwner, 
      filterIncomeMin, filterIncomeMax, filterReferredBy, filterQualification, 
      filterSourceDetail, filterCampaign]);

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
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap gap-x-3 gap-y-2 items-end">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-[10px] text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Nome, telefone, email, CPF, RG..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {canViewPlanejadores && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Responsável</Label>
                <Select value={filterOwner} onValueChange={setFilterOwner}>
                  <SelectTrigger className="w-[140px] h-8 text-sm">
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

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Base</Label>
              <Select value={filterDirtyBase} onValueChange={setFilterDirtyBase}>
                <SelectTrigger className="w-[100px] h-8 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Suja</SelectItem>
                  <SelectItem value="no">Limpa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Qualificação</Label>
              <Select value={filterQualification} onValueChange={setFilterQualification}>
                <SelectTrigger className="w-[110px] h-8 text-sm">
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

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Origem</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[110px] h-8 text-sm">
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
                  <TableHead>Origem</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map(contact => (
                  <TableRow 
                    key={contact.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedContact(contact)}
                  >
                    <TableCell>
                      <div className="font-medium">{contact.full_name}</div>
                      {contact.qualification && (
                        <div className="text-xs text-yellow-500">
                          {'⭐'.repeat(contact.qualification)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {contact.phone}
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.source && (
                        <Badge variant="outline">{contact.source}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.owner ? (
                        <div className="flex items-center gap-1 text-sm">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {contact.owner.full_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(contact.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewContactModal
        open={showNewContactModal}
        onOpenChange={setShowNewContactModal}
      />

      {selectedContact && (
        <ContactDetailModal
          open={!!selectedContact}
          onOpenChange={(open) => !open && setSelectedContact(null)}
          contact={selectedContact}
        />
      )}
    </div>
  );
}
