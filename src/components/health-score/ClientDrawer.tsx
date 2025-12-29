import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HealthScoreBadge } from './HealthScoreBadge';
import { CATEGORY_CONFIG, CategoryKey, HealthScoreResult } from '@/hooks/useHealthScore';
import { User, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryKey | null;
  clients: HealthScoreResult[];
  onClientClick?: (clientId: string) => void;
}

export function ClientDrawer({
  isOpen,
  onClose,
  category,
  clients,
  onClientClick,
}: ClientDrawerProps) {
  const config = category ? CATEGORY_CONFIG[category] : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {config && (
              <div className={cn('w-3 h-3 rounded-full', config.bgColor)} />
            )}
            Clientes {config?.label}
            <span className="text-muted-foreground font-normal">
              ({clients.length})
            </span>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          <div className="space-y-3">
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum cliente nesta categoria
              </p>
            ) : (
              clients.map((client) => (
                <div
                  key={client.contactId}
                  className={cn(
                    'p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
                    onClientClick && 'cursor-pointer'
                  )}
                  onClick={() => onClientClick?.(client.contactId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{client.contactName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {client.ownerName || 'Sem planejador'}
                        </p>
                      </div>
                    </div>
                    
                    <HealthScoreBadge 
                      score={client.totalScore} 
                      category={client.category}
                      variant="compact"
                    />
                  </div>
                  
                  {/* Score breakdown mini */}
                  <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-muted-foreground">NPS</p>
                      <p className={cn(
                        'font-medium',
                        client.breakdown.nps.score > 0 ? 'text-green-500' : 
                        client.breakdown.nps.score < 0 ? 'text-red-500' : 'text-muted-foreground'
                      )}>
                        {client.breakdown.nps.score > 0 ? '+' : ''}{client.breakdown.nps.score}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Indic.</p>
                      <p className={cn(
                        'font-medium',
                        client.breakdown.referrals.score > 0 ? 'text-green-500' : 'text-muted-foreground'
                      )}>
                        +{client.breakdown.referrals.score}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Pgto.</p>
                      <p className={cn(
                        'font-medium',
                        client.breakdown.payment.score >= 30 ? 'text-green-500' : 
                        client.breakdown.payment.score >= 10 ? 'text-yellow-500' : 'text-red-500'
                      )}>
                        +{client.breakdown.payment.score}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Cross</p>
                      <p className={cn(
                        'font-medium',
                        client.breakdown.crossSell.score > 0 ? 'text-green-500' : 'text-muted-foreground'
                      )}>
                        +{client.breakdown.crossSell.score}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Reun.</p>
                      <p className={cn(
                        'font-medium',
                        client.breakdown.meetings.score >= 10 ? 'text-green-500' : 
                        client.breakdown.meetings.score >= 5 ? 'text-yellow-500' : 'text-muted-foreground'
                      )}>
                        +{client.breakdown.meetings.score}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
