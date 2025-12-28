import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, FileText, BookOpen, GripVertical } from 'lucide-react';
import { 
  useAllMeetingTemplates, 
  useCreateMeetingTemplate, 
  useUpdateMeetingTemplate, 
  useDeleteMeetingTemplate 
} from '@/hooks/useMeetingTemplates';
import { 
  useAllLeadershipKnowledge, 
  useCreateLeadershipKnowledge, 
  useUpdateLeadershipKnowledge, 
  useDeleteLeadershipKnowledge,
  type KnowledgeCategory
} from '@/hooks/useLeadershipKnowledge';
import { toast } from 'sonner';

export function TeamManagementTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão de Equipe</CardTitle>
        <CardDescription>
          Configure modelos de reunião 1:1 e base de conhecimento para liderança
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Modelos de Reunião
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Base de Conhecimento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <MeetingTemplatesSection />
          </TabsContent>

          <TabsContent value="knowledge">
            <KnowledgeBaseSection />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function MeetingTemplatesSection() {
  const { data: templates, isLoading } = useAllMeetingTemplates();
  const createTemplate = useCreateMeetingTemplate();
  const updateTemplate = useUpdateMeetingTemplate();
  const deleteTemplate = useDeleteMeetingTemplate();
  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    templateContent: '',
    orderPosition: 0,
    isActive: true,
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.templateContent) {
      toast.error('Preencha nome e conteúdo do modelo');
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          name: formData.name,
          description: formData.description,
          templateContent: formData.templateContent,
          orderPosition: formData.orderPosition,
          isActive: formData.isActive,
        });
        toast.success('Modelo atualizado');
      } else {
        await createTemplate.mutateAsync({
          name: formData.name,
          description: formData.description,
          templateContent: formData.templateContent,
          orderPosition: formData.orderPosition,
        });
        toast.success('Modelo criado');
      }
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar modelo');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      templateContent: '',
      orderPosition: templates?.length || 0,
      isActive: true,
    });
    setEditingTemplate(null);
    setIsOpen(false);
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      templateContent: template.templateContent,
      orderPosition: template.orderPosition,
      isActive: template.isActive,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este modelo?')) {
      try {
        await deleteTemplate.mutateAsync(id);
        toast.success('Modelo excluído');
      } catch (error) {
        toast.error('Erro ao excluir modelo');
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Modelos de pauta para reuniões 1:1. A IA usará esses modelos para preparar as reuniões.
        </p>
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Modelo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Modelo' : 'Novo Modelo de Reunião'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Modelo</Label>
                  <Input
                    placeholder="Ex: Reunião Mensal de Resultados"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.orderPosition}
                    onChange={(e) => setFormData({ ...formData, orderPosition: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input
                  placeholder="Breve descrição do objetivo deste modelo"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo do Modelo</Label>
                <Textarea
                  placeholder={`# Pauta da Reunião\n\n## 1. Abertura\n- Check-in emocional\n- Como você está?\n\n## 2. Resultados\n- Métricas do período\n- Desafios encontrados\n\n## 3. Desenvolvimento\n- Pontos a desenvolver\n- Feedback\n\n## 4. Próximos Passos\n- Acordos\n- Compromissos`}
                  className="min-h-[300px] font-mono text-sm"
                  value={formData.templateContent}
                  onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Use markdown para formatar. A IA vai personalizar este modelo com base no perfil do planejador.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Modelo ativo</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingTemplate ? 'Salvar' : 'Criar Modelo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates?.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum modelo cadastrado</p>
          <p className="text-sm text-muted-foreground">
            Crie modelos de reunião para padronizar as pautas 1:1
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates?.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{template.name}</span>
                    {!template.isActive && (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(template)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeBaseSection() {
  const { data: knowledge, isLoading } = useAllLeadershipKnowledge();
  const createKnowledge = useCreateLeadershipKnowledge();
  const updateKnowledge = useUpdateLeadershipKnowledge();
  const deleteKnowledge = useDeleteLeadershipKnowledge();
  const [isOpen, setIsOpen] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'conceito' as KnowledgeCategory,
    source: '',
    isActive: true,
  });

  const categoryLabels: Record<string, string> = {
    livro: 'Livro',
    artigo: 'Artigo',
    conceito: 'Conceito',
    metodologia: 'Metodologia',
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Preencha título e conteúdo');
      return;
    }

    try {
      if (editingKnowledge) {
        await updateKnowledge.mutateAsync({
          id: editingKnowledge.id,
          title: formData.title,
          content: formData.content,
          category: formData.category,
          source: formData.source,
          isActive: formData.isActive,
        });
        toast.success('Conhecimento atualizado');
      } else {
        await createKnowledge.mutateAsync({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          source: formData.source,
        });
        toast.success('Conhecimento adicionado');
      }
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'conceito',
      source: '',
      isActive: true,
    });
    setEditingKnowledge(null);
    setIsOpen(false);
  };

  const handleEdit = (item: any) => {
    setEditingKnowledge(item);
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      source: item.source || '',
      isActive: item.isActive,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      try {
        await deleteKnowledge.mutateAsync(id);
        toast.success('Item excluído');
      } catch (error) {
        toast.error('Erro ao excluir');
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Conteúdos que a IA usará como referência para preparar reuniões e responder dúvidas.
        </p>
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Conhecimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingKnowledge ? 'Editar Conhecimento' : 'Adicionar Conhecimento'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="Ex: Liderança Situacional"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: KnowledgeCategory) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="livro">Livro</SelectItem>
                      <SelectItem value="artigo">Artigo</SelectItem>
                      <SelectItem value="conceito">Conceito</SelectItem>
                      <SelectItem value="metodologia">Metodologia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fonte (opcional)</Label>
                <Input
                  placeholder="Ex: Paul Hersey e Ken Blanchard"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea
                  placeholder="Descreva o conceito, metodologia ou resumo do livro/artigo..."
                  className="min-h-[200px]"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Quanto mais detalhado, melhor a IA poderá usar esse conhecimento.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Ativo</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingKnowledge ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {knowledge?.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Base de conhecimento vazia</p>
          <p className="text-sm text-muted-foreground">
            Adicione livros, conceitos e metodologias de liderança
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {knowledge?.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{categoryLabels[item.category]}</Badge>
                  <span className="font-medium">{item.title}</span>
                  {!item.isActive && (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
                {item.source && (
                  <p className="text-sm text-muted-foreground">Fonte: {item.source}</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.content}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(item)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
