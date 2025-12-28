import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Clock, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Ticket,
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  departmentLabels,
} from '@/types/tickets';

interface OperationsTicketTableProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: string) => void;
}

export function OperationsTicketTable({ 
  tickets, 
  onTicketClick 
}: OperationsTicketTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum chamado encontrado</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Criador</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow 
              key={ticket.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onTicketClick(ticket.id)}
            >
              <TableCell>
                <div className="max-w-[200px]">
                  <p className="font-medium truncate">{ticket.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {ticket.description}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {ticket.creator?.full_name || 'Desconhecido'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {ticket.contact ? (
                  <span className="text-sm">
                    {ticket.contact.full_name}
                    {ticket.contact.client_code && (
                      <span className="text-muted-foreground ml-1">
                        ({ticket.contact.client_code})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {departmentLabels[ticket.department]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`${priorityColors[ticket.priority]} text-xs`}>
                  {priorityLabels[ticket.priority]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={statusColors[ticket.status]} variant="secondary">
                  {statusLabels[ticket.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(ticket.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                </div>
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTicketClick(ticket.id);
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
