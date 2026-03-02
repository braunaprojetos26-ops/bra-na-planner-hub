import { useState } from 'react';
import { Mail, Check, Loader2, Unlink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOutlookConnection } from '@/hooks/useOutlookConnection';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OutlookConnectionCard() {
  const { user } = useAuth();
  const {
    connection,
    isLoading,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    isDisconnecting,
  } = useOutlookConnection();

  // Default to user's profile email
  const [email, setEmail] = useState('');

  const handleConnect = async () => {
    const emailToUse = email.trim() || user?.email || '';
    if (!emailToUse) return;
    await connect(emailToUse);
  };

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
            </div>
            <CardDescription>
              Sincronize reuniões com seu calendário do Microsoft 365
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <>
            <div className="text-sm text-muted-foreground">
              <p>
                Informe seu email corporativo do Microsoft 365 para vincular 
                seu calendário. As reuniões agendadas no CRM serão automaticamente 
                adicionadas ao seu calendário e os convites enviados aos participantes.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ms-email">Email do Microsoft 365</Label>
              <Input
                id="ms-email"
                type="email"
                placeholder={user?.email || 'seu.email@braunaplanejamento.com.br'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar seu email de login: {user?.email}
              </p>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando acesso...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Conectar Outlook
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <p className="text-muted-foreground">
                Email vinculado:{' '}
                <span className="font-medium text-foreground">
                  {connection?.microsoft_email}
                </span>
              </p>
              <p className="text-muted-foreground mt-1">
                Conectado em{' '}
                <span className="font-medium text-foreground">
                  {connection?.created_at && format(new Date(connection.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => disconnect()}
              disabled={isDisconnecting}
              className="w-full"
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
      </CardContent>
    </Card>
  );
}
