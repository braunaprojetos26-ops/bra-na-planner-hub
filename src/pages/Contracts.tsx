import { useEffect, useState, useMemo, useCallback } from 'react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, TrendingUp, DollarSign, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useContracts, useContractMetrics } from '@/hooks/useContracts';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ContractsFilters } from '@/components/contracts/ContractsFilters';
import { useToast } from '@/hooks/use-toast';

// ID da categoria "Planejamento Financeiro"
const PLANEJAMENTO_CATEGORY_ID = 'd770d864-4679-4a6d-9620-6844db224dc3';
const PAID_STAGE_KEYWORDS = ['paga', 'pago'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getStatusBadge(status: string, clicksignStatus?: string | null) {
  // Contract-level cancellation always takes priority
  if (status === 'cancelled') {
    return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelado</Badge>;
  }
  
  // For active contracts, check ClickSign status for more detail
  if (status === 'active') {
    if (clicksignStatus === 'cancelled') {
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Distrato</Badge>;
    }
    if (clicksignStatus === 'signed') {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Assinado</Badge>;
    }
    if (clicksignStatus === 'pending') {
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 whitespace-nowrap">Aguardando Assinatura</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>;
  }
  
  if (status === 'pending') {
    if (clicksignStatus === 'partially_signed') {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 whitespace-nowrap">Assinado pelo Cliente</Badge>;
    }
    return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 whitespace-nowrap">Aguardando Assinatura</Badge>;
  }
  
  return <Badge variant="outline">{status}</Badge>;
}

function getVindiStatusBadge(vindiStatus?: string | null, vindiDetails?: string | null) {
  if (!vindiStatus) {
    return <Badge variant="outline" className="text-muted-foreground">-</Badge>;
  }
  
  switch (vindiStatus) {
    case 'paid':
    case 'em_dia':
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20" title={vindiDetails || undefined}>Em dia</Badge>;
    case 'pending':
    case 'aguardando':
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20" title={vindiDetails || undefined}>Aguardando</Badge>;
    case 'overdue':
    case 'atrasado':
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20" title={vindiDetails || undefined}>Atrasado</Badge>;
    case 'cancelled':
    case 'cancelado':
      return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20" title={vindiDetails || undefined}>Cancelado</Badge>;
    case 'rejected':
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejeitado</Badge>;
    case 'refunded':
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Estornado</Badge>;
    case 'loading':
      return <Badge variant="outline" className="text-muted-foreground animate-pulse">...</Badge>;
    default:
      return <Badge variant="outline">{vindiStatus}</Badge>;
  }
}

function getPaymentStatus(contract: {
  vindi_status?: string | null;
  opportunity_id?: string | null;
  product?: { category_id?: string | null } | null;
  opportunity?: { current_stage?: { name: string } | null } | null;
}): string {
  const isPlanejamento = contract.product?.category_id === PLANEJAMENTO_CATEGORY_ID;
  
  // Para produtos de Planejamento Financeiro, usa status da Vindi
  if (isPlanejamento) {
    return contract.vindi_status || 'unknown';
  }
  
  // Para outros produtos, verifica a etapa do funil da oportunidade
  const stageName = contract.opportunity?.current_stage?.name?.toLowerCase() || '';
  const isPaid = PAID_STAGE_KEYWORDS.some(kw => stageName.includes(kw));
  
  if (isPaid) {
    return 'paid';
  }
  
  // Se não tem oportunidade vinculada
  if (!contract.opportunity_id) {
    return 'unknown';
  }
  
  return 'pending';
}

function getPaymentStatusBadge(contract: {
  id: string;
  vindi_status?: string | null;
  opportunity_id?: string | null;
  product?: { category_id?: string | null } | null;
  opportunity?: { current_stage?: { name: string } | null } | null;
}, vindiStatuses?: Record<string, { status: string; details?: string }>) {
  const isPlanejamento = contract.product?.category_id === PLANEJAMENTO_CATEGORY_ID;
  
  // Para produtos de Planejamento Financeiro, usa status real da Vindi
  if (isPlanejamento) {
    const realTimeStatus = vindiStatuses?.[contract.id];
    if (realTimeStatus) {
      return getVindiStatusBadge(realTimeStatus.status, realTimeStatus.details);
    }
    // Fallback to stored status while loading
    return getVindiStatusBadge(contract.vindi_status ? 'loading' : null);
  }
  
  // Para outros produtos, verifica a etapa do funil da oportunidade
  const stageName = contract.opportunity?.current_stage?.name?.toLowerCase() || '';
  const isPaid = PAID_STAGE_KEYWORDS.some(kw => stageName.includes(kw));
  
  if (isPaid) {
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Em dia</Badge>;
  }
  
  // Se não tem oportunidade vinculada
  if (!contract.opportunity_id) {
    return <Badge variant="outline" className="text-muted-foreground">-</Badge>;
  }
  
  return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Aguardando</Badge>;
}

interface MetricsCardsProps {
  totalPbs: number;
  totalValue: number;
  count: number;
}

function MetricsCards({ totalPbs, totalValue, count }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de PBs</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPbs.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">PBs acumulados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          <p className="text-xs text-muted-foreground">Em contratos ativos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quantidade</CardTitle>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{count}</div>
          <p className="text-xs text-muted-foreground">Contratos registrados</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface ContractsTableProps {
  contracts: Array<{
    id: string;
    contract_value: number;
    calculated_pbs: number;
    reported_at: string;
    status: string;
    clicksign_status?: string | null;
    vindi_status?: string | null;
    opportunity_id?: string | null;
    contact?: { full_name: string } | null;
    product?: { 
      name: string; 
      partner_name?: string | null;
      is_partner_product?: boolean;
      category_id?: string | null;
      category?: { name: string } | null;
    } | null;
    opportunity?: {
      current_stage?: { name: string } | null;
    } | null;
  }>;
  isLoading: boolean;
  vindiStatuses?: Record<string, { status: string; details?: string }>;
}

function ContractsTable({ contracts, isLoading, vindiStatuses }: ContractsTableProps) {
  if (isLoading) {
    return <p className="text-muted-foreground text-center py-8">Carregando...</p>;
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground mt-4">Nenhum contrato encontrado</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Tente ajustar os filtros para ver mais resultados
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Contato</TableHead>
          <TableHead>Produto</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="text-right">PBs</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Pagamento</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow key={contract.id}>
            <TableCell className="font-medium">
              {contract.contact?.full_name || '-'}
            </TableCell>
            <TableCell>
              <div>
                <div className="flex items-center gap-2">
                  <span>{contract.product?.name || '-'}</span>
                  {contract.product?.is_partner_product && (
                    <Badge variant="outline" className="text-xs">Parceiro</Badge>
                  )}
                </div>
                {contract.product?.category?.name && (
                  <p className="text-xs text-muted-foreground">
                    {contract.product.category.name}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(contract.contract_value)}
            </TableCell>
            <TableCell className="text-right">
              <Badge variant="secondary">{contract.calculated_pbs.toFixed(1)} PBs</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(contract.reported_at), 'dd/MM/yyyy', { locale: ptBR })}
            </TableCell>
            <TableCell>{getStatusBadge(contract.status, contract.clicksign_status)}</TableCell>
            <TableCell>{getPaymentStatusBadge(contract, vindiStatuses)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function getDateRangeFromPeriod(period: string, customStart?: Date, customEnd?: Date): { start?: string; end?: string } {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return {
        start: startOfDay(now).toISOString(),
        end: endOfDay(now).toISOString(),
      };
    case 'week':
      return {
        start: startOfDay(subDays(now, 7)).toISOString(),
        end: endOfDay(now).toISOString(),
      };
    case 'month':
      return {
        start: startOfDay(subDays(now, 30)).toISOString(),
        end: endOfDay(now).toISOString(),
      };
    case 'this_month':
      return {
        start: startOfMonth(now).toISOString(),
        end: endOfDay(now).toISOString(),
      };
    case 'this_year':
      return {
        start: startOfYear(now).toISOString(),
        end: endOfDay(now).toISOString(),
      };
    case 'custom':
      return {
        start: customStart ? startOfDay(customStart).toISOString() : undefined,
        end: customEnd ? endOfDay(customEnd).toISOString() : undefined,
      };
    default:
      return {};
  }
}

function escapeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  // Escape quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  // Wrap in quotes if contains comma, quote or newline
  if (/[",\n\r;]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCsvValue).join(';')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvValue(row[h])).join(';'));
  }
  return lines.join('\n');
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Contracts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Filter states
  const [selectedProductId, setSelectedProductId] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>();
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  
  // Build filters for the query
  const dateRange = getDateRangeFromPeriod(selectedPeriod, customDateStart, customDateEnd);
  
  const queryFilters = useMemo(() => {
    const filters: {
      productId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {};
    
    if (selectedProductId !== 'all') {
      filters.productId = selectedProductId;
    }
    if (selectedStatus !== 'all') {
      filters.status = selectedStatus;
    }
    if (dateRange.start) {
      filters.startDate = dateRange.start;
    }
    if (dateRange.end) {
      filters.endDate = dateRange.end;
    }
    
    // Return undefined if no filters, otherwise return the filters object
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [selectedProductId, selectedStatus, dateRange.start, dateRange.end]);
  
  const { data: contracts = [], isLoading } = useContracts(queryFilters);
  const { data: metrics } = useContractMetrics();

  // Fetch real-time Vindi payment statuses for planejamento contracts
  const [vindiStatuses, setVindiStatuses] = useState<Record<string, { status: string; details?: string }>>({});

  const fetchVindiStatuses = useCallback(async (contractList: typeof contracts) => {
    // Get only planejamento contracts with vindi subscription
    const vindiContractIds = contractList
      .filter(c => 
        c.product?.category_id === PLANEJAMENTO_CATEGORY_ID && 
        c.vindi_status // has vindi link
      )
      .map(c => c.id);

    if (vindiContractIds.length === 0) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-vindi-contract-statuses', {
        body: { contract_ids: vindiContractIds },
      });

      if (!error && data?.statuses) {
        setVindiStatuses(data.statuses);
      }
    } catch (e) {
      console.error('Error fetching Vindi statuses:', e);
    }
  }, []);

  useEffect(() => {
    if (contracts.length > 0 && !isLoading) {
      fetchVindiStatuses(contracts);
    }
  }, [contracts, isLoading, fetchVindiStatuses]);

  // Apply client-side payment status filter
  const filteredContracts = useMemo(() => {
    if (selectedPaymentStatus === 'all') {
      return contracts;
    }
    
    return contracts.filter(contract => {
      const isPlanejamento = contract.product?.category_id === PLANEJAMENTO_CATEGORY_ID;
      if (isPlanejamento) {
        const realStatus = vindiStatuses[contract.id]?.status;
        if (!realStatus) return selectedPaymentStatus === 'unknown';
        const mapped = realStatus === 'em_dia' ? 'paid' 
          : realStatus === 'atrasado' ? 'overdue'
          : realStatus === 'aguardando' ? 'pending'
          : realStatus === 'cancelado' ? 'cancelled'
          : 'unknown';
        return mapped === selectedPaymentStatus;
      }
      const paymentStatus = getPaymentStatus(contract);
      return paymentStatus === selectedPaymentStatus;
    });
  }, [contracts, selectedPaymentStatus, vindiStatuses]);

  // Calculate filtered metrics
  const filteredMetrics = useMemo(() => {
    const activeContracts = filteredContracts.filter(c => c.status === 'active');
    return {
      totalPbs: activeContracts.reduce((sum, c) => sum + Number(c.calculated_pbs || 0), 0),
      totalValue: activeContracts.reduce((sum, c) => sum + Number(c.contract_value || 0), 0),
      count: filteredContracts.length,
    };
  }, [filteredContracts]);

  // Export function
  const handleExport = async () => {
    try {
      setIsExporting(true);

      const rows = filteredContracts.map((contract) => ({
        Contato: contract.contact?.full_name || '-',
        Produto: contract.product?.name || '-',
        Categoria: contract.product?.category?.name || '-',
        Valor: contract.contract_value,
        PBs: contract.calculated_pbs,
        Data: format(new Date(contract.reported_at), 'dd/MM/yyyy', { locale: ptBR }),
        Status:
          contract.status === 'active'
            ? 'Ativo'
            : contract.status === 'pending'
              ? 'Pendente'
              : 'Cancelado',
        'Status Pagamento': getPaymentStatusLabel(contract),
      }));

      const csv = toCsv(rows);
      downloadTextFile(csv, `contratos-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv;charset=utf-8');

      toast({
        title: 'Exportação concluída!',
        description: `${filteredContracts.length} contratos exportados.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar os dados.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Real-time subscription for contract updates
  useEffect(() => {
    const channel = supabase
      .channel('contracts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts',
        },
        (payload) => {
          console.log('Contract update received:', payload);
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['contracts'] });
          queryClient.invalidateQueries({ queryKey: ['contract-metrics'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contratos</h1>
        <p className="text-muted-foreground">Visualize todos os contratos registrados</p>
      </div>

      <ContractsFilters
        selectedProductId={selectedProductId}
        selectedPeriod={selectedPeriod}
        selectedStatus={selectedStatus}
        selectedPaymentStatus={selectedPaymentStatus}
        customDateStart={customDateStart}
        customDateEnd={customDateEnd}
        onProductChange={setSelectedProductId}
        onPeriodChange={setSelectedPeriod}
        onStatusChange={setSelectedStatus}
        onPaymentStatusChange={setSelectedPaymentStatus}
        onCustomDateStartChange={setCustomDateStart}
        onCustomDateEndChange={setCustomDateEnd}
        onExport={handleExport}
        isExporting={isExporting}
      />

      <MetricsCards 
        totalPbs={filteredMetrics.totalPbs}
        totalValue={filteredMetrics.totalValue}
        count={filteredMetrics.count}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Todos os Contratos
            {filteredContracts.length !== contracts.length && (
              <Badge variant="secondary" className="ml-2">
                {filteredContracts.length} de {contracts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContractsTable 
            contracts={filteredContracts} 
            isLoading={isLoading}
            vindiStatuses={vindiStatuses}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function getPaymentStatusLabel(contract: {
  vindi_status?: string | null;
  opportunity_id?: string | null;
  product?: { category_id?: string | null } | null;
  opportunity?: { current_stage?: { name: string } | null } | null;
}): string {
  const status = getPaymentStatus(contract);
  
  switch (status) {
    case 'paid':
      return 'Pago';
    case 'pending':
      return 'Aguardando';
    case 'rejected':
      return 'Rejeitado';
    case 'cancelled':
      return 'Cancelado';
    case 'refunded':
      return 'Estornado';
    default:
      return '-';
  }
}
