import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, CalendarClock, AlertTriangle, MessageSquare, FileText, Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAllNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useAllNotifications';

export default function NotificationHistory() {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading } = useAllNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      await markRead.mutateAsync(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
    } else if (notification.type === 'contract_update') {
      navigate('/contracts');
    } else if (notification.type === 'ticket_update') {
      navigate('/tickets');
    } else {
      navigate('/tasks');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_overdue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'ticket_update':
        return <MessageSquare className="h-4 w-4" />;
      case 'contract_update':
        return <FileText className="h-4 w-4" />;
      default:
        return <CalendarClock className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_overdue':
        return 'bg-destructive/10 text-destructive';
      case 'ticket_update':
        return 'bg-blue-100 text-blue-700';
      case 'contract_update':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Central de Notificações
            </h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 
                ? `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}` 
                : 'Todas as notificações lidas'}
            </p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || unreadCount === 0}
        >
          <Check className="h-4 w-4 mr-2" />
          Marcar todas como lidas
          {unreadCount > 0 && <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Notificações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando notificações...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma notificação encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 flex items-start gap-4',
                    !notification.is_read && 'bg-primary/5'
                  )}
                >
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="flex-1 flex items-start gap-4 text-left hover:opacity-80 transition-opacity"
                  >
                    <div className={cn('p-2 rounded-full shrink-0', getNotificationColor(notification.type))}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('font-medium', !notification.is_read && 'text-primary')}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <Badge variant="default" className="h-5 text-xs">Nova</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </button>
                  
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead.mutate(notification.id);
                      }}
                      disabled={markRead.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Marcar como lida
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
