import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DiagnosticCategory, useCreateDiagnosticCategory, useUpdateDiagnosticCategory } from '@/hooks/useDiagnosticConfig';

const ICON_OPTIONS = [
  'Shield', 'DollarSign', 'TrendingUp', 'PiggyBank', 'Wallet', 'CreditCard',
  'BarChart3', 'PieChart', 'Target', 'Award', 'Heart', 'Home', 'Car',
  'Briefcase', 'GraduationCap', 'Clock', 'AlertTriangle', 'CheckCircle'
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: DiagnosticCategory | null;
  nextOrderPosition?: number;
}

export function DiagnosticCategoryForm({ open, onOpenChange, category, nextOrderPosition = 0 }: Props) {
  const [form, setForm] = useState({
    key: '',
    name: '',
    description: '',
    icon: 'Activity',
    weight: 1,
    order_position: nextOrderPosition,
    is_active: true,
  });

  const createMutation = useCreateDiagnosticCategory();
  const updateMutation = useUpdateDiagnosticCategory();
  const isEditing = !!category;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (category) {
      setForm({
        key: category.key,
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'Activity',
        weight: category.weight,
        order_position: category.order_position,
        is_active: category.is_active,
      });
    } else {
      setForm({
        key: '',
        name: '',
        description: '',
        icon: 'Activity',
        weight: 1,
        order_position: nextOrderPosition,
        is_active: true,
      });
    }
  }, [category, nextOrderPosition, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: category.id, ...form });
      } else {
        await createMutation.mutateAsync(form);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Categoria' : 'Nova Categoria de Diagnóstico'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => {
                  setForm(f => ({
                    ...f,
                    name: e.target.value,
                    key: isEditing ? f.key : generateKey(e.target.value)
                  }));
                }}
                placeholder="Ex: Reserva de Emergência"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key">Chave (slug)</Label>
              <Input
                id="key"
                value={form.key}
                onChange={(e) => setForm(f => ({ ...f, key: e.target.value }))}
                placeholder="reserva_emergencia"
                disabled={isEditing}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descrição breve da categoria de avaliação"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Ícone</Label>
              <Select value={form.icon} onValueChange={(v) => setForm(f => ({ ...f, icon: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(icon => (
                    <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Peso</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                value={form.weight}
                onChange={(e) => setForm(f => ({ ...f, weight: parseFloat(e.target.value) || 1 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Ordem</Label>
              <Input
                id="order"
                type="number"
                min="0"
                value={form.order_position}
                onChange={(e) => setForm(f => ({ ...f, order_position: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(checked) => setForm(f => ({ ...f, is_active: checked }))}
            />
            <Label htmlFor="is_active">Categoria ativa</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !form.name || !form.key}>
              {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
