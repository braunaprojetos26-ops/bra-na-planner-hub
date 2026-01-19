import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, DollarSign, Calendar, ChevronRight, Package, CreditCard, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ClientPlan } from '@/types/clients';
import { useClientPayments } from '@/hooks/useClientPayments';

interface ClientCardProps {
  client: ClientPlan;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ClientCard({ client }: ClientCardProps) {
  const navigate = useNavigate();
  const { data: paymentData, isLoading: isPaymentLoading } = useClientPayments(client.contact_id);

  const completedMeetings = client.plan_meetings?.filter(m => m.status === 'completed').length || 0;
  const totalMeetings = client.total_meetings;
  const progressPercent = Math.round((completedMeetings / totalMeetings) * 100);
  // Find next pending meeting
  const pendingMeetings = client.plan_meetings
    ?.filter(m => m.status === 'pending' || m.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());

  const nextMeeting = pendingMeetings?.[0];
  const nextMeetingDate = nextMeeting ? parseISO(nextMeeting.scheduled_date) : null;

  // Check for overdue meetings
  const overdueMeetings = client.plan_meetings?.filter(m => {
    if (m.status === 'completed') return false;
    const date = parseISO(m.scheduled_date);
    return isBefore(date, new Date()) && !isToday(date);
  }).length || 0;

  const statusConfig = {
    active: { label: 'Ativo', variant: 'default' as const },
    suspended: { label: 'Suspenso', variant: 'secondary' as const },
    closed: { label: 'Encerrado', variant: 'outline' as const },
  };

  const status = statusConfig[client.status];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{client.contact?.full_name}</h3>
                {client.contact?.client_code && (
                  <span className="text-xs text-muted-foreground">
                    [{client.contact.client_code}]
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(Number(client.contract_value))}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {completedMeetings} de {totalMeetings} reuniões
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {overdueMeetings > 0 && (
              <Badge variant="destructive">{overdueMeetings} atrasada{overdueMeetings > 1 ? 's' : ''}</Badge>
            )}
            {(client.productCount ?? 0) > 0 && (
              <Badge variant="outline" className="gap-1">
                <Package className="h-3 w-3" />
                {client.productCount}
              </Badge>
            )}
            {/* Real-time Vindi Payment Status */}
            {isPaymentLoading ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
              </Badge>
            ) : paymentData && paymentData.totalCount > 0 ? (
              <Badge 
                variant="outline" 
                className={`gap-1 ${
                  paymentData.isUpToDate 
                    ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                    : 'bg-red-500/10 text-red-600 border-red-500/20'
                }`}
              >
                {paymentData.isUpToDate ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {paymentData.paidCount}/{paymentData.totalCount}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {nextMeetingDate && (
            <p className="text-xs text-muted-foreground">
              Próxima reunião: {format(nextMeetingDate, "dd 'de' MMMM", { locale: ptBR })} - {nextMeeting?.theme}
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/clients/${client.id}`)}
            className="gap-1"
          >
            Ver Perfil
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
