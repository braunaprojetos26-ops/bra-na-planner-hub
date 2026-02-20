import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { AlertTriangle, UserX, UserCheck } from 'lucide-react';
import {
  HierarchyUser,
  useUpdateUserPosition,
  useUpdateUserManager,
  useUpdateUserRole,
  useHierarchy,
} from '@/hooks/useHierarchy';
import { positionOptions, UserPosition, getPositionLabel } from '@/lib/positionLabels';
import { roleOptions, AppRole } from '@/lib/roleLabels';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const NONE_VALUE = '__none__';
const DEFAULT_TRANSFER_USER_ID = '5cbed278-dc51-4ad3-9ded-13267788cc57'; // Hélio Brollo Jr

interface EditUserModalProps {
  user: HierarchyUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserModal({ user, open, onOpenChange }: EditUserModalProps) {
  const [position, setPosition] = useState<string>(NONE_VALUE);
  const [managerId, setManagerId] = useState<string>(NONE_VALUE);
  const [role, setRole] = useState<AppRole>('planejador');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const { data: hierarchy } = useHierarchy();
  const updatePosition = useUpdateUserPosition();
  const updateManager = useUpdateUserManager();
  const updateRole = useUpdateUserRole();
  const { user: currentUser, role: currentRole } = useAuth();
  const queryClient = useQueryClient();

  const isEditingSelf = user?.user_id === currentUser?.id;
  const canDeactivate = currentRole === 'superadmin' || currentRole === 'gerente';

  const flattenHierarchy = (nodes: HierarchyUser[]): HierarchyUser[] => {
    return nodes.reduce((acc: HierarchyUser[], node) => {
      return [...acc, node, ...flattenHierarchy(node.children)];
    }, []);
  };

  const allUsers = hierarchy ? flattenHierarchy(hierarchy) : [];

  const getDescendantIds = (node: HierarchyUser): string[] => {
    return [node.user_id, ...node.children.flatMap(getDescendantIds)];
  };

  const excludedIds = user ? getDescendantIds(user) : [];
  const managerOptions = allUsers.filter(u => !excludedIds.includes(u.user_id));

  useEffect(() => {
    if (user) {
      setPosition(user.position || NONE_VALUE);
      setManagerId(user.manager_user_id || NONE_VALUE);
      setRole(user.role || 'planejador');
      setShowDeactivateConfirm(false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    try {
      const newPosition = position === NONE_VALUE ? null : position;
      const newManagerId = managerId === NONE_VALUE ? null : managerId;

      if (isEditingSelf && user.role === 'superadmin' && role !== 'superadmin') {
        toast.error('Você não pode remover seu próprio papel de Super Admin');
        return;
      }

      if (role !== user.role) {
        await updateRole.mutateAsync({ userId: user.user_id, role });
      }
      if (newPosition !== user.position) {
        await updatePosition.mutateAsync({ userId: user.user_id, position: newPosition as UserPosition | null });
      }
      if (newManagerId !== user.manager_user_id) {
        await updateManager.mutateAsync({ userId: user.user_id, managerId: newManagerId });
      }

      toast.success('Usuário atualizado com sucesso');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleDeactivate = async () => {
    if (!user) return;
    setIsDeactivating(true);
    try {
      const { error } = await supabase.rpc('deactivate_user', {
        _target_user_id: user.user_id,
        _transfer_to_user_id: DEFAULT_TRANSFER_USER_ID,
      });
      if (error) throw error;
      toast.success(`${user.full_name} foi inativado. Contatos transferidos.`);
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao inativar usuário:', error);
      toast.error(error.message || 'Erro ao inativar usuário');
    } finally {
      setIsDeactivating(false);
      setShowDeactivateConfirm(false);
    }
  };

  const handleReactivate = async () => {
    if (!user) return;
    setIsReactivating(true);
    try {
      const { error } = await supabase.rpc('reactivate_user', {
        _target_user_id: user.user_id,
      });
      if (error) throw error;
      toast.success(`${user.full_name} foi reativado com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao reativar usuário:', error);
      toast.error(error.message || 'Erro ao reativar usuário');
    } finally {
      setIsReactivating(false);
    }
  };

  const isLoading = updatePosition.isPending || updateManager.isPending || updateRole.isPending;
  const showSuperadminWarning = role === 'superadmin' && user?.role !== 'superadmin';
  const isUserInactive = user?.is_active === false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-4 py-4">
            {/* User name */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Nome</Label>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{user.full_name}</p>
                {isUserInactive && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                    Inativo
                  </span>
                )}
              </div>
            </div>

            {/* Role select */}
            <div className="space-y-2">
              <Label htmlFor="role">Papel no Sistema</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as AppRole)}
                disabled={isEditingSelf && user.role === 'superadmin'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditingSelf && user.role === 'superadmin' && (
                <p className="text-xs text-muted-foreground">
                  Você não pode alterar seu próprio papel de Super Admin
                </p>
              )}
            </div>

            {showSuperadminWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Atenção: Você está promovendo este usuário para Super Admin.
                  Ele terá acesso total ao sistema, incluindo gerenciar outros usuários.
                </AlertDescription>
              </Alert>
            )}

            {/* Position select */}
            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Sem cargo</SelectItem>
                  {positionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Manager select */}
            <div className="space-y-2">
              <Label htmlFor="manager">Gestor Direto</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Sem gestor (raiz)</SelectItem>
                  {managerOptions.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name} ({getPositionLabel(u.position)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deactivation / Reactivation section */}
            {canDeactivate && !isEditingSelf && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-muted-foreground">Status do Usuário</Label>

                  {isUserInactive ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleReactivate}
                      disabled={isReactivating}
                    >
                      <UserCheck className="h-4 w-4" />
                      {isReactivating ? 'Reativando...' : 'Reativar Usuário'}
                    </Button>
                  ) : showDeactivateConfirm ? (
                    <div className="space-y-3">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Tem certeza?</strong> O usuário perderá o acesso ao sistema.
                          Seus contatos serão transferidos para Hélio Brollo Jr.
                          Os dados de produção serão mantidos no histórico.
                        </AlertDescription>
                      </Alert>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowDeactivateConfirm(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 gap-2"
                          onClick={handleDeactivate}
                          disabled={isDeactivating}
                        >
                          <UserX className="h-4 w-4" />
                          {isDeactivating ? 'Inativando...' : 'Confirmar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-destructive hover:text-destructive"
                      onClick={() => setShowDeactivateConfirm(true)}
                    >
                      <UserX className="h-4 w-4" />
                      Inativar Usuário
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
