import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Eye, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useContacts, useDeleteContact } from '@/hooks/useContacts';
import { usePlanejadores, useCanViewPlanejadores } from '@/hooks/usePlanejadores';
import { NewContactModal } from '@/components/contacts/NewContactModal';
import { EditContactModal } from '@/components/contacts/EditContactModal';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import type { Contact } from '@/types/contacts';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function Contacts() {
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  
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
  const deleteContact = useDeleteContact();

  // Dynamic lists from contacts
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

  const handleDeleteConfirm = async () => {
    if (contactToDelete) {
      await deleteContact.mutateAsync(contactToDelete.id);
      setContactToDelete(null);
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
                  <TableHead className="min-w-[200px]">Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="min-w-[180px]">E-mail</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Renda Mensal</TableHead>
                  <TableHead className="text-center w-[70px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map(contact => (
                  <TableRow key={contact.id}>
                    <TableCell className="min-w-[200px]">
                      <div className="flex flex-col">
                        <span className="font-medium">{contact.full_name}</span>
                        {contact.qualification && (
                          <span className="text-yellow-500 text-xs">
                            {'⭐'.repeat(contact.qualification)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{contact.phone}</TableCell>
                    <TableCell className="text-sm min-w-[180px]">{contact.email || '-'}</TableCell>
                    <TableCell>
                      {contact.source ? (
                        <Badge variant="outline" className="text-xs">{contact.source}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">{contact.owner?.full_name || '-'}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(contact.income)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-0.5">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={() => setEditingContact(contact)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <div className="flex items-center gap-0.5">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setContactToDelete(contact)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
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

      {editingContact && (
        <EditContactModal
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          contact={editingContact}
        />
      )}

      {selectedContact && (
        <ContactDetailModal
          open={!!selectedContact}
          onOpenChange={(open) => !open && setSelectedContact(null)}
          contact={selectedContact}
        />
      )}

      <AlertDialog open={!!contactToDelete} onOpenChange={(open) => !open && setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir o contato <strong>{contactToDelete?.full_name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteContact.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
