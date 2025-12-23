import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, TrendingUp, DollarSign, Hash, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useContractsByType, useContractMetrics } from '@/hooks/useContracts';

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
  isPartner?: boolean;
}

function MetricsCards({ totalPbs, totalValue, count, isPartner }: MetricsCardsProps) {
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
          <p className="text-xs text-muted-foreground">
            {isPartner ? 'Em vendas de parceiros' : 'Em contratos ativos'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quantidade</CardTitle>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{count}</div>
          <p className="text-xs text-muted-foreground">
            {isPartner ? 'Vendas registradas' : 'Contratos registrados'}
          </p>
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
      category?: { name: string } | null;
    } | null;
  }>;
  isLoading: boolean;
  showPartner?: boolean;
}

function ContractsTable({ contracts, isLoading, showPartner }: ContractsTableProps) {
  if (isLoading) {
    return <p className="text-muted-foreground text-center py-8">Carregando...</p>;
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground mt-4">
          {showPartner ? 'Nenhuma venda de parceiro registrada' : 'Nenhum contrato registrado ainda'}
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {showPartner 
            ? 'Vendas de seguros serão exibidas aqui quando registradas'
            : 'Contratos serão exibidos aqui quando marcados como ganhos'
          }
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
          {showPartner && <TableHead>Parceiro</TableHead>}
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
                <p>{contract.product?.name || '-'}</p>
                {contract.product?.category?.name && (
                  <p className="text-xs text-muted-foreground">
                    {contract.product.category.name}
                  </p>
                )}
              </div>
            </TableCell>
            {showPartner && (
              <TableCell className="text-muted-foreground">
                {contract.product?.partner_name || '-'}
              </TableCell>
            )}
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
  const [activeTab, setActiveTab] = useState('internal');
  
  // Internal contracts (is_partner_product = false)
  const { data: internalContracts = [], isLoading: loadingInternal } = useContractsByType(false);
  const { data: internalMetrics } = useContractMetrics(undefined, false);
  
  // Partner sales (is_partner_product = true)
  const { data: partnerContracts = [], isLoading: loadingPartner } = useContractsByType(true);
  const { data: partnerMetrics } = useContractMetrics(undefined, true);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contratos</h1>
        <p className="text-muted-foreground">Visualize contratos e vendas de parceiros</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="internal" className="gap-2">
            <FileText className="h-4 w-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="partner" className="gap-2">
            <Shield className="h-4 w-4" />
            Vendas de Parceiros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal" className="space-y-6 mt-6">
          <MetricsCards 
            totalPbs={internalMetrics?.totalPbs || 0}
            totalValue={internalMetrics?.totalValue || 0}
            count={internalMetrics?.count || 0}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contratos Internos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContractsTable 
                contracts={internalContracts} 
                isLoading={loadingInternal}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partner" className="space-y-6 mt-6">
          <MetricsCards 
            totalPbs={partnerMetrics?.totalPbs || 0}
            totalValue={partnerMetrics?.totalValue || 0}
            count={partnerMetrics?.count || 0}
            isPartner
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Vendas de Parceiros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContractsTable 
                contracts={partnerContracts} 
                isLoading={loadingPartner}
                showPartner
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
