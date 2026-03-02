import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ticket as TicketIcon, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal';
import {
  departmentLabels,
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
} from '@/types/tickets';

function useContactTickets(contactId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['contact-tickets', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set([
        ...data.map(t => t.created_by),
        ...data.filter(t => t.assigned_to).map(t => t.assigned_to),
      ])].filter(Boolean);

      const { data: profiles = [] } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      return data.map(t => ({
        ...t,
        creator: profileMap.get(t.created_by) || null,
        assignee: t.assigned_to ? profileMap.get(t.assigned_to) || null : null,
      }));
    },
    enabled: !!user && !!contactId,
  });
}

interface ContactTicketsSectionProps {
  contactId: string;
}

export function ContactTicketsSection({ contactId }: ContactTicketsSectionProps) {
  const { data: tickets, isLoading } = useContactTickets(contactId);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TicketIcon className="w-3 h-3 text-accent" />
            Chamados
            {tickets && tickets.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">
                {tickets.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : !tickets?.length ? (
            <p className="text-xs text-muted-foreground">Nenhum chamado vinculado</p>
          ) : (
            <div className="space-y-1.5">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-2 bg-secondary/50 rounded-md hover:bg-secondary cursor-pointer transition-colors"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs truncate">{ticket.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">
                        {departmentLabels[ticket.department as keyof typeof departmentLabels] || ticket.department}
                      </Badge>
                      <Badge className={`${priorityColors[ticket.priority as keyof typeof priorityColors]} text-[10px]`}>
                        {priorityLabels[ticket.priority as keyof typeof priorityLabels] || ticket.priority}
                      </Badge>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="w-2.5 h-2.5" />
                        {format(new Date(ticket.created_at), "dd/MM/yy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <Badge className={`${statusColors[ticket.status as keyof typeof statusColors]} text-[10px] ml-2 shrink-0`}>
                    {statusLabels[ticket.status as keyof typeof statusLabels] || ticket.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TicketDetailModal
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => !open && setSelectedTicketId(null)}
      />
    </>
  );
}
