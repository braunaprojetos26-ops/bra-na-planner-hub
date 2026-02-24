import { Database, Check, Loader2, Unlink, Plug, Users, Handshake, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useRDCRM } from '@/hooks/useRDCRM';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function RDCRMConnectionCard() {
  const {
    config,
    isLoading,
    isConnected,
    testConnection,
    isTesting,
    disconnect,
    isDisconnecting,
    importContacts,
    isImportingContacts,
    importContactsResult,
    importDeals,
    isImportingDeals,
    importDealsResult,
  } = useRDCRM();

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

        {/* Import Actions */}
        {isConnected && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Importar dados</h4>

              <div className="flex flex-col gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isImportingContacts}
                      className="w-full justify-start"
                    >
                      {isImportingContacts ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importando contatos...
                        </>
                      ) : (
                        <>
                          <Users className="mr-2 h-4 w-4" />
                          Importar Contatos
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Importar contatos do RD CRM?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todos os contatos do RD Station CRM serão importados. Contatos que já
                        existem (mesmo telefone ou e-mail) serão ignorados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => importContacts()}>
                        Importar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isImportingDeals}
                      className="w-full justify-start"
                    >
                      {isImportingDeals ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importando negociações...
                        </>
                      ) : (
                        <>
                          <Handshake className="mr-2 h-4 w-4" />
                          Importar Negociações
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Importar negociações do RD CRM?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Negociações serão importadas como oportunidades. Apenas negociações
                        cujo contato já existe no sistema serão importadas. Recomendamos importar
                        os contatos primeiro.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => importDeals()}>
                        Importar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Import Results */}
              {importContactsResult && (
                <ImportResultBanner
                  label="Contatos"
                  result={importContactsResult}
                />
              )}
              {importDealsResult && (
                <ImportResultBanner
                  label="Negociações"
                  result={importDealsResult}
                />
              )}
            </div>
          </>
        )}

        {/* Connection Actions */}
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
  );
}

function ImportResultBanner({
  label,
  result,
}: {
  label: string;
  result: { total_fetched: number; imported: number; skipped: number; errors: number };
}) {
  return (
    <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
      <p className="font-medium text-foreground">Resultado — {label}</p>
      <div className="grid grid-cols-2 gap-1 text-muted-foreground">
        <span>Total encontrados:</span>
        <span className="font-medium text-foreground">{result.total_fetched}</span>
        <span>Importados:</span>
        <span className="font-medium text-green-600">{result.imported}</span>
        <span>Já existentes:</span>
        <span className="font-medium text-foreground">{result.skipped}</span>
        {result.errors > 0 && (
          <>
            <span>Erros:</span>
            <span className="font-medium text-destructive">{result.errors}</span>
          </>
        )}
      </div>
    </div>
  );
}
