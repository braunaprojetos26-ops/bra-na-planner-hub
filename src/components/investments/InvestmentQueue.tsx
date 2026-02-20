import { useState } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal';
import { useInvestmentQueue } from '@/hooks/useClientInvestments';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/types/tickets';
import { Clock, AlertTriangle } from 'lucide-react';

function SlaIndicator({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-muted-foreground text-sm">—</span>;

  const now = new Date();
  const dl = new Date(deadline);
  const minutesLeft = differenceInMinutes(dl, now);

  if (minutesLeft <= 0) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Vencido
      </Badge>
    );
  }

  if (minutesLeft <= 30) {
    return (
      <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {minutesLeft}min
      </Badge>
    );
  }

  if (minutesLeft <= 120) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {Math.floor(minutesLeft / 60)}h {minutesLeft % 60}min
      </Badge>
    );
  }

  const hours = Math.floor(minutesLeft / 60);
  return (
    <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {hours}h
    </Badge>
  );
}

export function InvestmentQueue() {
  const { data: tickets = [], isLoading } = useInvestmentQueue();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Sort by SLA urgency
  const sorted = [...tickets].sort((a, b) => {
    if (!a.sla_deadline && !b.sla_deadline) return 0;
    if (!a.sla_deadline) return 1;
    if (!b.sla_deadline) return -1;
    return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando fila...</div>;
  }

  if (sorted.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">Nenhum chamado na fila</div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo de Ação</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Solicitante</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setSelectedTicketId(ticket.id)}
            >
              <TableCell>
                <div>
                  <span className="font-medium">{ticket.contact_name || '—'}</span>
                  {ticket.contact_code && (
                    <span className="text-xs text-muted-foreground ml-1">[{ticket.contact_code}]</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{ticket.ticket_type_name}</TableCell>
              <TableCell>
                <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                  {priorityLabels[ticket.priority as keyof typeof priorityLabels]}
                </Badge>
              </TableCell>
              <TableCell>
                <SlaIndicator deadline={ticket.sla_deadline} />
              </TableCell>
              <TableCell>
                <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                  {statusLabels[ticket.status as keyof typeof statusLabels]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(ticket.created_at), 'dd/MM HH:mm', { locale: ptBR })}
              </TableCell>
              <TableCell className="text-sm">{ticket.creator_name || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TicketDetailModal
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => !open && setSelectedTicketId(null)}
      />
    </>
  );
}
