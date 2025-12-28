import { useState } from 'react';
import { Bell, CalendarClock, AlertTriangle, MessageSquare, FileText, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNotifications, useMarkNotificationRead, Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

function NotificationItem({ notification, onClose }: { notification: Notification; onClose: () => void }) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();

  const handleClick = async () => {
    if ((notification.type === 'ticket_update' || notification.type === 'contract_update' || notification.type === 'payment') && notification.link) {
      await markRead(notification.id);
      navigate(notification.link);
    } else if (notification.type === 'contract_update' || notification.type === 'payment') {
      await markRead(notification.id);
      navigate('/contracts');
    } else {
      navigate('/tasks');
    }
    onClose();
  };

  const isOverdue = notification.type === 'task_overdue';
  const isTicket = notification.type === 'ticket_update';
  const isContract = notification.type === 'contract_update';
  const isPayment = notification.type === 'payment';

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0',
        'flex items-start gap-3'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-full shrink-0',
          isOverdue ? 'bg-destructive/10 text-destructive' : 
          isTicket ? 'bg-blue-100 text-blue-700' :
          isContract ? 'bg-emerald-100 text-emerald-700' :
          isPayment ? 'bg-amber-100 text-amber-700' :
          'bg-primary/10 text-primary'
        )}
      >
        {isOverdue ? (
          <AlertTriangle className="h-4 w-4" />
        ) : isTicket ? (
          <MessageSquare className="h-4 w-4" />
        ) : isContract ? (
          <FileText className="h-4 w-4" />
        ) : isPayment ? (
          <Wallet className="h-4 w-4" />
        ) : (
          <CalendarClock className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', isOverdue && 'text-destructive')}>
          {notification.title}
        </p>
        <p className="text-sm text-muted-foreground truncate">{notification.description}</p>
      </div>
    </button>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { notifications, todayCount, overdueCount, ticketCount, contractCount, paymentCount, dbUnreadCount, isLoading } = useNotifications();
  const navigate = useNavigate();

  const handleClose = () => setOpen(false);

  const handleViewAll = () => {
    navigate('/notifications');
    handleClose();
  };

  // Badge shows only DB notifications (can be marked as read)
  // But uses destructive color if there are overdue tasks
  const hasTasks = todayCount > 0 || overdueCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {dbUnreadCount > 0 && (
            <Badge
              variant={overdueCount > 0 ? 'destructive' : 'default'}
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center"
            >
              {dbUnreadCount > 99 ? '99+' : dbUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Notificações</h3>
          
          {/* Task reminders section */}
          {hasTasks && (
            <div className="mt-2 p-2 bg-muted/50 rounded-md">
              <p className="text-xs font-medium text-muted-foreground mb-1">Lembretes de tarefas:</p>
              <div className="flex gap-3 text-xs flex-wrap">
                {todayCount > 0 && (
                  <span className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {todayCount} para hoje
                  </span>
                )}
                {overdueCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* DB notifications section */}
          {(ticketCount > 0 || contractCount > 0 || paymentCount > 0) && (
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              {ticketCount > 0 && (
                <span className="flex items-center gap-1 text-blue-600">
                  <MessageSquare className="h-3 w-3" />
                  {ticketCount} chamado{ticketCount > 1 ? 's' : ''}
                </span>
              )}
              {contractCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <FileText className="h-3 w-3" />
                  {contractCount} contrato{contractCount > 1 ? 's' : ''}
                </span>
              )}
              {paymentCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Wallet className="h-3 w-3" />
                  {paymentCount} pagamento{paymentCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={handleClose}
              />
            ))}
          </ScrollArea>
        )}

        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={handleViewAll}
          >
            Ver central de notificações
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}