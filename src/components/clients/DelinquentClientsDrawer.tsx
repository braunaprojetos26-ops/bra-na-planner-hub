import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, ChevronRight, User } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface DelinquentClient {
  clientId: string;
  clientName: string;
  contactId: string;
  overdueInstallments: number;
  overdueAmount: number;
  lastDueDate: string;
}

interface DelinquentClientsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: DelinquentClient[];
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function DelinquentClientsDrawer({ 
  open, 
  onOpenChange, 
  clients,
  isLoading 
}: DelinquentClientsDrawerProps) {
  const navigate = useNavigate();

  const totalOverdue = clients.reduce((sum, c) => sum + c.overdueAmount, 0);

  const handleClientClick = (clientId: string) => {
    onOpenChange(false);
    navigate(`/clients/${clientId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Clientes Inadimplentes
          </SheetTitle>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">
              {clients.length} cliente{clients.length !== 1 ? 's' : ''}
            </span>
            <Badge variant="destructive" className="text-sm">
              Total: {formatCurrency(totalOverdue)}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-150px)] mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                <AlertTriangle className="h-6 w-6 text-green-500" />
              </div>
              <p className="font-medium">Nenhum cliente inadimplente</p>
              <p className="text-sm">Todos os pagamentos estão em dia!</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {clients.map((client) => {
                const daysOverdue = client.lastDueDate 
                  ? differenceInDays(new Date(), parseISO(client.lastDueDate))
                  : 0;

                return (
                  <div
                    key={client.clientId}
                    onClick={() => handleClientClick(client.clientId)}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">{client.clientName}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{client.overdueInstallments} parcela{client.overdueInstallments > 1 ? 's' : ''} atrasada{client.overdueInstallments > 1 ? 's' : ''}</span>
                          {daysOverdue > 0 && (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
                              {daysOverdue} dias
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-red-600">
                        {formatCurrency(client.overdueAmount)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
