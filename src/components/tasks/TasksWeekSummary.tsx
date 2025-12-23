import { Card, CardContent } from '@/components/ui/card';
import { ListTodo, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TasksWeekSummaryProps {
  total: number;
  pending: number;
  overdue: number;
  completed: number;
}

export function TasksWeekSummary({ total, pending, overdue, completed }: TasksWeekSummaryProps) {
  const cards = [
    { 
      label: 'Total', 
      value: total, 
      icon: ListTodo, 
      bgColor: 'bg-primary/10', 
      iconColor: 'text-primary' 
    },
    { 
      label: 'Pendentes', 
      value: pending, 
      icon: Clock, 
      bgColor: 'bg-amber-500/10', 
      iconColor: 'text-amber-500' 
    },
    { 
      label: 'Atrasadas', 
      value: overdue, 
      icon: AlertTriangle, 
      bgColor: 'bg-destructive/10', 
      iconColor: 'text-destructive' 
    },
    { 
      label: 'Concluídas', 
      value: completed, 
      icon: CheckCircle2, 
      bgColor: 'bg-emerald-500/10', 
      iconColor: 'text-emerald-500' 
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
