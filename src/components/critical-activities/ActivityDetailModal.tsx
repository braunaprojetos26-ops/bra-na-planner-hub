import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getPositionLabel } from '@/lib/positionLabels';
import { useCriticalActivities } from '@/hooks/useCriticalActivities';

interface ActivityDetailModalProps {
  activityId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityDetailModal({ activityId, open, onOpenChange }: ActivityDetailModalProps) {
  const { useActivityDetail } = useCriticalActivities();
  const { data, isLoading } = useActivityDetail(activityId);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.activity?.title || 'Detalhes da Atividade'}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {data.activity.description && (
              <p className="text-sm text-muted-foreground">{data.activity.description}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">{data.total_assigned}</p>
                <p className="text-xs text-muted-foreground">Receberam</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-green-600">{data.total_completed}</p>
                <p className="text-xs text-muted-foreground">Concluíram</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{data.total_assigned - data.total_completed}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span className="font-medium">{data.completion_percentage}%</span>
              </div>
              <Progress value={data.completion_percentage} className="h-3" />
            </div>

            {/* Users list */}
            <div>
              <h4 className="font-medium mb-3">Usuários ({data.assignments.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.assignments.map(assignment => (
                  <div key={assignment.id} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{assignment.user_profile?.full_name || 'Usuário'}</p>
                        <p className="text-xs text-muted-foreground">{getPositionLabel(assignment.user_profile?.position || null)}</p>
                      </div>
                    </div>
                    {assignment.status === 'completed' ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {assignment.completed_at && format(new Date(assignment.completed_at), 'dd/MM', { locale: ptBR })}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
