import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, FileText } from 'lucide-react';
import { useClientInvestmentTickets } from '@/hooks/useClientInvestments';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/types/tickets';

interface ClientInvestmentsSectionProps {
  contactId: string;
}

export function ClientInvestmentsSection({ contactId }: ClientInvestmentsSectionProps) {
  const { data: tickets = [], isLoading } = useClientInvestmentTickets(contactId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Investimentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Portfolio placeholder */}
        <div className="p-4 bg-muted/50 rounded-lg text-center space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Resumo da Carteira</p>
          <p className="text-xs text-muted-foreground">Integração em breve — dados de carteira e alocação serão exibidos aqui.</p>
        </div>

        {/* Investment ticket history */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Histórico de Chamados de Investimento
          </h4>

          {isLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado de investimento</p>
          ) : (
            <div className="space-y-2">
              {tickets.slice(0, 10).map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{ticket.title}</span>
                      {ticket.ticket_type_name && (
                        <Badge variant="outline" className="text-xs">{ticket.ticket_type_name}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      {ticket.creator_name && <span>• {ticket.creator_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                      {priorityLabels[ticket.priority as keyof typeof priorityLabels]}
                    </Badge>
                    <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                      {statusLabels[ticket.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
