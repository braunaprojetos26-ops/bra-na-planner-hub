import { useNavigate } from 'react-router-dom';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        opacity={0.2}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
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

      // Get latest snapshot per contact
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

export function ClientsTableView({ clients, isLoading }: ClientsTableViewProps) {
  const navigate = useNavigate();
  const contactIds = [...new Set(clients.map(c => c.contact_id))];
  const { data: healthScores } = useClientHealthScores(contactIds);

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

  const now = new Date();

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Nome do cliente</TableHead>
              <TableHead className="font-semibold">Início</TableHead>
              <TableHead className="font-semibold">Próxima reunião</TableHead>
              <TableHead className="font-semibold text-center">Nº Reuniões</TableHead>
              <TableHead className="font-semibold text-center">Ciclo</TableHead>
              <TableHead className="font-semibold text-center">Progresso</TableHead>
              <TableHead className="font-semibold text-center">Health Score</TableHead>
              <TableHead className="font-semibold text-center">Produtos</TableHead>
              <TableHead className="font-semibold text-center">Alertas</TableHead>
              <TableHead className="font-semibold text-center">Status</TableHead>
              <TableHead className="font-semibold text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => {
              const completedMeetings = client.plan_meetings?.filter(m => m.status === 'completed').length || 0;
              const totalMeetings = client.total_meetings;
              const progressPercent = Math.round((completedMeetings / totalMeetings) * 100);
              
              // Find next pending meeting
              const pendingMeetings = client.plan_meetings
                ?.filter(m => m.status === 'pending' || m.status === 'scheduled')
                .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
              
              const nextMeeting = pendingMeetings?.[0];
              
              // Current meeting cycle
              const currentMeetingNumber = client.plan_meetings?.find(m => 
                m.status === 'pending' || m.status === 'scheduled'
              )?.meeting_number || completedMeetings + 1;

              const status = statusConfig[client.status];

              // Health score
              const healthScore = healthScores?.get(client.contact_id) ?? null;

              // Product count
              const productCount = client.productCount ?? 0;

              // Overdue checks
              const hasOverdueMeeting = client.plan_meetings?.some(m => {
                if (m.status === 'overdue') return true;
                if ((m.status === 'pending' || m.status === 'scheduled') && m.scheduled_date) {
                  return isBefore(new Date(m.scheduled_date), now);
                }
                return false;
              }) || false;

              const hasOverduePayment = client.paymentProgress?.vindiStatus === 'overdue';

              return (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>{client.contact?.full_name}</span>
                      {client.contact?.client_code && (
                        <span className="text-xs text-muted-foreground">
                          [{client.contact.client_code}]
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(client.start_date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {nextMeeting ? formatDate(nextMeeting.scheduled_date) : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-blue-500/30">
                      {totalMeetings} Reuniões
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
                      {productCount}
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
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(client.contract_value))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
