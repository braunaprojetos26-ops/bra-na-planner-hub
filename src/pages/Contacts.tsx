import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, Filter, AlertTriangle, Phone, Mail, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { NewContactModal } from '@/components/contacts/NewContactModal';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import type { Contact, ContactStatus } from '@/types/contacts';

export default function Contacts() {
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFunnel, setFilterFunnel] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterDirtyBase, setFilterDirtyBase] = useState<string>('all');

  const { data: contacts, isLoading } = useContacts();
  const { data: funnels } = useFunnels();
  const { data: stages } = useFunnelStages(filterFunnel !== 'all' ? filterFunnel : undefined);

  // Get unique sources from contacts
  const sources = useMemo(() => {
    const uniqueSources = new Set<string>();
    contacts?.forEach(c => {
      if (c.source) uniqueSources.add(c.source);
    });
    return Array.from(uniqueSources).sort();
  }, [contacts]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];

    return contacts.filter(contact => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        contact.full_name.toLowerCase().includes(searchLower) ||
        contact.phone.includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchLower);

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

      return matchesSearch && matchesFunnel && matchesStage && matchesStatus && matchesSource && matchesDirtyBase;
    });
  }, [contacts, searchTerm, filterFunnel, filterStage, filterStatus, filterSource, filterDirtyBase]);

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
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Funnel Filter */}
            <Select value={filterFunnel} onValueChange={val => {
              setFilterFunnel(val);
              setFilterStage('all');
            }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Funil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Funis</SelectItem>
                {funnels?.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stage Filter */}
            <Select value={filterStage} onValueChange={setFilterStage} disabled={filterFunnel === 'all'}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Etapas</SelectItem>
                {stages?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
                <SelectItem value="won">Ganho</SelectItem>
              </SelectContent>
            </Select>

            {/* Source Filter */}
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {sources.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Dirty Base Filter */}
            <Select value={filterDirtyBase} onValueChange={setFilterDirtyBase}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Base Suja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Base Suja</SelectItem>
                <SelectItem value="no">Base Limpa</SelectItem>
              </SelectContent>
            </Select>
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
