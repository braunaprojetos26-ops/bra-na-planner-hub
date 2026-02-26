import { useState, useEffect, useRef } from 'react';
import { Database, Check, Loader2, Unlink, Plug, Users, Handshake, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRDCRM, type RDCRMUser } from '@/hooks/useRDCRM';
import { useToast } from '@/hooks/use-toast';
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
    startBackfillSources,
    isStartingBackfill,
    pollJobStatus,
    listUsers,
  } = useRDCRM();
  const { toast } = useToast();

  const [importType, setImportType] = useState<'contacts' | 'deals' | null>(null);
  const [backfillJobId, setBackfillJobId] = useState<string | null>(null);
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);
  const [backfillProgress, setBackfillProgress] = useState<{ updated: number; skipped: number; errors: number; total: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [backfillRdUserId, setBackfillRdUserId] = useState<string>('');
  const [backfillUsers, setBackfillUsers] = useState<RDCRMUser[]>([]);
  const [loadingBackfillUsers, setLoadingBackfillUsers] = useState(false);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (isConnected && backfillUsers.length === 0 && !loadingBackfillUsers) {
      setLoadingBackfillUsers(true);
      listUsers().then(users => {
        setBackfillUsers(users);
        setLoadingBackfillUsers(false);
      }).catch(() => setLoadingBackfillUsers(false));
    }
  }, [isConnected]);

  const handleStartBackfill = async () => {
    try {
      const userId = backfillRdUserId && backfillRdUserId !== 'all' ? backfillRdUserId : undefined;
      const jobId = await startBackfillSources(userId);
      setBackfillJobId(jobId);
      setBackfillStatus('pending');
      toast({ title: 'Atualização de fontes iniciada', description: 'Buscando negociações do RD CRM...' });

      pollRef.current = setInterval(async () => {
        try {
          const status = await pollJobStatus(jobId);
          setBackfillStatus(status.status);
          setBackfillProgress({
            updated: status.contacts_imported || 0,
            skipped: status.contacts_skipped || 0,
            errors: status.contacts_errors || 0,
            total: status.deals_found || 0,
          });

          if (status.status === 'done' || status.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            if (status.status === 'done') {
              toast({ title: 'Fontes atualizadas!', description: `${status.contacts_imported} contatos atualizados.` });
            } else {
              toast({ title: 'Erro na atualização', description: status.error_message || 'Erro desconhecido', variant: 'destructive' });
            }
          }
        } catch {
          // ignore poll errors
        }
      }, 3000);
    } catch {
      // error handled by mutation
    }
  };

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

              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Ferramentas</h4>
                <div className="space-y-2">
                  <Select value={backfillRdUserId} onValueChange={setBackfillRdUserId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={loadingBackfillUsers ? "Carregando usuários..." : "Filtrar por usuário RD (opcional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {backfillUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleStartBackfill}
                  disabled={isStartingBackfill || (backfillStatus !== null && backfillStatus !== 'done' && backfillStatus !== 'error')}
                >
                  {isStartingBackfill || (backfillStatus && backfillStatus !== 'done' && backfillStatus !== 'error') ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atualizando fontes...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Atualizar Fontes dos Contatos
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Busca a fonte (origem) de cada negociação no RD CRM e atualiza nos contatos locais.
                </p>
                {backfillProgress && backfillStatus && backfillStatus !== 'pending' && (
                  <div className="space-y-2">
                    <Progress value={backfillProgress.total > 0 ? ((backfillProgress.updated + backfillProgress.skipped + backfillProgress.errors) / backfillProgress.total) * 100 : 0} />
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{backfillProgress.updated} atualizados</span>
                      <span>{backfillProgress.skipped} ignorados</span>
                      {backfillProgress.errors > 0 && <span className="text-destructive">{backfillProgress.errors} erros</span>}
                      <span className="ml-auto">{backfillProgress.total} negociações</span>
                    </div>
                  </div>
                )}
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
