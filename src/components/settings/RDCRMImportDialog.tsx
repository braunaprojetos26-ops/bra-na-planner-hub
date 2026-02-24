import { useState, useEffect } from 'react';
import { Loader2, Users, Handshake, UserPlus } from 'lucide-react';
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
import { useRDCRM, type RDCRMUser } from '@/hooks/useRDCRM';

interface RDCRMImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'contacts' | 'deals';
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
  const [importResult, setImportResult] = useState<{
    total_fetched: number;
    imported: number;
    skipped: number;
    errors: number;
  } | null>(null);
  const [step, setStep] = useState<'select' | 'importing' | 'done'>('select');

  const isImporting = isImportingContacts || isImportingDeals || isCreatingUser;
  const isContacts = type === 'contacts';

  useEffect(() => {
    if (open) {
      setSelectedUserId('');
      setCreateUser(true);
      setImportResult(null);
      setStep('select');
      setUsers([]);
      listUsers().then(setUsers).catch(() => {});
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

      const params = {
        rd_user_id: selectedUserId,
        owner_user_id: ownerUserId,
      };

      const result = isContacts
        ? await importContacts(params)
        : await importDeals(params);

      setImportResult(result);
      setStep('done');
    } catch {
      setStep('select');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isContacts ? <Users className="h-5 w-5" /> : <Handshake className="h-5 w-5" />}
            Importar {isContacts ? 'Contatos' : 'Negociações'}
          </DialogTitle>
          <DialogDescription>
            Selecione um usuário do RD CRM para importar {isContacts ? 'seus contatos' : 'suas negociações'}.
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
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  'Importar'
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {isCreatingUser
                ? 'Criando usuário no sistema...'
                : `Importando ${isContacts ? 'contatos' : 'negociações'}...`}
            </p>
          </div>
        )}

        {step === 'done' && importResult && (
          <>
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="font-medium text-foreground">Resultado da importação</p>
              <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                <span>Total encontrados:</span>
                <span className="font-medium text-foreground">{importResult.total_fetched}</span>
                <span>Importados:</span>
                <span className="font-medium text-green-600">{importResult.imported}</span>
                <span>Já existentes:</span>
                <span className="font-medium text-foreground">{importResult.skipped}</span>
                {importResult.errors > 0 && (
                  <>
                    <span>Erros:</span>
                    <span className="font-medium text-destructive">{importResult.errors}</span>
                  </>
                )}
              </div>
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
