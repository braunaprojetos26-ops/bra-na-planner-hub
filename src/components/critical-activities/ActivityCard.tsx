import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Clock, CheckCircle2, Zap, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const urgencyConfig = {
  low: { label: 'Baixa', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Info },
  medium: { label: 'Média', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: AlertCircle },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: AlertTriangle },
  critical: { label: 'Crítica', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: Zap },
};

interface ActivityCardProps {
  activity: {
    id: string;
    title: string;
    description: string | null;
    urgency: string;
    deadline: string;
    is_active: boolean;
    created_at: string;
    my_status?: string;
    my_completed_at?: string | null;
    // Admin stats
    total_assigned?: number;
    total_completed?: number;
    completion_percentage?: number;
  };
  onComplete?: (activityId: string) => void;
  onViewDetail?: (activityId: string) => void;
  isAdmin?: boolean;
  isCompleting?: boolean;
}

export function ActivityCard({ activity, onComplete, onViewDetail, isAdmin, isCompleting }: ActivityCardProps) {
  const urgency = urgencyConfig[activity.urgency as keyof typeof urgencyConfig] || urgencyConfig.medium;
  const UrgencyIcon = urgency.icon;
  const deadlinePast = isPast(new Date(activity.deadline));
  const isCompleted = activity.my_status === 'completed';

  return (
    <Card className={`transition-all hover:shadow-md ${isCompleted ? 'opacity-70' : ''} ${deadlinePast && !isCompleted ? 'border-destructive/50' : ''}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{activity.title}</h3>
            {activity.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
            )}
          </div>
          <Badge className={`shrink-0 ${urgency.color}`}>
            <UrgencyIcon className="h-3 w-3 mr-1" />
            {urgency.label}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className={deadlinePast && !isCompleted ? 'text-destructive font-medium' : ''}>
              {deadlinePast
                ? `Atrasada há ${formatDistanceToNow(new Date(activity.deadline), { locale: ptBR })}`
                : `Prazo: ${formatDistanceToNow(new Date(activity.deadline), { locale: ptBR, addSuffix: true })}`
              }
            </span>
          </div>
          <span>{format(new Date(activity.deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
        </div>

        {/* Admin stats */}
        {isAdmin && activity.total_assigned !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {activity.total_completed}/{activity.total_assigned} concluídas
              </span>
              <span className="font-medium">{activity.completion_percentage}%</span>
            </div>
            <Progress value={activity.completion_percentage} className="h-2" />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {!isAdmin && !isCompleted && onComplete && (
            <Button
              size="sm"
              onClick={() => onComplete(activity.id)}
              disabled={isCompleting}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Marcar como concluída
            </Button>
          )}
          {!isAdmin && isCompleted && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Concluída {activity.my_completed_at && format(new Date(activity.my_completed_at), 'dd/MM/yyyy', { locale: ptBR })}
            </Badge>
          )}
          {isAdmin && onViewDetail && (
            <Button size="sm" variant="outline" onClick={() => onViewDetail(activity.id)}>
              Ver detalhes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
