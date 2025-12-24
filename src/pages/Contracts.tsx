import { format } from 'date-fns';
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pendente</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
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
    contact?: { full_name: string } | null;
    product?: { 
      name: string; 
      partner_name?: string | null;
      is_partner_product?: boolean;
      category?: { name: string } | null;
    } | null;
  }>;
  isLoading: boolean;
}

function ContractsTable({ contracts, isLoading }: ContractsTableProps) {
  if (isLoading) {
    return <p className="text-muted-foreground text-center py-8">Carregando...</p>;
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground mt-4">Nenhum contrato registrado ainda</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Contratos serão exibidos aqui quando registrados
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
            <TableCell>{getStatusBadge(contract.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function Contracts() {
  const { data: contracts = [], isLoading } = useContracts();
  const { data: metrics } = useContractMetrics();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contratos</h1>
        <p className="text-muted-foreground">Visualize todos os contratos registrados</p>
      </div>

      <MetricsCards 
        totalPbs={metrics?.totalPbs || 0}
        totalValue={metrics?.totalValue || 0}
        count={metrics?.count || 0}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Todos os Contratos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContractsTable 
            contracts={contracts} 
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
