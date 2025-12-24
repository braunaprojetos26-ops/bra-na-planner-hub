import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAllLostReasons, useCreateLostReason, useUpdateLostReason } from '@/hooks/useFunnels';
import { SortableFunnelList } from '@/components/admin/SortableFunnelList';
import type { LostReason } from '@/types/contacts';

export default function AdminPipelines() {
  const { data: lostReasons, isLoading } = useAllLostReasons();
  const createReason = useCreateLostReason();
  const updateReason = useUpdateLostReason();

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingReason, setEditingReason] = useState<LostReason | null>(null);
  const [newReasonName, setNewReasonName] = useState('');

  const handleCreate = async () => {
    if (!newReasonName.trim()) return;
    await createReason.mutateAsync(newReasonName.trim());
    setNewReasonName('');
    setShowNewModal(false);
  };

  const handleUpdate = async (reason: LostReason, updates: Partial<LostReason>) => {
    await updateReason.mutateAsync({
      id: reason.id,
      ...updates,
    });
    setEditingReason(null);
  };

  const handleToggleActive = async (reason: LostReason) => {
    await updateReason.mutateAsync({
      id: reason.id,
      is_active: !reason.is_active,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações de Pipeline</h1>
        <p className="text-muted-foreground">Gerencie funis, etapas e configurações</p>
      </div>

      {/* Funnels Section */}
      <SortableFunnelList />

      {/* Lost Reasons */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Motivos de Perda</CardTitle>
            <CardDescription>
              Configure os motivos que podem ser selecionados ao marcar uma oportunidade como perdida
            </CardDescription>
          </div>
          <Button onClick={() => setShowNewModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Motivo
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : lostReasons?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum motivo cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px] text-center">Ativo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lostReasons?.map(reason => (
                  <TableRow key={reason.id}>
                    <TableCell className="font-medium">{reason.name}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={reason.is_active}
                        onCheckedChange={() => handleToggleActive(reason)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingReason(reason)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Reason Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Motivo de Perda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Motivo</Label>
              <Input
                value={newReasonName}
                onChange={e => setNewReasonName(e.target.value)}
                placeholder="Ex: Fechou com concorrente"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newReasonName.trim() || createReason.isPending}>
              {createReason.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Reason Modal */}
      <Dialog open={!!editingReason} onOpenChange={open => !open && setEditingReason(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Motivo de Perda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Motivo</Label>
              <Input
                value={editingReason?.name || ''}
                onChange={e => setEditingReason(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReason(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => editingReason && handleUpdate(editingReason, { name: editingReason.name })}
              disabled={updateReason.isPending}
            >
              {updateReason.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
