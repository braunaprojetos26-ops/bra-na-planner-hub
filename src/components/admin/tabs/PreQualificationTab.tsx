import { useState } from 'react';
import { Plus, GripVertical, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  usePreQualificationQuestions,
  useCreatePreQualificationQuestion,
  useUpdatePreQualificationQuestion,
  useDeletePreQualificationQuestion,
  useReorderPreQualificationQuestions,
  PreQualificationQuestion,
} from '@/hooks/usePreQualification';

const fieldTypeLabels: Record<string, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  select: 'Seleção',
  multi_select: 'Seleção múltipla',
  number: 'Número',
  boolean: 'Sim/Não',
};

interface QuestionRowProps {
  question: PreQualificationQuestion;
  onEdit: (question: PreQualificationQuestion) => void;
  onDelete: (question: PreQualificationQuestion) => void;
  onToggle: (question: PreQualificationQuestion) => void;
}

function SortableQuestionRow({ question, onEdit, onDelete, onToggle }: QuestionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-card border rounded-lg"
    >
      <button {...attributes} {...listeners} className="cursor-grab hover:text-primary">
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{question.label}</span>
          {question.is_required && (
            <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
          )}
          {!question.is_active && (
            <Badge variant="outline" className="text-xs">Inativo</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span>{fieldTypeLabels[question.field_type]}</span>
          <span>•</span>
          <span className="font-mono text-xs">{question.key}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => onToggle(question)}>
          {question.is_active ? (
            <ToggleRight className="h-5 w-5 text-green-500" />
          ) : (
            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onEdit(question)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(question)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

interface QuestionFormData {
  label: string;
  key: string;
  field_type: 'text' | 'textarea' | 'select' | 'multi_select' | 'number' | 'boolean';
  placeholder: string;
  is_required: boolean;
  options: string;
}

const defaultFormData: QuestionFormData = {
  label: '',
  key: '',
  field_type: 'textarea',
  placeholder: '',
  is_required: false,
  options: '',
};

export function PreQualificationTab() {
  const { data: questions, isLoading } = usePreQualificationQuestions();
  const createMutation = useCreatePreQualificationQuestion();
  const updateMutation = useUpdatePreQualificationQuestion();
  const deleteMutation = useDeletePreQualificationQuestion();
  const reorderMutation = useReorderPreQualificationQuestions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PreQualificationQuestion | null>(null);
  const [deleteQuestion, setDeleteQuestion] = useState<PreQualificationQuestion | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(defaultFormData);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && questions) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      const newOrder = arrayMove(questions, oldIndex, newIndex);
      reorderMutation.mutate(newOrder.map((q) => q.id));
    }
  };

  const handleOpenModal = (question?: PreQualificationQuestion) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        label: question.label,
        key: question.key,
        field_type: question.field_type,
        placeholder: question.placeholder || '',
        is_required: question.is_required,
        options: (question.options as { items?: string[] })?.items?.join('\n') || '',
      });
    } else {
      setEditingQuestion(null);
      setFormData(defaultFormData);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const data = {
      label: formData.label,
      key: formData.key.toLowerCase().replace(/\s+/g, '_'),
      field_type: formData.field_type,
      placeholder: formData.placeholder || null,
      is_required: formData.is_required,
      options: (formData.field_type === 'select' || formData.field_type === 'multi_select') && formData.options
        ? { items: formData.options.split('\n').map((s) => s.trim()).filter(Boolean) }
        : {},
      is_active: true,
      order_position: questions?.length || 0,
    };

    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, ...data }, {
        onSuccess: () => setIsModalOpen(false),
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
  };

  const handleToggle = (question: PreQualificationQuestion) => {
    updateMutation.mutate({ id: question.id, is_active: !question.is_active });
  };

  const handleDelete = () => {
    if (deleteQuestion) {
      deleteMutation.mutate(deleteQuestion.id, {
        onSuccess: () => setDeleteQuestion(null),
      });
    }
  };

  const generateKey = (label: string) => {
    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Perguntas de Pré-Qualificação</CardTitle>
              <CardDescription>
                Configure as perguntas que serão enviadas aos contatos antes da reunião de Análise.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Pergunta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {questions && questions.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {questions.map((question) => (
                    <SortableQuestionRow
                      key={question.id}
                      question={question}
                      onEdit={handleOpenModal}
                      onDelete={setDeleteQuestion}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma pergunta cadastrada.</p>
              <p className="text-sm">Clique em "Nova Pergunta" para adicionar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pergunta *</Label>
              <Input
                value={formData.label}
                onChange={(e) => {
                  const newLabel = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    label: newLabel,
                    key: editingQuestion ? prev.key : generateKey(newLabel),
                  }));
                }}
                placeholder="Ex: Qual seu principal objetivo financeiro?"
              />
            </div>

            <div className="space-y-2">
              <Label>Chave (identificador)</Label>
              <Input
                value={formData.key}
                onChange={(e) => setFormData((prev) => ({ ...prev, key: e.target.value }))}
                placeholder="objetivo_financeiro"
                disabled={!!editingQuestion}
              />
              <p className="text-xs text-muted-foreground">
                Identificador único usado internamente.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Campo</Label>
              <Select
                value={formData.field_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, field_type: value as QuestionFormData['field_type'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto curto</SelectItem>
                  <SelectItem value="textarea">Texto longo</SelectItem>
                  <SelectItem value="select">Seleção</SelectItem>
                  <SelectItem value="multi_select">Seleção múltipla</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="boolean">Sim/Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.field_type === 'select' || formData.field_type === 'multi_select') && (
              <div className="space-y-2">
                <Label>Opções (uma por linha)</Label>
                <Textarea
                  value={formData.options}
                  onChange={(e) => setFormData((prev) => ({ ...prev, options: e.target.value }))}
                  placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                  rows={4}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={formData.placeholder}
                onChange={(e) => setFormData((prev) => ({ ...prev, placeholder: e.target.value }))}
                placeholder="Texto de ajuda no campo"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Campo obrigatório</Label>
              <Switch
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_required: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.label || !formData.key || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteQuestion} onOpenChange={() => setDeleteQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pergunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a pergunta "{deleteQuestion?.label}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
