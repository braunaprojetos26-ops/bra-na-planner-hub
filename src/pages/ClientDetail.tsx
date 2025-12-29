import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, User, DollarSign, Calendar, Phone, Mail, ExternalLink, HeartPulse, Star, Users, CreditCard, ShoppingBag, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ClientMeetingsTimeline } from '@/components/clients/ClientMeetingsTimeline';
import { ClientTasksSection } from '@/components/clients/ClientTasksSection';
import { ClientMinutesSection } from '@/components/clients/ClientMinutesSection';
import { useClientPlan } from '@/hooks/useClients';
import { useHealthScore, CATEGORY_CONFIG } from '@/hooks/useHealthScore';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);
}

export default function ClientDetail() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading } = useClientPlan(planId || '');
  
  // Fetch health score for this specific contact
  const contactId = plan?.contact_id;
  const { data: healthData, isLoading: isHealthLoading } = useHealthScore(
    contactId ? { contactIds: [contactId] } : undefined
  );
  const clientHealth = healthData?.results?.[0];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button variant="link" onClick={() => navigate('/clients')}>
          Voltar para a lista
        </Button>
      </div>
    );
  }

  const completedMeetings = plan.plan_meetings?.filter(m => m.status === 'completed').length || 0;
  const progressPercent = Math.round((completedMeetings / plan.total_meetings) * 100);

  const statusConfig = {
    active: { label: 'Ativo', variant: 'default' as const },
    suspended: { label: 'Suspenso', variant: 'secondary' as const },
    closed: { label: 'Encerrado', variant: 'outline' as const },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{plan.contact?.full_name}</h1>
              {plan.contact?.client_code && (
                <span className="text-muted-foreground">[{plan.contact.client_code}]</span>
              )}
            </div>
            <Badge variant={statusConfig[plan.status].variant}>
              {statusConfig[plan.status].label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planejamento Ativo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Valor</p>
                <p className="font-semibold">{formatCurrency(Number(plan.contract_value))}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Início</p>
                <p className="font-semibold">{format(parseISO(plan.start_date), 'dd/MM/yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Fim</p>
                <p className="font-semibold">{format(parseISO(plan.end_date), 'dd/MM/yyyy')}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Reuniões</p>
              <p className="font-semibold">{completedMeetings} de {plan.total_meetings}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Health Score Section */}
      {contactId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HeartPulse className="h-5 w-5" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isHealthLoading ? (
              <div className="h-32 bg-muted animate-pulse rounded" />
            ) : clientHealth ? (
              <div className="space-y-4">
                {/* Overall Score */}
                <div className="flex items-center gap-4">
                  <div 
                    className={`w-20 h-20 rounded-full flex items-center justify-center ${CATEGORY_CONFIG[clientHealth.category].lightBg}`}
                  >
                    <span className={`text-2xl font-bold ${CATEGORY_CONFIG[clientHealth.category].textColor}`}>
                      {clientHealth.totalScore}
                    </span>
                  </div>
                  <div>
                    <span className={`text-lg font-semibold ${CATEGORY_CONFIG[clientHealth.category].textColor}`}>
                      {CATEGORY_CONFIG[clientHealth.category].label}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      Faixa: {CATEGORY_CONFIG[clientHealth.category].range} pontos
                    </p>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {/* NPS */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs font-medium">NPS</span>
                    </div>
                    <p className="text-lg font-bold">+{clientHealth.breakdown.nps.score} pts</p>
                    <p className="text-xs text-muted-foreground">
                      {clientHealth.breakdown.nps.value !== null 
                        ? `Nota: ${clientHealth.breakdown.nps.value}` 
                        : 'Sem resposta'}
                    </p>
                  </div>

                  {/* Indicações */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium">Indicações</span>
                    </div>
                    <p className="text-lg font-bold">+{clientHealth.breakdown.referrals.score} pts</p>
                    <p className="text-xs text-muted-foreground">
                      {clientHealth.breakdown.referrals.count} indicaç{clientHealth.breakdown.referrals.count === 1 ? 'ão' : 'ões'}
                    </p>
                  </div>

                  {/* Pagamento */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-4 w-4 text-green-500" />
                      <span className="text-xs font-medium">Pagamento</span>
                    </div>
                    <p className="text-lg font-bold">+{clientHealth.breakdown.payment.score} pts</p>
                    <p className="text-xs text-muted-foreground">
                      {clientHealth.breakdown.payment.status}
                    </p>
                  </div>

                  {/* Cross-Sell */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-1">
                      <ShoppingBag className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-medium">Cross-Sell</span>
                    </div>
                    <p className="text-lg font-bold">+{clientHealth.breakdown.crossSell.score} pts</p>
                    <p className="text-xs text-muted-foreground">
                      {clientHealth.breakdown.crossSell.extraProductsCount} produto{clientHealth.breakdown.crossSell.extraProductsCount === 1 ? '' : 's'} extra
                    </p>
                  </div>

                  {/* Reuniões */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarCheck className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-medium">Reuniões</span>
                    </div>
                    <p className="text-lg font-bold">+{clientHealth.breakdown.meetings.score} pts</p>
                    <p className="text-xs text-muted-foreground">
                      {clientHealth.breakdown.meetings.daysSinceLastMeeting !== null 
                        ? `${clientHealth.breakdown.meetings.daysSinceLastMeeting} dias atrás`
                        : 'Sem reuniões'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Health Score não disponível para este cliente
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meetings Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cronograma de Reuniões</CardTitle>
        </CardHeader>
        <CardContent>
          {plan.plan_meetings && plan.plan_meetings.length > 0 ? (
            <ClientMeetingsTimeline meetings={plan.plan_meetings} contactId={plan.contact_id} />
          ) : (
            <p className="text-muted-foreground text-center py-4">Nenhuma reunião cadastrada</p>
          )}
        </CardContent>
      </Card>

      {/* Tasks and Minutes */}
      <div className="grid md:grid-cols-2 gap-6">
        <ClientTasksSection contactId={plan.contact_id} />
        <ClientMinutesSection contactId={plan.contact_id} />
      </div>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Contato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            {plan.contact?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{plan.contact.phone}</span>
              </div>
            )}
            {plan.contact?.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{plan.contact.email}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/contacts/${plan.contact_id}`)}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Ver Contato Completo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
