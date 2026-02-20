import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, CalendarClock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClientPlan } from '@/types/clients';

interface ClientsTableViewProps {
  clients: ClientPlan[];
  isLoading: boolean;
  expanded?: boolean;
  showOwner?: boolean;
}

// Credit categories matching useOpportunityMap
const CREDIT_CATEGORIES = [
  'Consórcio',
  'Home Equity',
  'Financiamento Imobiliário',
  'Financiamento Auto',
  'Carta Contemplada Auto',
  'Carta Contemplada Imobiliário',
  'Crédito com Colateral XP',
];

interface OpportunityColumns {
  paAtivo: number | null;
  credito: number | null;
  investimentosXP: number | null;
  prunus: number | null;
  cartaoXP: boolean | null;
  previdencia: number | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyOrNull(value: number | null): string {
  if (value === null) return '-';
  return formatCurrency(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

function CircularProgress({ value, size = 20 }: { value: number; size?: number }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  const getColor = () => {
    if (value >= 75) return 'text-green-500';
    if (value >= 50) return 'text-blue-500';
    if (value >= 25) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  return (
    <svg width={size} height={size} className={getColor()}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={2} opacity={0.2} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function HealthScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-muted-foreground text-sm">-</span>;
  
  const getColor = () => {
    if (score >= 80) return 'bg-green-500/20 text-green-600 border-green-500/30';
    if (score >= 60) return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
    if (score >= 40) return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
    return 'bg-red-500/20 text-red-600 border-red-500/30';
  };

  return (
    <Badge variant="outline" className={getColor()}>
      {score}
    </Badge>
  );
}

function useClientHealthScores(contactIds: string[]) {
  return useQuery({
    queryKey: ['client-health-scores', contactIds.sort().join(',')],
    queryFn: async () => {
      if (contactIds.length === 0) return new Map<string, number>();
      const { data, error } = await supabase
        .from('health_score_snapshots')
        .select('contact_id, total_score, snapshot_date')
        .in('contact_id', contactIds)
        .order('snapshot_date', { ascending: false });
      if (error) throw error;
      const scoreMap = new Map<string, number>();
      data?.forEach(row => {
        if (!scoreMap.has(row.contact_id)) {
          scoreMap.set(row.contact_id, row.total_score);
        }
      });
      return scoreMap;
    },
    enabled: contactIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

function useClientOpportunityMap(contactIds: string[]) {
  return useQuery({
    queryKey: ['client-opportunity-map', contactIds.sort().join(',')],
    queryFn: async () => {
      if (contactIds.length === 0) return new Map<string, OpportunityColumns>();

      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          contact_id,
          contract_value,
          product:products (
            name,
            category:product_categories ( name )
          )
        `)
        .eq('status', 'active')
        .in('contact_id', contactIds);

      if (error) throw error;

      const map = new Map<string, { paAtivo: number; credito: number; prunus: number; previdencia: number }>();

      contracts?.forEach(c => {
        const product = c.product as any;
        const categoryName = product?.category?.name || '';
        const productName = product?.name || '';
        const value = Number(c.contract_value) || 0;
        const contactId = c.contact_id;

        if (!map.has(contactId)) {
          map.set(contactId, { paAtivo: 0, credito: 0, prunus: 0, previdencia: 0 });
        }
        const entry = map.get(contactId)!;

        if (categoryName === 'Seguro de Vida') {
          entry.paAtivo += value;
        } else if (CREDIT_CATEGORIES.includes(categoryName)) {
          entry.credito += value;
        } else if (productName === 'Prunus') {
          entry.prunus += value;
        } else if (categoryName === 'Previdência') {
          entry.previdencia += value;
        }
      });

      const result = new Map<string, OpportunityColumns>();
      for (const [contactId, entry] of map) {
        result.set(contactId, {
          paAtivo: entry.paAtivo > 0 ? entry.paAtivo : null,
          credito: entry.credito > 0 ? entry.credito : null,
          investimentosXP: null,
          prunus: entry.prunus > 0 ? entry.prunus : null,
          cartaoXP: null,
          previdencia: entry.previdencia > 0 ? entry.previdencia : null,
        });
      }
      return result;
    },
    enabled: contactIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// ----- Sorting -----

type SortKey =
  | 'clientName' | 'ownerName' | 'startDate' | 'nextMeeting' | 'totalMeetings' | 'cycle'
  | 'progress' | 'healthScore' | 'productCount' | 'status' | 'value'
  | 'paAtivo' | 'credito' | 'investimentosXP' | 'prunus' | 'previdencia';

type SortDirection = 'asc' | 'desc';

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

interface EnrichedClient {
  client: ClientPlan;
  progressPercent: number;
  nextMeetingDate: string | null;
  currentMeetingNumber: number;
  healthScore: number | null;
  hasOverdueMeeting: boolean;
  hasOverduePayment: boolean;
  opp: OpportunityColumns;
}

// Sortable header component
function SortableHeader({ label, sortKey, currentSort, onSort, className = '' }: {
  label: string;
  sortKey: SortKey;
  currentSort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentSort.key === sortKey;
  return (
    <TableHead className={className}>
      <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        {isActive && currentSort.direction === 'asc' && <ArrowUp className="ml-1 h-3.5 w-3.5" />}
        {isActive && currentSort.direction === 'desc' && <ArrowDown className="ml-1 h-3.5 w-3.5" />}
        {!isActive && <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />}
      </Button>
    </TableHead>
  );
}

export function ClientsTableView({ clients, isLoading, expanded = false, showOwner = false }: ClientsTableViewProps) {
  const navigate = useNavigate();
  const contactIds = useMemo(() => [...new Set(clients.map(c => c.contact_id))], [clients]);
  const { data: healthScores } = useClientHealthScores(contactIds);
  const { data: oppMap } = useClientOpportunityMap(contactIds);

  const [sortState, setSortState] = useState<SortState>({ key: 'clientName', direction: 'asc' });

  const handleSort = (key: SortKey) => {
    setSortState(prev => {
      if (prev.key !== key) {
        const textKeys: SortKey[] = ['clientName', 'status'];
        return { key, direction: textKeys.includes(key) ? 'asc' : 'desc' };
      }
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const now = new Date();

  const enriched: EnrichedClient[] = useMemo(() => clients.map(client => {
    const completedMeetings = client.plan_meetings?.filter(m => m.status === 'completed').length || 0;
    const totalMeetings = client.total_meetings;
    const progressPercent = Math.round((completedMeetings / totalMeetings) * 100);

    const pendingMeetings = client.plan_meetings
      ?.filter(m => m.status === 'pending' || m.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());

    const nextMeeting = pendingMeetings?.[0];
    const currentMeetingNumber = client.plan_meetings?.find(m =>
      m.status === 'pending' || m.status === 'scheduled'
    )?.meeting_number || completedMeetings + 1;

    const healthScore = healthScores?.get(client.contact_id) ?? null;

    const hasOverdueMeeting = client.plan_meetings?.some(m => {
      if (m.status === 'overdue') return true;
      if ((m.status === 'pending' || m.status === 'scheduled') && m.scheduled_date) {
        return isBefore(new Date(m.scheduled_date), now);
      }
      return false;
    }) || false;

    const hasOverduePayment = client.paymentProgress?.vindiStatus === 'overdue';

    const opp = oppMap?.get(client.contact_id) || {
      paAtivo: null, credito: null, investimentosXP: null, prunus: null, cartaoXP: null, previdencia: null,
    };

    return {
      client,
      progressPercent,
      nextMeetingDate: nextMeeting?.scheduled_date || null,
      currentMeetingNumber,
      healthScore,
      hasOverdueMeeting,
      hasOverduePayment,
      opp,
    };
  }), [clients, healthScores, oppMap, now]);

  const sorted = useMemo(() => {
    const dir = sortState.direction === 'asc' ? 1 : -1;
    return [...enriched].sort((a, b) => {
      const getVal = (item: EnrichedClient): number | string | null => {
        switch (sortState.key) {
          case 'clientName': return item.client.contact?.full_name || '';
          case 'ownerName': return item.client.owner?.full_name || '';
          case 'startDate': return item.client.start_date;
          case 'nextMeeting': return item.nextMeetingDate;
          case 'totalMeetings': return item.client.total_meetings;
          case 'cycle': return item.currentMeetingNumber;
          case 'progress': return item.progressPercent;
          case 'healthScore': return item.healthScore;
          case 'productCount': return item.client.productCount ?? 0;
          case 'status': return item.client.status;
          case 'value': return Number(item.client.contract_value);
          case 'paAtivo': return item.opp.paAtivo;
          case 'credito': return item.opp.credito;
          case 'investimentosXP': return item.opp.investimentosXP;
          case 'prunus': return item.opp.prunus;
          case 'previdencia': return item.opp.previdencia;
          default: return null;
        }
      };
      const aVal = getVal(a);
      const bVal = getVal(b);
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') return aVal.localeCompare(bVal) * dir;
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return 0;
    });
  }, [enriched, sortState]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum cliente encontrado
      </div>
    );
  }

  const statusConfig = {
    active: { label: 'Ativo', className: 'bg-green-500/20 text-green-600 border-green-500/30' },
    suspended: { label: 'Suspenso', className: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
    closed: { label: 'Encerrado', className: 'bg-red-500/20 text-red-600 border-red-500/30' },
  };

  const getCellClass = (value: number | null) => {
    if (value === null) return 'text-muted-foreground';
    return 'text-foreground font-medium';
  };

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <SortableHeader label="Nome do cliente" sortKey="clientName" currentSort={sortState} onSort={handleSort} />
                {showOwner && (
                  <SortableHeader label="Planejador" sortKey="ownerName" currentSort={sortState} onSort={handleSort} />
                )}
                <SortableHeader label="Início" sortKey="startDate" currentSort={sortState} onSort={handleSort} />
                <SortableHeader label="Próxima reunião" sortKey="nextMeeting" currentSort={sortState} onSort={handleSort} />
                <SortableHeader label="Nº Reuniões" sortKey="totalMeetings" currentSort={sortState} onSort={handleSort} className="text-center" />
                <SortableHeader label="Ciclo" sortKey="cycle" currentSort={sortState} onSort={handleSort} className="text-center" />
                <SortableHeader label="Progresso" sortKey="progress" currentSort={sortState} onSort={handleSort} className="text-center" />
                <SortableHeader label="Health Score" sortKey="healthScore" currentSort={sortState} onSort={handleSort} className="text-center" />
                <SortableHeader label="Produtos" sortKey="productCount" currentSort={sortState} onSort={handleSort} className="text-center" />
                <TableHead className="font-semibold text-center">Alertas</TableHead>
                <SortableHeader label="Status" sortKey="status" currentSort={sortState} onSort={handleSort} className="text-center" />
                <SortableHeader label="Valor" sortKey="value" currentSort={sortState} onSort={handleSort} className="text-right" />
                {expanded && (
                  <>
                    <SortableHeader label="PA Ativo" sortKey="paAtivo" currentSort={sortState} onSort={handleSort} className="text-right" />
                    <SortableHeader label="Crédito" sortKey="credito" currentSort={sortState} onSort={handleSort} className="text-right" />
                    <SortableHeader label="Invest. XP" sortKey="investimentosXP" currentSort={sortState} onSort={handleSort} className="text-right" />
                    <SortableHeader label="Prunus" sortKey="prunus" currentSort={sortState} onSort={handleSort} className="text-right" />
                    <SortableHeader label="Previdência" sortKey="previdencia" currentSort={sortState} onSort={handleSort} className="text-right" />
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(({ client, progressPercent, nextMeetingDate, currentMeetingNumber, healthScore, hasOverdueMeeting, hasOverduePayment, opp }) => {
                const status = statusConfig[client.status];
                return (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>{client.contact?.full_name}</span>
                        {client.contact?.client_code && (
                          <span className="text-xs text-muted-foreground">[{client.contact.client_code}]</span>
                        )}
                      </div>
                    </TableCell>
                    {showOwner && (
                      <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                        {client.owner?.full_name || '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(client.start_date)}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{nextMeetingDate ? formatDate(nextMeetingDate) : '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-blue-500/30">
                        {client.total_meetings} Reuniões
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-sky-500/20 text-sky-600 border-sky-500/30">
                        Reunião {currentMeetingNumber}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm">{progressPercent}%</span>
                        <CircularProgress value={progressPercent} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <HealthScoreBadge score={healthScore} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-600 border-purple-500/30">
                        {client.productCount ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {hasOverdueMeeting && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="bg-orange-500/20 text-orange-600 border-orange-500/30 gap-1 px-2">
                                <CalendarClock className="h-3 w-3" />
                                Reunião
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Reunião atrasada</TooltipContent>
                          </Tooltip>
                        )}
                        {hasOverduePayment && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="bg-red-500/20 text-red-600 border-red-500/30 gap-1 px-2">
                                <CreditCard className="h-3 w-3" />
                                Pagamento
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Pagamento atrasado</TooltipContent>
                          </Tooltip>
                        )}
                        {!hasOverdueMeeting && !hasOverduePayment && (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={status.className}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatCurrency(Number(client.contract_value))}
                    </TableCell>
                    {expanded && (
                      <>
                        <TableCell className={`text-right whitespace-nowrap ${getCellClass(opp.paAtivo)}`}>
                          {formatCurrencyOrNull(opp.paAtivo)}
                        </TableCell>
                        <TableCell className={`text-right whitespace-nowrap ${getCellClass(opp.credito)}`}>
                          {formatCurrencyOrNull(opp.credito)}
                        </TableCell>
                        <TableCell className={`text-right whitespace-nowrap ${getCellClass(opp.investimentosXP)}`}>
                          {formatCurrencyOrNull(opp.investimentosXP)}
                        </TableCell>
                        <TableCell className={`text-right whitespace-nowrap ${getCellClass(opp.prunus)}`}>
                          {formatCurrencyOrNull(opp.prunus)}
                        </TableCell>
                        <TableCell className={`text-right whitespace-nowrap ${getCellClass(opp.previdencia)}`}>
                          {formatCurrencyOrNull(opp.previdencia)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
