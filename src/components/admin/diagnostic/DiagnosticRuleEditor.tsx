import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { 
  DiagnosticRule, 
  useDiagnosticRules, 
  useCreateDiagnosticRule, 
  useUpdateDiagnosticRule, 
  useDeleteDiagnosticRule 
} from '@/hooks/useDiagnosticConfig';

interface Props {
  categoryId: string;
  categoryName: string;
}

export function DiagnosticRuleEditor({ categoryId, categoryName }: Props) {
  const { data: rules = [], isLoading } = useDiagnosticRules(categoryId);
  const createMutation = useCreateDiagnosticRule();
  const updateMutation = useUpdateDiagnosticRule();
  const deleteMutation = useDeleteDiagnosticRule();

  const [editingRule, setEditingRule] = useState<DiagnosticRule | null>(null);
  const [newDataPath, setNewDataPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState({
    evaluation_prompt: '',
    data_paths: [] as string[],
    is_active: true,
  });

  const handleSaveRule = async (rule: DiagnosticRule) => {
    await updateMutation.mutateAsync({
      id: rule.id,
      evaluation_prompt: rule.evaluation_prompt,
      data_paths: rule.data_paths,
      is_active: rule.is_active,
    });
    setEditingRule(null);
  };

  const handleCreateRule = async () => {
    await createMutation.mutateAsync({
      category_id: categoryId,
      ...newRule,
    });
    setIsCreating(false);
    setNewRule({ evaluation_prompt: '', data_paths: [], is_active: true });
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Excluir esta regra de avaliação?')) return;
    await deleteMutation.mutateAsync({ id: ruleId, categoryId });
  };

  const addDataPath = (rule: DiagnosticRule | null, path: string) => {
    if (!path.trim()) return;
    
    if (rule && editingRule) {
      setEditingRule({
        ...editingRule,
        data_paths: [...editingRule.data_paths, path.trim()]
      });
    } else if (isCreating) {
      setNewRule(r => ({
        ...r,
        data_paths: [...r.data_paths, path.trim()]
      }));
    }
    setNewDataPath('');
  };

  const removeDataPath = (rule: DiagnosticRule | null, index: number) => {
    if (rule && editingRule) {
      setEditingRule({
        ...editingRule,
        data_paths: editingRule.data_paths.filter((_, i) => i !== index)
      });
    } else if (isCreating) {
      setNewRule(r => ({
        ...r,
        data_paths: r.data_paths.filter((_, i) => i !== index)
      }));
    }
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Carregando regras...</div>;
  }

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Regras de Avaliação - {categoryName}</h4>
        {!isCreating && (
          <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Regra
          </Button>
        )}
      </div>

      {/* Create new rule form */}
      {isCreating && (
        <Card className="border-primary/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Nova Regra de Avaliação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Prompt de Avaliação *</Label>
              <Textarea
                value={newRule.evaluation_prompt}
                onChange={(e) => setNewRule(r => ({ ...r, evaluation_prompt: e.target.value }))}
                placeholder="Descreva como a IA deve avaliar esta categoria. Ex: 'Avalie a reserva de emergência. Nota 10 = reserva >= 12 meses de custos. Nota 0 = sem reserva.'"
                rows={4}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Campos de Dados Utilizados</Label>
              <div className="flex gap-2">
                <Input
                  value={newDataPath}
                  onChange={(e) => setNewDataPath(e.target.value)}
                  placeholder="Ex: orcamento.custos_fixos"
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addDataPath(null, newDataPath);
                    }
                  }}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  variant="secondary"
                  onClick={() => addDataPath(null, newDataPath)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {newRule.data_paths.map((path, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {path}
                    <button
                      type="button"
                      className="ml-1 hover:text-destructive"
                      onClick={() => removeDataPath(null, index)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={newRule.is_active}
                onCheckedChange={(checked) => setNewRule(r => ({ ...r, is_active: checked }))}
              />
              <Label className="text-xs">Regra ativa</Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                onClick={handleCreateRule}
                disabled={!newRule.evaluation_prompt || createMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                Salvar Regra
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing rules */}
      {rules.length === 0 && !isCreating ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhuma regra de avaliação definida para esta categoria.
        </p>
      ) : (
        rules.map((rule) => (
          <Card key={rule.id} className={!rule.is_active ? 'opacity-50' : ''}>
            <CardContent className="py-3 space-y-3">
              {editingRule?.id === rule.id ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Prompt de Avaliação</Label>
                    <Textarea
                      value={editingRule.evaluation_prompt}
                      onChange={(e) => setEditingRule({ ...editingRule, evaluation_prompt: e.target.value })}
                      rows={4}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Campos de Dados</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newDataPath}
                        onChange={(e) => setNewDataPath(e.target.value)}
                        placeholder="Ex: patrimonio.reserva"
                        className="text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addDataPath(rule, newDataPath);
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="secondary"
                        onClick={() => addDataPath(rule, newDataPath)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {editingRule.data_paths.map((path, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {path}
                          <button
                            type="button"
                            className="ml-1 hover:text-destructive"
                            onClick={() => removeDataPath(rule, index)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingRule.is_active}
                      onCheckedChange={(checked) => setEditingRule({ ...editingRule, is_active: checked })}
                    />
                    <Label className="text-xs">Regra ativa</Label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleSaveRule(editingRule)}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingRule(null)}>
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{rule.evaluation_prompt}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rule.data_paths.map((path, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {path}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setEditingRule(rule)}
                      >
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {!rule.is_active && (
                    <Badge variant="secondary" className="text-xs">Inativa</Badge>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
