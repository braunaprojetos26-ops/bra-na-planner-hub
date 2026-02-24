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
import { useRDCRM, type RDCRMUser } from '@/hooks/useRDCRM';

interface RDCRMImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'contacts' | 'deals';
}

const CONTACT_STEPS = [
  { label: 'Criando usuário no sistema...', duration: 3000 },
  { label: 'Buscando negociações do RD CRM...', duration: 5000 },
  { label: 'Identificando contatos vinculados...', duration: 4000 },
  { label: 'Buscando dados completos dos contatos...', duration: 8000 },
  { label: 'Verificando duplicatas no sistema...', duration: 4000 },
  { label: 'Importando contatos...', duration: 10000 },
  { label: 'Finalizando importação...', duration: 3000 },
];

const DEAL_STEPS = [
  { label: 'Criando usuário no sistema...', duration: 3000 },
  { label: 'Buscando negociações do RD CRM...', duration: 5000 },
  { label: 'Verificando funis e etapas locais...', duration: 3000 },
  { label: 'Vinculando contatos às negociações...', duration: 6000 },
  { label: 'Importando negociações...', duration: 10000 },
  { label: 'Finalizando importação...', duration: 3000 },
];

interface ImportResultFull {
  total_fetched: number;
  imported: number;
  skipped: number;
  errors: number;
  error_details: Array<{ name: string; error: string }>;
}

export function RDCRMImportDialog({ open, onOpenChange, type }: RDCRMImportDialogProps) {
  const {
    listUsers,
    isListingUsers,
    createSystemUser,
    isCreatingUser,
    importContacts,
    isImportingContacts,
    importDeals,
    isImportingDeals,
  } = useRDCRM();

  const [users, setUsers] = useState<RDCRMUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [createUser, setCreateUser] = useState(true);
  const [importResult, setImportResult] = useState<ImportResultFull | null>(null);
  const [step, setStep] = useState<'select' | 'importing' | 'done'>('select');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isImporting = isImportingContacts || isImportingDeals || isCreatingUser;
  const isContacts = type === 'contacts';
  const steps = isContacts ? CONTACT_STEPS : DEAL_STEPS;

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedUserId('');
      setCreateUser(true);
      setImportResult(null);
      setStep('select');
      setCurrentStepIndex(0);
      setProgressValue(0);
      setShowErrors(false);
      setUsers([]);
      listUsers().then(setUsers).catch(() => {});
    }
  }, [open]);

  // Animate through steps while importing
  useEffect(() => {
    if (step !== 'importing') return;

    const advanceStep = () => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next < steps.length) {
          stepTimerRef.current = setTimeout(advanceStep, steps[next].duration);
          return next;
        }
        // Stay on last step
        return prev;
      });
    };

    // Start first step timer (skip user creation step if not creating)
    const startIdx = createUser ? 0 : 1;
    setCurrentStepIndex(startIdx);
    stepTimerRef.current = setTimeout(advanceStep, steps[startIdx].duration);

    // Animate progress bar smoothly
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
    const interval = 200;
    const increment = (90 / (totalDuration / interval)); // max 90% while waiting
    setProgressValue(0);
    progressTimerRef.current = setInterval(() => {
      setProgressValue((prev) => {
        if (prev >= 90) return 90;
        return prev + increment;
      });
    }, interval);

    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [step, createUser]);

  // When done, jump progress to 100
  useEffect(() => {
    if (step === 'done') {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setProgressValue(100);
    }
  }, [step]);

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

      const params = {
        rd_user_id: selectedUserId,
        owner_user_id: ownerUserId,
      };

      const result = isContacts
        ? await importContacts(params)
        : await importDeals(params);

      setImportResult(result);
      setStep('done');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido durante a importação';
      // Show error as a result instead of silently going back
      setImportResult({
        total_fetched: 0,
        imported: 0,
        skipped: 0,
        errors: 1,
        error_details: [{ name: 'Importação', error: errorMessage }],
      });
      setStep('done');
    }
  };

  const currentStepLabel = steps[currentStepIndex]?.label || 'Processando...';

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
                disabled={!selectedUserId || isImporting}
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
                {currentStepLabel}
              </p>
            </div>
            <p className="text-xs text-muted-foreground/60 text-center">
              Isso pode levar alguns minutos dependendo da quantidade de dados.
            </p>
          </div>
        )}

        {step === 'done' && importResult && (
          <>
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{importResult.total_fetched}</p>
                  <p className="text-xs text-muted-foreground">Encontrados no RD</p>
                </div>
                <div className="rounded-lg border bg-green-500/10 border-green-500/20 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Importados</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <p className="text-2xl font-bold text-foreground">{importResult.skipped}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Já existentes</p>
                </div>
                {importResult.errors > 0 && (
                  <div className="rounded-lg border bg-destructive/10 border-destructive/20 p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <p className="text-2xl font-bold text-destructive">{importResult.errors}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Erros</p>
                  </div>
                )}
              </div>

              {/* Error details */}
              {importResult.error_details && importResult.error_details.length > 0 && (
                <div className="rounded-lg border border-destructive/20 overflow-hidden">
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-destructive/5 hover:bg-destructive/10 transition-colors text-sm font-medium text-destructive"
                  >
                    <span>Detalhes dos erros ({importResult.error_details.length})</span>
                    {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showErrors && (
                    <ScrollArea className="max-h-48">
                      <div className="divide-y divide-border">
                        {importResult.error_details.map((err, i) => (
                          <div key={i} className="px-3 py-2 text-xs">
                            <p className="font-medium text-foreground">{err.name || 'Sem nome'}</p>
                            <p className="text-destructive/80 mt-0.5">{err.error}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
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
