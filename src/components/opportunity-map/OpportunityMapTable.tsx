import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { OpportunityMapRow } from '@/hooks/useOpportunityMap';

interface OpportunityMapTableProps {
  rows: OpportunityMapRow[];
  isLoading?: boolean;
}

type SortKey = 'clientName' | 'ownerName' | 'planejamento' | 'paAtivo' | 'credito' | 'investimentosXP' | 'prunus' | 'cartaoXP' | 'previdencia';
type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  key: SortKey | null;
  direction: SortDirection;
}

export function OpportunityMapTable({ rows, isLoading }: OpportunityMapTableProps) {
  const navigate = useNavigate();
  const [sortState, setSortState] = useState<SortState>({ key: 'clientName', direction: 'asc' });

  const handleSort = (key: SortKey) => {
    setSortState((prev) => {
      if (prev.key !== key) {
        // New column: start with descending for numbers, ascending for text
        const isNumeric = key !== 'clientName' && key !== 'ownerName';
        return { key, direction: isNumeric ? 'desc' : 'asc' };
      }
      // Same column: toggle direction
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key, direction: 'asc' };
      return { key, direction: 'asc' };
    });
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortState.key || !sortState.direction) return 0;

    const key = sortState.key;
    const direction = sortState.direction === 'asc' ? 1 : -1;

    const aVal = a[key];
    const bVal = b[key];

    // Handle null values - always put them at the end
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;

    // Handle strings
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * direction;
    }

    // Handle booleans
    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      return (aVal === bVal ? 0 : aVal ? -1 : 1) * direction;
    }

    // Handle numbers
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * direction;
    }

    return 0;
  });

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

  const SortableHeader = ({ label, sortKey, className = '' }: { label: string; sortKey: SortKey; className?: string }) => {
    const isActive = sortState.key === sortKey;
    const direction = isActive ? sortState.direction : null;

    return (
      <TableHead className={className}>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => handleSort(sortKey)}
        >
          <span>{label}</span>
          {isActive && direction === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
          {isActive && direction === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
          {!isActive && <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
        </Button>
      </TableHead>
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Planejador</TableHead>
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
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
            <SortableHeader label="Cliente" sortKey="clientName" />
            <SortableHeader label="Planejador" sortKey="ownerName" />
            <SortableHeader label="Planejamento" sortKey="planejamento" className="text-right" />
            <SortableHeader label="PA Ativo" sortKey="paAtivo" className="text-right" />
            <SortableHeader label="Crédito" sortKey="credito" className="text-right" />
            <SortableHeader label="Investimentos XP" sortKey="investimentosXP" className="text-right" />
            <SortableHeader label="Prunus" sortKey="prunus" className="text-right" />
            <SortableHeader label="Cartão XP" sortKey="cartaoXP" className="text-center" />
            <SortableHeader label="Previdência" sortKey="previdencia" className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow
              key={row.contactId}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/contacts/${row.contactId}`)}
            >
              <TableCell className="font-medium">{row.clientName}</TableCell>
              <TableCell className="text-muted-foreground">{row.ownerName || '-'}</TableCell>
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
            <TableCell></TableCell>
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
