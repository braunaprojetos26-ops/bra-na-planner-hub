import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { OpportunityMapRow } from '@/hooks/useOpportunityMap';

interface OpportunityMapTableProps {
  rows: OpportunityMapRow[];
  isLoading?: boolean;
}

export function OpportunityMapTable({ rows, isLoading }: OpportunityMapTableProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatBoolean = (value: boolean | null) => {
    if (value === null) return '-';
    return value ? 'Sim' : 'Não';
  };

  const getCellClass = (value: number | null | boolean) => {
    if (value === null) return 'text-muted-foreground';
    return 'text-foreground font-medium';
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Planejamento</TableHead>
              <TableHead className="text-right">PA Ativo</TableHead>
              <TableHead className="text-right">Crédito</TableHead>
              <TableHead className="text-right">Investimentos XP</TableHead>
              <TableHead className="text-right">Prunus</TableHead>
              <TableHead className="text-center">Cartão XP</TableHead>
              <TableHead className="text-right">Previdência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">Nenhum cliente com contratos ativos encontrado.</p>
      </div>
    );
  }

  // Calculate totals
  const totals = {
    planejamento: rows.reduce((sum, r) => sum + (r.planejamento || 0), 0),
    paAtivo: rows.reduce((sum, r) => sum + (r.paAtivo || 0), 0),
    credito: rows.reduce((sum, r) => sum + (r.credito || 0), 0),
    prunus: rows.reduce((sum, r) => sum + (r.prunus || 0), 0),
    previdencia: rows.reduce((sum, r) => sum + (r.previdencia || 0), 0),
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Planejamento</TableHead>
            <TableHead className="text-right">PA Ativo</TableHead>
            <TableHead className="text-right">Crédito</TableHead>
            <TableHead className="text-right">Investimentos XP</TableHead>
            <TableHead className="text-right">Prunus</TableHead>
            <TableHead className="text-center">Cartão XP</TableHead>
            <TableHead className="text-right">Previdência</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.contactId}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/contacts/${row.contactId}`)}
            >
              <TableCell className="font-medium">{row.clientName}</TableCell>
              <TableCell className={`text-right ${getCellClass(row.planejamento)}`}>
                {formatCurrency(row.planejamento)}
              </TableCell>
              <TableCell className={`text-right ${getCellClass(row.paAtivo)}`}>
                {formatCurrency(row.paAtivo)}
              </TableCell>
              <TableCell className={`text-right ${getCellClass(row.credito)}`}>
                {formatCurrency(row.credito)}
              </TableCell>
              <TableCell className={`text-right ${getCellClass(row.investimentosXP)}`}>
                {formatCurrency(row.investimentosXP)}
              </TableCell>
              <TableCell className={`text-right ${getCellClass(row.prunus)}`}>
                {formatCurrency(row.prunus)}
              </TableCell>
              <TableCell className={`text-center ${getCellClass(row.cartaoXP)}`}>
                {formatBoolean(row.cartaoXP)}
              </TableCell>
              <TableCell className={`text-right ${getCellClass(row.previdencia)}`}>
                {formatCurrency(row.previdencia)}
              </TableCell>
            </TableRow>
          ))}
          {/* Totals row */}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell>Total ({rows.length} clientes)</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.planejamento || null)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.paAtivo || null)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.credito || null)}</TableCell>
            <TableCell className="text-right text-muted-foreground">-</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.prunus || null)}</TableCell>
            <TableCell className="text-center text-muted-foreground">-</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.previdencia || null)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
