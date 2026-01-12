import { Mail, Check, AlertCircle, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOutlookConnection } from '@/hooks/useOutlookConnection';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OutlookConnectionCard() {
  const {
    connection,
    isLoading,
    isConnected,
    isExpired,
    isConnecting,
    connect,
    disconnect,
    isDisconnecting,
  } = useOutlookConnection();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Mail className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Microsoft Outlook</CardTitle>
              <CardDescription>Carregando...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Mail className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Microsoft Outlook</CardTitle>
              {isConnected && (
                <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                  <Check className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              )}
              {isExpired && (
                <Badge variant="destructive" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Expirado
                </Badge>
              )}
            </div>
            <CardDescription>
              Sincronize reuniões com seu calendário do Microsoft 365
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>
            Ao conectar sua conta do Outlook, as reuniões agendadas no CRM serão automaticamente 
            adicionadas ao seu calendário e os convites enviados para os participantes.
          </p>
        </div>

        {isConnected && connection && (
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <p className="text-muted-foreground">
              Conectado em{' '}
              <span className="font-medium text-foreground">
                {format(new Date(connection.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </p>
            <p className="text-muted-foreground mt-1">
              Token válido até{' '}
              <span className="font-medium text-foreground">
                {format(new Date(connection.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <Button 
              onClick={connect} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Conectar Outlook
                </>
              )}
            </Button>
          ) : (
            <>
              {isExpired && (
                <Button 
                  onClick={connect} 
                  disabled={isConnecting}
                  className="flex-1"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reconectando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reconectar
                    </>
                  )}
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => disconnect()}
                disabled={isDisconnecting}
                className={isExpired ? '' : 'w-full'}
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Desconectando...
                  </>
                ) : (
                  <>
                    <Unlink className="mr-2 h-4 w-4" />
                    Desconectar
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
