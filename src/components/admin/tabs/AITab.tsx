import { useState } from 'react';
import { Plus, Pencil, Trash2, Brain, Bot, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useAssistantKnowledge,
  useCreateKnowledge,
  useUpdateKnowledge,
  useDeleteKnowledge,
  KnowledgeCategory,
  AssistantKnowledge,
} from '@/hooks/useAssistantKnowledge';
import { useAllDiagnosticCategories, DiagnosticCategory } from '@/hooks/useDiagnosticConfig';
import { AdminDiagnosticCategoryCard } from '@/components/admin/diagnostic/DiagnosticCategoryCard';
import { DiagnosticCategoryForm } from '@/components/admin/diagnostic/DiagnosticCategoryForm';

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  processo: 'Processos',
  faq: 'FAQ',
  linguagem: 'Linguagem',
  regra: 'Regras',
};

const CATEGORY_DESCRIPTIONS: Record<KnowledgeCategory, string> = {
  processo: 'Procedimentos e fluxos internos da Brauna',
  faq: 'Perguntas frequentes sobre produtos e serviços',
  linguagem: 'Tom de voz e vocabulário a ser utilizado',
  regra: 'Políticas internas e regras de negócio',
};

export function AITab() {
  const [activeSection, setActiveSection] = useState<'diagnostic' | 'assistant'>('diagnostic');

  return (
    <div className="space-y-6">
      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as 'diagnostic' | 'assistant')}>
        <TabsList>
          <TabsTrigger value="diagnostic" className="gap-2">
            <Brain className="h-4 w-4" />
            Diagnóstico IA
          </TabsTrigger>
          <TabsTrigger value="assistant" className="gap-2">
            <Bot className="h-4 w-4" />
            Assistente IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostic" className="space-y-6 mt-6">
          <DiagnosticSection />
        </TabsContent>

        <TabsContent value="assistant" className="space-y-6 mt-6">
          <AssistantSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DiagnosticSection() {
  const { data: categories = [], isLoading } = useAllDiagnosticCategories();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DiagnosticCategory | null>(null);

  const handleEdit = (category: DiagnosticCategory) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingCategory(null);
    }
  };

  const nextOrderPosition = categories.length > 0 
    ? Math.max(...categories.map(c => c.order_position)) + 1 
    : 0;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Configurar Diagnóstico por IA</h3>
          <p className="text-sm text-muted-foreground">
            Defina as categorias e regras de avaliação para o diagnóstico financeiro
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Como funciona:</strong> Cada categoria de diagnóstico possui regras de avaliação. 
          A IA usa os <strong>prompts</strong> para entender como avaliar e os <strong>campos de dados</strong> 
          para saber quais informações da coleta utilizar. Ajuste o <strong>peso</strong> para dar mais 
          importância a determinadas categorias na nota geral.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Carregando categorias...
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">Nenhuma categoria configurada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie categorias de diagnóstico para que a IA possa avaliar seus clientes.
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <AdminDiagnosticCategoryCard
              key={category.id}
              category={category}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <DiagnosticCategoryForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        category={editingCategory}
        nextOrderPosition={nextOrderPosition}
      />
    </>
  );
}

function AssistantSection() {
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory>('processo');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssistantKnowledge | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  const { data: knowledge, isLoading } = useAssistantKnowledge(selectedCategory);
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  const deleteKnowledge = useDeleteKnowledge();

  const handleOpenDialog = (item?: AssistantKnowledge) => {
    if (item) {
      setEditingItem(item);
      setFormData({ title: item.title, content: item.content });
    } else {
      setEditingItem(null);
      setFormData({ title: '', content: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ title: '', content: '' });
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    if (editingItem) {
      await updateKnowledge.mutateAsync({
        id: editingItem.id,
        title: formData.title,
        content: formData.content,
      });
    } else {
      await createKnowledge.mutateAsync({
        category: selectedCategory,
        title: formData.title,
        content: formData.content,
      });
    }
    handleCloseDialog();
  };

  const handleToggleActive = async (item: AssistantKnowledge) => {
    await updateKnowledge.mutateAsync({
      id: item.id,
      is_active: !item.is_active,
    });
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteKnowledge.mutateAsync(deletingId);
    setIsDeleteDialogOpen(false);
    setDeletingId(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Base de Conhecimento</CardTitle>
              <CardDescription>
                Adicione processos, FAQs, linguagem e regras que o assistente deve conhecer.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as KnowledgeCategory)}>
            <TabsList className="grid w-full grid-cols-4">
              {(Object.keys(CATEGORY_LABELS) as KnowledgeCategory[]).map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </TabsTrigger>
              ))}
            </TabsList>

            {(Object.keys(CATEGORY_LABELS) as KnowledgeCategory[]).map((cat) => (
              <TabsContent key={cat} value={cat}>
                <p className="text-sm text-muted-foreground mb-4">
                  {CATEGORY_DESCRIPTIONS[cat]}
                </p>

                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Carregando...</div>
                ) : !knowledge?.length ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhum conhecimento cadastrado nesta categoria.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Título</TableHead>
                        <TableHead className="w-[35%]">Prévia</TableHead>
                        <TableHead className="w-[10%] text-center">Ativo</TableHead>
                        <TableHead className="w-[15%] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {knowledge.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-[200px]">
                            {item.content.slice(0, 60)}...
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={() => handleToggleActive(item)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeletingId(item.id);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Conhecimento' : 'Novo Conhecimento'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Atualize as informações deste conhecimento.'
                : `Adicione um novo conhecimento na categoria "${CATEGORY_LABELS[selectedCategory]}".`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Como fazer onboarding de cliente"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Descreva o processo, procedimento ou informação em detalhes..."
                className="min-h-[200px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.title.trim() || !formData.content.trim()}
            >
              {editingItem ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este conhecimento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
