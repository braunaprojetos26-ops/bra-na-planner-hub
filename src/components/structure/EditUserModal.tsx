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
import { toast } from 'sonner';
import {
  HierarchyUser,
  useUpdateUserPosition,
  useUpdateUserManager,
  useHierarchy,
} from '@/hooks/useHierarchy';
import { positionOptions, UserPosition, getPositionLabel } from '@/lib/positionLabels';

const NONE_VALUE = '__none__';

interface EditUserModalProps {
  user: HierarchyUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserModal({ user, open, onOpenChange }: EditUserModalProps) {
  const [position, setPosition] = useState<string>(NONE_VALUE);
  const [managerId, setManagerId] = useState<string>(NONE_VALUE);
  
  const { data: hierarchy } = useHierarchy();
  const updatePosition = useUpdateUserPosition();
  const updateManager = useUpdateUserManager();

  // Flatten hierarchy to get all users for manager selection
  const flattenHierarchy = (nodes: HierarchyUser[]): HierarchyUser[] => {
    return nodes.reduce((acc: HierarchyUser[], node) => {
      return [...acc, node, ...flattenHierarchy(node.children)];
    }, []);
  };

  const allUsers = hierarchy ? flattenHierarchy(hierarchy) : [];
  
  // Filter out the current user and their descendants from manager options
  const getDescendantIds = (node: HierarchyUser): string[] => {
    return [node.user_id, ...node.children.flatMap(getDescendantIds)];
  };
  
  const excludedIds = user ? getDescendantIds(user) : [];
  const managerOptions = allUsers.filter(u => !excludedIds.includes(u.user_id));

  useEffect(() => {
    if (user) {
      setPosition(user.position || NONE_VALUE);
      setManagerId(user.manager_user_id || NONE_VALUE);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      const newPosition = position === NONE_VALUE ? null : position;
      const newManagerId = managerId === NONE_VALUE ? null : managerId;

      // Update position if changed
      if (newPosition !== user.position) {
        await updatePosition.mutateAsync({
          userId: user.user_id,
          position: newPosition as UserPosition | null,
        });
      }

      // Update manager if changed
      if (newManagerId !== user.manager_user_id) {
        await updateManager.mutateAsync({
          userId: user.user_id,
          managerId: newManagerId,
        });
      }

      toast.success('Usuário atualizado com sucesso');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const isLoading = updatePosition.isPending || updateManager.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-4 py-4">
            {/* User name (read-only) */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Nome</Label>
              <p className="text-sm font-medium">{user.full_name}</p>
            </div>

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
