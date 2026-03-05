import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type CategoryType = 'income' | 'fixed_expense' | 'variable_expense';

interface CashFlowCategory {
  id: string;
  name: string;
  type: CategoryType;
  is_active: boolean;
  order_position: number;
}

const TYPE_LABELS: Record<CategoryType, string> = {
  income: 'Receitas',
  fixed_expense: 'Despesas Fixas',
  variable_expense: 'Despesas Variáveis',
};

const TYPE_COLORS: Record<CategoryType, string> = {
  income: 'bg-green-100 text-green-800',
  fixed_expense: 'bg-red-100 text-red-800',
  variable_expense: 'bg-orange-100 text-orange-800',
};

export function CashFlowCategoriesTab() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CategoryType>('income');
  const [filterType, setFilterType] = useState<CategoryType | 'all'>('all');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-cash-flow-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_flow_categories')
        .select('*')
        .order('type')
        .order('order_position')
        .order('name');
      if (error) throw error;
      return data as CashFlowCategory[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: CategoryType }) => {
      const { error } = await supabase
        .from('cash_flow_categories')
        .insert({ name, type, order_position: 50 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cash-flow-categories'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-categories'] });
      setNewName('');
      toast.success('Categoria adicionada');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('cash_flow_categories')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cash-flow-categories'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-categories'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cash_flow_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cash-flow-categories'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-categories'] });
      toast.success('Categoria removida');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  const filtered = filterType === 'all' ? categories : categories.filter(c => c.type === filterType);

  const grouped: Record<CategoryType, CashFlowCategory[]> = {
    income: filtered.filter(c => c.type === 'income'),
    fixed_expense: filtered.filter(c => c.type === 'fixed_expense'),
    variable_expense: filtered.filter(c => c.type === 'variable_expense'),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorias de Fluxo de Caixa</CardTitle>
        <CardDescription>
          Gerencie as opções disponíveis nos seletores de receitas e despesas da coleta de dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-sm">Nova categoria</Label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nome da categoria..."
              onKeyDown={e => {
                if (e.key === 'Enter' && newName.trim()) {
                  addMutation.mutate({ name: newName.trim(), type: newType });
                }
              }}
            />
          </div>
          <div className="w-48 space-y-1">
            <Label className="text-sm">Tipo</Label>
            <Select value={newType} onValueChange={v => setNewType(v as CategoryType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="fixed_expense">Despesa Fixa</SelectItem>
                <SelectItem value="variable_expense">Despesa Variável</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => newName.trim() && addMutation.mutate({ name: newName.trim(), type: newType })}
            disabled={!newName.trim() || addMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'income', 'fixed_expense', 'variable_expense'] as const).map(t => (
            <Button
              key={t}
              variant={filterType === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(t)}
            >
              {t === 'all' ? 'Todas' : TYPE_LABELS[t]}
              {t !== 'all' && (
                <Badge variant="secondary" className="ml-1">
                  {categories.filter(c => c.type === t).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <div className="space-y-6">
            {(Object.entries(grouped) as [CategoryType, CashFlowCategory[]][])
              .filter(([, items]) => items.length > 0)
              .map(([type, items]) => (
                <div key={type} className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">{TYPE_LABELS[type]}</h3>
                  <div className="grid gap-1">
                    {items.map(cat => (
                      <div
                        key={cat.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <span className={`text-sm flex-1 ${!cat.is_active ? 'line-through text-muted-foreground' : ''}`}>
                          {cat.name}
                        </span>
                        <Switch
                          checked={cat.is_active}
                          onCheckedChange={checked => toggleMutation.mutate({ id: cat.id, is_active: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remover "${cat.name}"?`)) {
                              deleteMutation.mutate(cat.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
