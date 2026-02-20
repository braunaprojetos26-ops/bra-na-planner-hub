import { useState } from 'react';
import { Search, Plus, Users, LayoutGrid, Table } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ClientMetrics } from '@/components/clients/ClientMetrics';
import { ClientCard } from '@/components/clients/ClientCard';
import { ClientsTableView } from '@/components/clients/ClientsTableView';
import { NewClientModal } from '@/components/clients/NewClientModal';
import { DelinquentClientsDrawer } from '@/components/clients/DelinquentClientsDrawer';
import { useClients, useClientMetrics, useDelinquentClients } from '@/hooks/useClients';
import { useActingUser } from '@/contexts/ActingUserContext';
import type { ClientPlanStatus } from '@/types/clients';

type ViewMode = 'cards' | 'table';

export default function Clients() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientPlanStatus | 'all'>('all');
  const [showNewClient, setShowNewClient] = useState(false);
  const [showDelinquentDrawer, setShowDelinquentDrawer] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  const { isImpersonating } = useActingUser();
  const { data: clients, isLoading } = useClients();
  const { data: metrics, isLoading: metricsLoading } = useClientMetrics();
  const { data: delinquentClients = [], isLoading: delinquentLoading } = useDelinquentClients();

  const filteredClients = clients?.filter(client => {
    const matchesSearch = !search || 
      client.contact?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      client.contact?.client_code?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Minha Carteira de Clientes</h1>
        </div>
        {!isImpersonating && (
          <Button onClick={() => setShowNewClient(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        )}
      </div>

      {/* Metrics */}
      <ClientMetrics 
        metrics={metrics} 
        isLoading={metricsLoading} 
        delinquentClients={delinquentClients}
        onDelinquentClick={() => setShowDelinquentDrawer(true)}
      />

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ClientPlanStatus | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="suspended">Suspensos</SelectItem>
            <SelectItem value="closed">Encerrados</SelectItem>
          </SelectContent>
        </Select>

        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(value) => value && setViewMode(value as ViewMode)}
          className="border rounded-lg p-1"
        >
          <ToggleGroupItem value="cards" aria-label="Visualização em cards" className="px-3">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Visualização em tabela" className="px-3">
            <Table className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum cliente encontrado</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          {filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <ClientsTableView clients={filteredClients} isLoading={false} />
      )}

      <NewClientModal open={showNewClient} onOpenChange={setShowNewClient} />
      <DelinquentClientsDrawer 
        open={showDelinquentDrawer} 
        onOpenChange={setShowDelinquentDrawer}
        clients={delinquentClients}
        isLoading={delinquentLoading}
      />
    </div>
  );
}
