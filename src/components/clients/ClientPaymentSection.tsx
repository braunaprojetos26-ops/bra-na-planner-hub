import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CreditCard, 
  Check, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useClientPayments, PaymentInstallment } from '@/hooks/useClientPayments';

interface ClientPaymentSectionProps {
  contactId: string;
  compact?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

const statusConfig: Record<PaymentInstallment['status'], { label: string; icon: React.ReactNode; className: string }> = {
  paid: {
    label: 'Pago',
    icon: <Check className="h-4 w-4" />,
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  pending: {
    label: 'Aguardando',
    icon: <Clock className="h-4 w-4" />,
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  processing: {
    label: 'Processando',
    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  overdue: {
    label: 'Atrasado',
    icon: <AlertTriangle className="h-4 w-4" />,
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  canceled: {
    label: 'Cancelado',
    icon: <AlertTriangle className="h-4 w-4" />,
    className: 'bg-muted text-muted-foreground',
  },
};

export function ClientPaymentSection({ contactId, compact = false }: ClientPaymentSectionProps) {
  const [isOpen, setIsOpen] = useState(!compact);
  const { data, isLoading, refetch, isFetching } = useClientPayments(contactId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.totalCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum pagamento vinculado à Vindi
          </p>
        </CardContent>
      </Card>
    );
  }

  const progressPercent = data.totalCount > 0 ? Math.round((data.paidCount / data.totalCount) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamentos
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            {data.isUpToDate ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <Check className="h-3 w-3 mr-1" />
                Em dia
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {data.overdueCount} atrasada{data.overdueCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-semibold">{formatCurrency(data.totalAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pago</p>
            <p className="font-semibold text-green-600">{formatCurrency(data.paidAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Parcelas</p>
            <p className="font-semibold">{data.paidCount} de {data.totalCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pendente</p>
            <p className="font-semibold">{formatCurrency(data.totalAmount - data.paidAmount)}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Installments List */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between" size="sm">
              <span>Ver todas as parcelas</span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="rounded-lg border divide-y">
              {data.installments.map((installment) => {
                const config = statusConfig[installment.status];
                return (
                  <div 
                    key={installment.id} 
                    className="flex items-center justify-between p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-muted-foreground w-8">
                        #{installment.installmentNumber}
                      </span>
                      <div>
                        <p className="font-medium">{formatCurrency(installment.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          Venc: {installment.dueDate ? format(parseISO(installment.dueDate), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={config.className}>
                        {config.icon}
                        <span className="ml-1">{config.label}</span>
                      </Badge>
                      {installment.paidAt && installment.paidAt !== '' && (
                        <span className="text-xs text-muted-foreground">
                          em {format(parseISO(installment.paidAt), 'dd/MM', { locale: ptBR })}
                        </span>
                      )}
                      {installment.paymentUrl && installment.status !== 'paid' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(installment.paymentUrl!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
