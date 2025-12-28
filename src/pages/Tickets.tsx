import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, MessageSquare, Clock, User, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTickets } from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';
import { NewTicketModal } from '@/components/tickets/NewTicketModal';
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal';
import { OperationsView } from '@/components/tickets/OperationsView';
import { isOperationsPosition } from '@/lib/positionLabels';
import {
  Ticket,
  departmentLabels,
  statusLabels,
  statusColors,
  priorityColors,
  priorityLabels,
} from '@/types/tickets';

type ViewMode = 'planner' | 'operations';

export default function Tickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, role } = useAuth();
  const { data: tickets = [], isLoading } = useTickets();

  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  // Determinar se o usuário é de operações
  const isOperationsUser = isOperationsPosition(profile?.position || null);
  const isSuperAdmin = role === 'superadmin';
  
  // Estado para controlar a visão (super admins podem alternar)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Operações sempre começa na visão de operações
    if (isOperationsUser) return 'operations';
    return 'planner';
  });

  // Atualizar viewMode quando profile carregar
  useEffect(() => {
    if (isOperationsUser && viewMode === 'planner') {
      setViewMode('operations');
    }
  }, [isOperationsUser]);

  // Handle deep link from notification
  useEffect(() => {
    const ticketId = searchParams.get('id');
    if (ticketId) {
      setSelectedTicketId(ticketId);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const myTickets = tickets.filter((t) => t.created_by === user?.id);
  const activeTickets = myTickets.filter((t) => ['open', 'in_progress'].includes(t.status));
  const historyTickets = myTickets.filter((t) => ['resolved', 'closed'].includes(t.status));

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setSelectedTicketId(ticket.id)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h4 className="font-medium line-clamp-1">{ticket.title}</h4>
          <Badge className={statusColors[ticket.status]} variant="secondary">
            {statusLabels[ticket.status]}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {ticket.description}
        </p>

        {ticket.contact && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <User className="h-3 w-3" />
            <span className="truncate">
              {ticket.contact.full_name}
              {ticket.contact.client_code && ` (${ticket.contact.client_code})`}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="outline" className="text-xs">
            {departmentLabels[ticket.department]}
          </Badge>
          <Badge className={`${priorityColors[ticket.priority]} text-xs`}>
            {priorityLabels[ticket.priority]}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Clock className="h-3 w-3" />
            {format(new Date(ticket.created_at), "dd/MM/yy", { locale: ptBR })}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const canToggleView = isSuperAdmin;
  const showOperationsView = viewMode === 'operations';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Chamados
            {showOperationsView && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                — Visão Operações
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            {showOperationsView 
              ? 'Gerencie os chamados recebidos' 
              : 'Abra chamados para as áreas de operações da Braúna'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canToggleView && (
            <Button 
              variant="outline" 
              onClick={() => setViewMode(viewMode === 'planner' ? 'operations' : 'planner')}
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              {viewMode === 'planner' ? 'Visão Operações' : 'Visão Planejador'}
            </Button>
          )}
          {!showOperationsView && (
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Chamado
            </Button>
          )}
        </div>
      </div>

      {showOperationsView ? (
        <OperationsView
          tickets={tickets}
          userPosition={profile?.position || null}
          isSuperAdmin={isSuperAdmin}
          onTicketClick={setSelectedTicketId}
        />
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Em andamento
              {activeTickets.length > 0 && (
                <Badge variant="secondary" className="ml-1">{activeTickets.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">
              Histórico
              {historyTickets.length > 0 && (
                <Badge variant="outline" className="ml-1">{historyTickets.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : activeTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-lg mb-1">Nenhum chamado em andamento</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Você não tem chamados abertos no momento
                  </p>
                  <Button onClick={() => setShowNewModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Abrir Chamado
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : historyTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-lg mb-1">Nenhum chamado no histórico</h3>
                  <p className="text-muted-foreground text-sm">
                    Seus chamados resolvidos aparecerão aqui
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {historyTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <NewTicketModal open={showNewModal} onOpenChange={setShowNewModal} />
      <TicketDetailModal
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => !open && setSelectedTicketId(null)}
      />
    </div>
  );
}
