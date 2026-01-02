import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Settings, Save, RefreshCw, ChevronDown, Plus, Trash2, Code, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WhatsAppSelectors {
  sidebar: string;
  chatContainer: string;
  messageRow: string;
  messageOut: string;
  messageIn: string;
  copyableText: string;
  headerTitle: string;
  dataIdAttr: string;
  textStrategies: string[];
}

interface AppConfigRow {
  key: string;
  value: WhatsAppSelectors;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function RemoteConfigTab() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSelectors, setEditedSelectors] = useState<WhatsAppSelectors | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);
  const [rawJsonValue, setRawJsonValue] = useState('');

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['app-config', 'whatsapp_selectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('key', 'whatsapp_selectors')
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        value: data.value as unknown as WhatsAppSelectors
      } as AppConfigRow;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ value, description }: { value: WhatsAppSelectors; description: string }) => {
      const { error } = await supabase
        .from('app_config')
        .update({ 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value: value as any,
          description 
        })
        .eq('key', 'whatsapp_selectors');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-config'] });
      toast.success('Configuração atualizada com sucesso!');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const handleEdit = () => {
    if (config) {
      setEditedSelectors(config.value);
      setEditedDescription(config.description || '');
      setRawJsonValue(JSON.stringify(config.value, null, 2));
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!editedSelectors) return;
    
    if (showRawJson) {
      try {
        const parsed = JSON.parse(rawJsonValue);
        updateMutation.mutate({ value: parsed, description: editedDescription });
      } catch {
        toast.error('JSON inválido. Verifique a sintaxe.');
      }
    } else {
      updateMutation.mutate({ value: editedSelectors, description: editedDescription });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedSelectors(null);
    setShowRawJson(false);
  };

  const updateSelector = (key: keyof Omit<WhatsAppSelectors, 'textStrategies'>, value: string) => {
    if (!editedSelectors) return;
    setEditedSelectors({ ...editedSelectors, [key]: value });
  };

  const updateTextStrategy = (index: number, value: string) => {
    if (!editedSelectors) return;
    const newStrategies = [...editedSelectors.textStrategies];
    newStrategies[index] = value;
    setEditedSelectors({ ...editedSelectors, textStrategies: newStrategies });
  };

  const addTextStrategy = () => {
    if (!editedSelectors) return;
    setEditedSelectors({
      ...editedSelectors,
      textStrategies: [...editedSelectors.textStrategies, '']
    });
  };

  const removeTextStrategy = (index: number) => {
    if (!editedSelectors) return;
    const newStrategies = editedSelectors.textStrategies.filter((_, i) => i !== index);
    setEditedSelectors({ ...editedSelectors, textStrategies: newStrategies });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <p className="text-destructive">Erro ao carregar configurações: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Seletores do WhatsApp</CardTitle>
                <CardDescription>
                  Configure os seletores CSS usados pela extensão do Chrome
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              whatsapp_selectors
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {config && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Última atualização: {config.updated_at 
                  ? format(new Date(config.updated_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
                  : 'Nunca'}
              </span>
            </div>
          )}

          {!isEditing ? (
            // View Mode
            <div className="space-y-4">
              {config?.description && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {config.description}
                </p>
              )}
              
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                  <ChevronDown className="h-4 w-4" />
                  Seletores Principais
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="grid gap-3 pl-6">
                    {config?.value && Object.entries(config.value)
                      .filter(([key]) => key !== 'textStrategies')
                      .map(([key, value]) => (
                        <div key={key} className="flex items-center gap-3 text-sm">
                          <code className="bg-muted px-2 py-1 rounded font-mono text-xs min-w-[140px]">
                            {key}
                          </code>
                          <code className="bg-accent/50 px-2 py-1 rounded font-mono text-xs text-accent-foreground">
                            {value as string}
                          </code>
                        </div>
                      ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                  <ChevronDown className="h-4 w-4" />
                  Estratégias de Texto ({config?.value?.textStrategies?.length || 0})
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="space-y-2 pl-6">
                    {config?.value?.textStrategies?.map((strategy, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {index + 1}
                        </Badge>
                        <code className="bg-accent/50 px-2 py-1 rounded font-mono text-xs text-accent-foreground">
                          {strategy}
                        </code>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="pt-4">
                <Button onClick={handleEdit}>
                  <Settings className="h-4 w-4 mr-2" />
                  Editar Configuração
                </Button>
              </div>
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Button
                  variant={showRawJson ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    if (showRawJson && editedSelectors) {
                      setRawJsonValue(JSON.stringify(editedSelectors, null, 2));
                    }
                    setShowRawJson(false);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Visual
                </Button>
                <Button
                  variant={showRawJson ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!showRawJson && editedSelectors) {
                      setRawJsonValue(JSON.stringify(editedSelectors, null, 2));
                    }
                    setShowRawJson(true);
                  }}
                >
                  <Code className="h-4 w-4 mr-1" />
                  JSON
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Descrição da configuração..."
                />
              </div>

              {showRawJson ? (
                <div className="space-y-2">
                  <Label>JSON</Label>
                  <Textarea
                    value={rawJsonValue}
                    onChange={(e) => setRawJsonValue(e.target.value)}
                    className="font-mono text-xs min-h-[300px]"
                    placeholder='{"sidebar": "#side", ...}'
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h4 className="font-medium">Seletores Principais</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {editedSelectors && Object.entries(editedSelectors)
                        .filter(([key]) => key !== 'textStrategies')
                        .map(([key, value]) => (
                          <div key={key} className="space-y-2">
                            <Label className="font-mono text-xs">{key}</Label>
                            <Input
                              value={value as string}
                              onChange={(e) => updateSelector(key as keyof Omit<WhatsAppSelectors, 'textStrategies'>, e.target.value)}
                              className="font-mono text-xs"
                            />
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Estratégias de Texto</h4>
                      <Button variant="outline" size="sm" onClick={addTextStrategy}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {editedSelectors?.textStrategies?.map((strategy, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-xs shrink-0">
                            {index + 1}
                          </Badge>
                          <Input
                            value={strategy}
                            onChange={(e) => updateTextStrategy(index, e.target.value)}
                            className="font-mono text-xs"
                            placeholder="Seletor CSS..."
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTextStrategy(index)}
                            className="shrink-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-4">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
