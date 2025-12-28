import { useState, useMemo } from 'react';
import { Ticket, OPERATIONS_POSITION_TO_DEPARTMENT, TicketDepartment } from '@/types/tickets';
import { OperationsMetricCards } from './OperationsMetricCards';
import { OperationsTicketTable } from './OperationsTicketTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OperationsViewProps {
  tickets: Ticket[];
  userPosition: string | null;
  isSuperAdmin: boolean;
  onTicketClick: (ticketId: string) => void;
}

export function OperationsView({ 
  tickets, 
  userPosition, 
  isSuperAdmin,
  onTicketClick 
}: OperationsViewProps) {
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  // Filtrar chamados pelo departamento do usuário de operações
  const departmentTickets = useMemo(() => {
    if (isSuperAdmin) {
      // Super admin vê todos os chamados
      return tickets;
    }
    
    if (!userPosition) return [];
    
    const department = OPERATIONS_POSITION_TO_DEPARTMENT[userPosition];
    if (!department) return [];
    
    return tickets.filter(t => t.department === department);
  }, [tickets, userPosition, isSuperAdmin]);

  // Aplicar filtro de prioridade
  const filteredTickets = useMemo(() => {
    let result = departmentTickets;
    
    if (priorityFilter) {
      if (priorityFilter === 'open') {
        result = result.filter(t => ['open', 'in_progress'].includes(t.status));
      } else {
        result = result.filter(
          t => t.priority === priorityFilter && ['open', 'in_progress'].includes(t.status)
        );
      }
    }
    
    return result;
  }, [departmentTickets, priorityFilter]);

  // Separar por status
  const activeTickets = filteredTickets.filter(t => ['open', 'in_progress'].includes(t.status));
  const historyTickets = filteredTickets.filter(t => ['resolved', 'closed'].includes(t.status));

  return (
    <div className="space-y-6">
      <OperationsMetricCards 
        tickets={departmentTickets}
        activeFilter={priorityFilter}
        onFilterChange={setPriorityFilter}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Em andamento
            {activeTickets.length > 0 && (
              <Badge variant="secondary" className="ml-1">{activeTickets.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico
            {historyTickets.length > 0 && (
              <Badge variant="outline" className="ml-1">{historyTickets.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <OperationsTicketTable 
            tickets={activeTickets}
            onTicketClick={onTicketClick}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <OperationsTicketTable 
            tickets={historyTickets}
            onTicketClick={onTicketClick}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
