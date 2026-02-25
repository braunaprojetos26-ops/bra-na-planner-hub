import { useState } from 'react';
import { Search, Plus, Users, Columns3, Columns4, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ClientMetrics } from '@/components/clients/ClientMetrics';
import { ClientsTableView } from '@/components/clients/ClientsTableView';
import { ClientsAdvancedFilters, EMPTY_FILTERS, type AdvancedFilters } from '@/components/clients/ClientsAdvancedFilters';
import { NewClientModal } from '@/components/clients/NewClientModal';
import { DelinquentClientsDrawer } from '@/components/clients/DelinquentClientsDrawer';
import { useClients, useClientMetrics, useDelinquentClients } from '@/hooks/useClients';
import { useActingUser } from '@/contexts/ActingUserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAllActiveUsers } from '@/hooks/useAllActiveUsers';
import type { ClientPlanStatus } from '@/types/clients';

export default function Clients() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientPlanStatus | 'all'>('active');
  const [showNewClient, setShowNewClient] = useState(false);
  const [showDelinquentDrawer, setShowDelinquentDrawer] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedPlannerIds, setSelectedPlannerIds] = useState<string[]>([]);
  const [plannerSearch, setPlannerSearch] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  
  const { isImpersonating } = useActingUser();
  const { role } = useAuth();
  const isLeaderOrAbove = role && ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role);
  
  const { data: allUsers } = useAllActiveUsers();
  const { data: clients, isLoading } = useClients(undefined, selectedPlannerIds.length > 0 ? selectedPlannerIds : undefined);
  const { data: metrics, isLoading: metricsLoading } = useClientMetrics(selectedPlannerIds.length > 0 ? selectedPlannerIds : undefined);
  const { data: delinquentClients = [], isLoading: delinquentLoading } = useDelinquentClients(selectedPlannerIds.length > 0 ? selectedPlannerIds : undefined);

  const filteredPlanners = allUsers?.filter(u => 
    !plannerSearch || u.full_name.toLowerCase().includes(plannerSearch.toLowerCase())
  ) || [];

  const togglePlanner = (userId: string) => {
    setSelectedPlannerIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const filteredClients = clients?.filter(client => {
    const matchesSearch = !search || 
      client.contact?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      client.contact?.client_code?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const pageTitle = isLeaderOrAbove ? 'Carteira de Clientes' : 'Minha Carteira de Clientes';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
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
        selectedPlannerIds={selectedPlannerIds.length > 0 ? selectedPlannerIds : undefined}
      />

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
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
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="suspended">Congelados</SelectItem>
            <SelectItem value="closed">Cancelados</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>

        {/* Planner filter - only for leaders+ */}
        {isLeaderOrAbove && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Planejador
                {selectedPlannerIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {selectedPlannerIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="space-y-3">
                <Input
                  placeholder="Buscar planejador..."
                  value={plannerSearch}
                  onChange={(e) => setPlannerSearch(e.target.value)}
                  className="h-8 text-sm"
                />
                {selectedPlannerIds.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-6 px-2"
                    onClick={() => setSelectedPlannerIds([])}
                  >
                    Limpar filtros
                  </Button>
                )}
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredPlanners.map(user => (
                    <label
                      key={user.user_id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={selectedPlannerIds.includes(user.user_id)}
                        onCheckedChange={() => togglePlanner(user.user_id)}
                      />
                      <span className="truncate">{user.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Advanced filters */}
        <ClientsAdvancedFilters filters={advancedFilters} onChange={setAdvancedFilters} />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={expanded ? 'default' : 'outline'}
                size="icon"
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? 'Simplificar tabela' : 'Expandir tabela'}
              >
                {expanded ? <Columns3 className="h-4 w-4" /> : <Columns4 className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{expanded ? 'Simplificar tabela' : 'Expandir tabela (Mapa de Oportunidades)'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
      ) : (
        <ClientsTableView 
          clients={filteredClients} 
          isLoading={false} 
          expanded={expanded} 
          showOwner={!!isLeaderOrAbove}
          advancedFilters={advancedFilters}
        />
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
