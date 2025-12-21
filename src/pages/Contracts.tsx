import { useState } from 'react';
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

export default function Contracts() {
  const { data: contracts, isLoading } = useContracts();
  const { data: metrics } = useContractMetrics();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
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
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contratos</h1>
        <p className="text-muted-foreground">Visualize todos os contratos registrados</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de PBs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalPbs.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground">PBs acumulados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.totalValue || 0)}</div>
            <p className="text-xs text-muted-foreground">Em contratos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantidade</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.count || 0}</div>
            <p className="text-xs text-muted-foreground">Contratos registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contratos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : contracts?.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">Nenhum contrato registrado ainda</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Contratos serão exibidos aqui quando marcados como ganhos
              </p>
            </div>
          ) : (
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
                {contracts?.map((contract) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
