import { useState } from 'react';
import { Database, Check, Loader2, Unlink, Plug, Users, Handshake } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useRDCRM } from '@/hooks/useRDCRM';
import { RDCRMImportDialog } from './RDCRMImportDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function RDCRMConnectionCard() {
  const {
    config,
    isLoading,
    isConnected,
    testConnection,
    isTesting,
    disconnect,
    isDisconnecting,
  } = useRDCRM();

  const [importType, setImportType] = useState<'contacts' | 'deals' | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Database className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">RD Station CRM</CardTitle>
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Database className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">RD Station CRM</CardTitle>
                {isConnected && (
                  <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                    <Check className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                )}
              </div>
              <CardDescription>
                Importe contatos e negociações do RD Station CRM
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>
              Integração com o RD Station CRM para importação de contatos,
              negociações (oportunidades) e dados de pipeline.
            </p>
          </div>

          {isConnected && config.connected_at && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
              {config.account_name && (
                <p className="text-muted-foreground">
                  Conta:{' '}
                  <span className="font-medium text-foreground">{config.account_name}</span>
                </p>
              )}
              <p className="text-muted-foreground">
                Conectado em{' '}
                <span className="font-medium text-foreground">
                  {format(new Date(config.connected_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </p>
            </div>
          )}

          {isConnected && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Importar dados</h4>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setImportType('contacts')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Importar Contatos
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setImportType('deals')}
                  >
                    <Handshake className="mr-2 h-4 w-4" />
                    Importar Negociações
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2">
            {!isConnected ? (
              <Button
                onClick={() => testConnection()}
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testando conexão...
                  </>
                ) : (
                  <>
                    <Plug className="mr-2 h-4 w-4" />
                    Conectar RD Station CRM
                  </>
                )}
              </Button>
            ) : (
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
            )}
          </div>
        </CardContent>
      </Card>

      {importType && (
        <RDCRMImportDialog
          open={!!importType}
          onOpenChange={(open) => { if (!open) setImportType(null); }}
          type={importType}
        />
      )}
    </>
  );
}
