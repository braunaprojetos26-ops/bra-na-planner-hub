import { useState, useEffect, useRef } from 'react';
import { Loader2, Users, Handshake, UserPlus, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRDCRM, type RDCRMUser, type ImportJobStatus } from '@/hooks/useRDCRM';

interface RDCRMImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'contacts' | 'deals';
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Iniciando importação...',
  fetching_deals: 'Buscando negociações do RD CRM...',
  fetching_contacts: 'Buscando contatos vinculados...',
  importing: 'Importando dados...',
  done: 'Importação concluída!',
  error: 'Erro na importação',
};

export function RDCRMImportDialog({ open, onOpenChange, type }: RDCRMImportDialogProps) {
  const {
    listUsers,
    isListingUsers,
    createSystemUser,
    isCreatingUser,
    startImport,
    isStartingImport,
    pollJobStatus,
  } = useRDCRM();

  const [users, setUsers] = useState<RDCRMUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [createUser, setCreateUser] = useState(true);
  const [step, setStep] = useState<'select' | 'importing' | 'done'>('select');
  const [jobStatus, setJobStatus] = useState<ImportJobStatus | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isContacts = type === 'contacts';

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedUserId('');
      setCreateUser(true);
      setStep('select');
      setJobStatus(null);
      setShowErrors(false);
      setUsers([]);
      listUsers().then(setUsers).catch(() => {});
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [open]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const handleImport = async () => {
    if (!selectedUserId || !selectedUser) return;

    setStep('importing');
    try {
      let ownerUserId: string | undefined;

      if (createUser) {
        const result = await createSystemUser({
          email: selectedUser.email,
          full_name: selectedUser.name,
        });
        ownerUserId = result.user_id;
      }

      // Start async import job
      const jobId = await startImport({
        rd_user_id: selectedUserId,
        import_type: type,
        owner_user_id: ownerUserId,
      });

      // Start polling every 3 seconds
      pollRef.current = setInterval(async () => {
        try {
          const status = await pollJobStatus(jobId);
          setJobStatus(status);

          if (status.status === 'done' || status.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current);
            setStep('done');
          }
        } catch (err) {
          console.error('Poll error:', err);
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
      setStep('done');
    }
  };

  const progressValue = (() => {
    if (!jobStatus) return 5;
    switch (jobStatus.status) {
      case 'pending': return 5;
      case 'fetching_deals': return 20;
      case 'fetching_contacts': return 45;
      case 'importing': return 70;
      case 'done': return 100;
      case 'error': return 100;
      default: return 10;
    }
  })();

  const currentLabel = jobStatus ? (STATUS_LABELS[jobStatus.status] || 'Processando...') : 'Iniciando...';

  return (
    <Dialog open={open} onOpenChange={step === 'importing' ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isContacts ? <Users className="h-5 w-5" /> : <Handshake className="h-5 w-5" />}
            Importar {isContacts ? 'Contatos' : 'Negociações'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && `Selecione um usuário do RD CRM para importar ${isContacts ? 'seus contatos' : 'suas negociações'}.`}
            {step === 'importing' && 'A importação está em andamento. Não feche esta janela.'}
            {step === 'done' && 'Importação concluída. Veja os resultados abaixo.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <>
            {isListingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Buscando usuários...</span>
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Nenhum usuário encontrado no RD CRM.
              </p>
            ) : (
              <div className="space-y-4">
                <RadioGroup value={selectedUserId} onValueChange={setSelectedUserId}>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors data-[state=checked]:border-primary"
                        data-state={selectedUserId === user.id ? 'checked' : 'unchecked'}
                      >
                        <RadioGroupItem value={user.id} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </RadioGroup>

                {selectedUserId && (
                  <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3">
                    <Checkbox
                      id="create-user"
                      checked={createUser}
                      onCheckedChange={(v) => setCreateUser(v === true)}
                    />
                    <div className="grid gap-1">
                      <Label htmlFor="create-user" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5" />
                        Criar usuário no sistema
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Cria uma conta com o e-mail do RD CRM e define como responsável pelos dados importados.
                        Senha padrão: <code className="text-xs bg-background px-1 rounded">Brauna@2025</code>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!selectedUserId || isCreatingUser || isStartingImport}
              >
                Importar
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center py-8 gap-5 px-4">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <div className="w-full space-y-3">
              <Progress value={progressValue} className="h-2 w-full" />
              <p className="text-sm text-center text-muted-foreground animate-pulse">
                {currentLabel}
              </p>
              {jobStatus && jobStatus.deals_found > 0 && (
                <p className="text-xs text-center text-muted-foreground/60">
                  {jobStatus.deals_found} negociações encontradas
                  {jobStatus.contacts_found > 0 && ` · ${jobStatus.contacts_found} contatos identificados`}
                  {jobStatus.contacts_imported > 0 && ` · ${jobStatus.contacts_imported} importados`}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground/60 text-center">
              Isso pode levar alguns minutos dependendo da quantidade de dados.
            </p>
          </div>
        )}

        {step === 'done' && jobStatus && (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{jobStatus.contacts_found}</p>
                  <p className="text-xs text-muted-foreground">Encontrados no RD</p>
                </div>
                <div className="rounded-lg border bg-green-500/10 border-green-500/20 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">{jobStatus.contacts_imported}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Importados</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <p className="text-2xl font-bold text-foreground">{jobStatus.contacts_skipped}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Já existentes</p>
                </div>
                {jobStatus.contacts_errors > 0 && (
                  <div className="rounded-lg border bg-destructive/10 border-destructive/20 p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <p className="text-2xl font-bold text-destructive">{jobStatus.contacts_errors}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Erros</p>
                  </div>
                )}
              </div>

              {jobStatus.error_message && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive font-medium">Erro: {jobStatus.error_message}</p>
                </div>
              )}

              {jobStatus.error_details && jobStatus.error_details.length > 0 && (
                <div className="rounded-lg border border-destructive/20 overflow-hidden">
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-destructive/5 hover:bg-destructive/10 transition-colors text-sm font-medium text-destructive"
                  >
                    <span>Detalhes dos erros ({jobStatus.error_details.length})</span>
                    {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showErrors && (
                    <div className="max-h-60 overflow-y-auto border-t border-border">
                      <div className="divide-y divide-border">
                        {jobStatus.error_details.map((err, i) => (
                          <div key={i} className="px-3 py-2 text-xs">
                            <p className="font-medium text-foreground">{err.name || 'Sem nome'}</p>
                            <p className="text-destructive/80 mt-0.5">{err.error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
