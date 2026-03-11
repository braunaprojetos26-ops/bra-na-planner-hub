import { useState, useEffect, useRef } from 'react';
import { Database, Check, Loader2, Unlink, Plug, Download, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRDCRM, type RDCRMUser, type ImportJobStatus } from '@/hooks/useRDCRM';
import { useToast } from '@/hooks/use-toast';
import { RDProductMappingsEditor } from './RDProductMappingsEditor';
import { RDCRMImportResults } from './RDCRMImportResults';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Iniciando importação...',
  fetching_deals: 'Buscando negociações do RD CRM...',
  importing: 'Importando contatos, negociações e contratos...',
  done: 'Importação concluída!',
  error: 'Erro na importação',
};

export function RDCRMConnectionCard() {
  const {
    config,
    isLoading,
    isConnected,
    testConnection,
    isTesting,
    disconnect,
    isDisconnecting,
    startUnifiedImport,
    isStartingUnifiedImport,
    createSystemUser,
    isCreatingUser,
    pollJobStatus,
    listUsers,
  } = useRDCRM();
  const { toast } = useToast();

  const [rdUserId, setRdUserId] = useState<string>('');
  const [rdUsers, setRdUsers] = useState<RDCRMUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [createUser, setCreateUser] = useState(true);

  // Import state
  const [jobStatus, setJobStatus] = useState<ImportJobStatus | null>(null);
  const [importStep, setImportStep] = useState<'idle' | 'importing' | 'done'>('idle');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (isConnected && rdUsers.length === 0 && !loadingUsers) {
      setLoadingUsers(true);
      listUsers().then(users => {
        setRdUsers(users);
        setLoadingUsers(false);
      }).catch(() => setLoadingUsers(false));
    }
  }, [isConnected]);

  const selectedUser = rdUsers.find((u) => u.id === rdUserId);

  const handleStartImport = async () => {
    if (!rdUserId || !selectedUser) return;

    setImportStep('importing');
    setJobStatus(null);

    try {
      // Always resolve owner - createSystemUser finds existing or creates new
      const result = await createSystemUser({
        email: selectedUser.email,
        full_name: selectedUser.name,
        skip_creation: !createUser,
      });
      const ownerUserId = result.user_id;

      const jobId = await startUnifiedImport({
        rd_user_id: rdUserId,
        owner_user_id: ownerUserId,
      });

      toast({ title: 'Importação iniciada', description: 'Buscando negociações do RD CRM...' });

      pollRef.current = setInterval(async () => {
        try {
          const status = await pollJobStatus(jobId);
          setJobStatus(status);

          if (status.status === 'done' || status.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setImportStep('done');
            if (status.status === 'done') {
              toast({ title: 'Importação concluída!' });
            } else {
              toast({ title: 'Erro na importação', description: status.error_message || 'Erro desconhecido', variant: 'destructive' });
            }
          }
        } catch {
          // ignore poll errors
        }
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setJobStatus({
        id: '',
        status: 'error',
        deals_found: 0,
        contacts_found: 0,
        contacts_imported: 0,
        contacts_skipped: 0,
        contacts_errors: 1,
        error_details: [{ name: 'Importação', error: errorMessage }],
        error_message: errorMessage,
      });
      setImportStep('done');
    }
  };

  const progressValue = (() => {
    if (!jobStatus) return 5;
    if (jobStatus.status === 'pending') return 5;
    if (jobStatus.status === 'fetching_deals') return 15;
    if (jobStatus.status === 'importing') {
      const total = jobStatus.deals_found || 1;
      const processed = (jobStatus.contacts_imported || 0) + (jobStatus.contacts_skipped || 0) + (jobStatus.contacts_errors || 0);
      return 20 + Math.min(75, (processed / total) * 75);
    }
    return 100;
  })();

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
            Integração com o RD Station CRM para importação unificada de contatos,
            negociações e contratos.
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

            {/* Product Mappings */}
            <RDProductMappingsEditor />

            <Separator />

            {/* Unified Import */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Importar dados</h4>

              <Select value={rdUserId} onValueChange={setRdUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingUsers ? "Carregando usuários..." : "Selecione o usuário do RD CRM"} />
                </SelectTrigger>
                <SelectContent>
                  {rdUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {rdUserId && selectedUser && (
                <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3">
                  <Checkbox
                    id="create-user-card"
                    checked={createUser}
                    onCheckedChange={(v) => setCreateUser(v === true)}
                  />
                  <div className="grid gap-1">
                    <Label htmlFor="create-user-card" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" />
                      Criar usuário no sistema
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Cria uma conta com o e-mail do RD CRM e define como responsável.
                      Senha padrão: <code className="text-xs bg-background px-1 rounded">Brauna@2025</code>
                    </p>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleStartImport}
                disabled={!rdUserId || importStep === 'importing' || isStartingUnifiedImport || isCreatingUser}
              >
                {importStep === 'importing' || isStartingUnifiedImport || isCreatingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Importar Contatos e Negociações
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Importa contatos, negociações (oportunidades), fontes, campanhas e contratos (para deals ganhos com produtos mapeados) em um único fluxo.
              </p>

              {/* Progress */}
              {importStep === 'importing' && (
                <div className="space-y-2 py-2">
                  <Progress value={progressValue} className="h-2 w-full" />
                  <p className="text-sm text-center text-muted-foreground animate-pulse">
                    {jobStatus ? (STATUS_LABELS[jobStatus.status] || 'Processando...') : 'Iniciando...'}
                  </p>
                  {jobStatus && jobStatus.deals_found > 0 && (
                    <p className="text-xs text-center text-muted-foreground/60">
                      {jobStatus.deals_found} negociações encontradas
                      {jobStatus.contacts_imported > 0 && ` · ${jobStatus.contacts_imported} contatos criados`}
                    </p>
                  )}
                </div>
              )}

              {/* Results */}
              {importStep === 'done' && jobStatus && (
                <RDCRMImportResults jobStatus={jobStatus} onReset={() => { setImportStep('idle'); setJobStatus(null); }} />
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
  );
}
