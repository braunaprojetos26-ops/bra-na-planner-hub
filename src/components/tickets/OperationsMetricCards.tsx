import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, TicketPriority, priorityLabels, priorityColors } from '@/types/tickets';
import { Inbox, AlertTriangle, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperationsMetricCardsProps {
  tickets: Ticket[];
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

export function OperationsMetricCards({ 
  tickets, 
  activeFilter, 
  onFilterChange 
}: OperationsMetricCardsProps) {
  const openTickets = tickets.filter(t => ['open', 'in_progress'].includes(t.status));
  const urgentCount = openTickets.filter(t => t.priority === 'urgent').length;
  const highCount = openTickets.filter(t => t.priority === 'high').length;
  const normalCount = openTickets.filter(t => t.priority === 'normal').length;
  const lowCount = openTickets.filter(t => t.priority === 'low').length;

  const cards = [
    {
      key: 'open',
      label: 'Abertos',
      count: openTickets.length,
      icon: Inbox,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50',
      borderColor: 'border-blue-200 dark:border-blue-700',
    },
    {
      key: 'urgent',
      label: 'Urgente',
      count: urgentCount,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50',
      borderColor: 'border-red-200 dark:border-red-700',
    },
    {
      key: 'high',
      label: 'Alta',
      count: highCount,
      icon: AlertCircle,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/50',
      borderColor: 'border-orange-200 dark:border-orange-700',
    },
    {
      key: 'normal',
      label: 'Normal',
      count: normalCount,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50',
      borderColor: 'border-blue-200 dark:border-blue-700',
    },
    {
      key: 'low',
      label: 'Baixa',
      count: lowCount,
      icon: CheckCircle,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800/70',
      borderColor: 'border-gray-200 dark:border-gray-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;
        
        return (
          <Card 
            key={card.key}
            className={cn(
              'cursor-pointer transition-all border-2',
              card.bgColor,
              isActive ? `${card.borderColor} ring-2 ring-offset-2 ring-${card.color.replace('text-', '')}` : 'border-transparent'
            )}
            onClick={() => onFilterChange(isActive ? null : card.key)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-full', card.bgColor)}>
                <Icon className={cn('h-5 w-5', card.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.count}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
