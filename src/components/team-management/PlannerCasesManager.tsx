import { useState } from 'react';
import { Plus, GripVertical, Trash2, Edit2, Save, X, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMyCases, useCaseMutations } from '@/hooks/usePlannerCases';
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '@/lib/proposalPricing';
import { toast } from 'sonner';

export function PlannerCasesManager() {
  const { data: cases, isLoading } = useMyCases();
  const { createCase, updateCase, deleteCase } = useCaseMutations();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    initial_value: '',
    final_value: '',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      initial_value: '',
      final_value: '',
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    const initialValue = parseCurrencyInput(formData.initial_value);
    const finalValue = parseCurrencyInput(formData.final_value);
    const advantage = finalValue && initialValue ? finalValue - initialValue : null;

    try {
      if (editingId) {
        await updateCase.mutateAsync({
          id: editingId,
          title: formData.title,
          description: formData.description || undefined,
          initial_value: initialValue || undefined,
          final_value: finalValue || undefined,
          advantage: advantage || undefined,
        });
        toast.success('Case atualizado');
      } else {
        await createCase.mutateAsync({
          title: formData.title,
          description: formData.description || null,
          initial_value: initialValue,
          final_value: finalValue,
          advantage,
        });
        toast.success('Case adicionado');
      }
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar case');
    }
  };

  const handleEdit = (caseItem: typeof cases extends (infer T)[] | undefined ? T : never) => {
    if (!caseItem) return;
    setFormData({
      title: caseItem.title,
      description: caseItem.description || '',
      initial_value: caseItem.initial_value ? formatCurrencyInput(caseItem.initial_value) : '',
      final_value: caseItem.final_value ? formatCurrencyInput(caseItem.final_value) : '',
    });
    setEditingId(caseItem.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este case?')) return;
    try {
      await deleteCase.mutateAsync(id);
      toast.success('Case removido');
    } catch (error) {
      toast.error('Erro ao remover case');
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Meus Cases de Sucesso</CardTitle>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Cases que serão exibidos nas suas propostas comerciais
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add/Edit Form */}
        {isAdding && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Título do Case *</Label>
              <Input
                placeholder="Ex: Planejamento Imobiliário"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                placeholder="Breve descrição do case..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Situação Inicial (R$)</Label>
                <Input
                  placeholder="0,00"
                  value={formData.initial_value}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    initial_value: formatCurrencyInput(parseCurrencyInput(e.target.value) || 0)
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Final (R$)</Label>
                <Input
                  placeholder="0,00"
                  value={formData.final_value}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    final_value: formatCurrencyInput(parseCurrencyInput(e.target.value) || 0)
                  }))}
                />
              </div>
            </div>

            {formData.initial_value && formData.final_value && (
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Vantagem: {formatCurrency(
                    (parseCurrencyInput(formData.final_value) || 0) - 
                    (parseCurrencyInput(formData.initial_value) || 0)
                  )}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={createCase.isPending || updateCase.isPending}>
                <Save className="w-4 h-4 mr-1" />
                {editingId ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Cases List */}
        {cases?.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum case cadastrado. Adicione cases de sucesso para exibir nas propostas.
          </p>
        )}

        <div className="space-y-2">
          {cases?.map((caseItem) => (
            <div
              key={caseItem.id}
              className="flex items-start gap-3 p-3 border rounded-lg bg-card"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground mt-1 cursor-move" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{caseItem.title}</p>
                {caseItem.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {caseItem.description}
                  </p>
                )}
                {caseItem.initial_value && caseItem.final_value && (
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-muted-foreground">
                      {formatCurrency(caseItem.initial_value)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(caseItem.final_value)}
                    </span>
                    {caseItem.advantage && (
                      <span className="text-green-600">
                        (+{formatCurrency(caseItem.advantage)})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleEdit(caseItem)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleDelete(caseItem.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
