import { useState } from 'react';
import { 
  Plus, 
  Save,
  FileText
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  useDataCollectionSchema, 
  useDataCollectionSections, 
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useCreateField,
  useUpdateField,
  useDeleteField,
  useReorderSections,
  useReorderFields,
} from '@/hooks/useDataCollectionSchema';
import { DataCollectionSection, DataCollectionField, FieldType } from '@/types/dataCollection';
import { SortableSectionCard } from '@/components/admin/data-collection/SortableSectionCard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'textarea', label: 'Texto Longo' },
  { value: 'boolean', label: 'Sim/Não' },
  { value: 'select', label: 'Seleção Única' },
  { value: 'multi_select', label: 'Seleção Múltipla' },
  { value: 'date', label: 'Data' },
  { value: 'list', label: 'Lista Dinâmica' },
];

const ICONS = [
  'User', 'Target', 'PiggyBank', 'Building', 'TrendingUp', 
  'Home', 'CreditCard', 'Shield', 'Calculator', 'DollarSign', 'FileText'
];

export default function AdminDataCollectionBuilder() {
  const { toast } = useToast();
  const { data: schema, isLoading: schemaLoading } = useDataCollectionSchema();
  const { data: sections = [], isLoading: sectionsLoading } = useDataCollectionSections(schema?.id);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  
  // Section modal state
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<DataCollectionSection | null>(null);
  const [sectionForm, setSectionForm] = useState({
    title: '',
    key: '',
    description: '',
    icon: 'FileText',
  });

  // Field modal state
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<DataCollectionField | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [fieldForm, setFieldForm] = useState({
    label: '',
    key: '',
    field_type: 'text' as FieldType,
    description: '',
    placeholder: '',
    is_required: false,
    options: '' as string,
  });

  // Mutations
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const createField = useCreateField();
  const updateField = useUpdateField();
  const deleteField = useDeleteField();
  const reorderSections = useReorderSections();
  const reorderFields = useReorderFields();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Section drag end handler
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex);
      const reorderedSections = newSections.map((section, index) => ({
        id: section.id,
        order_position: index,
      }));

      reorderSections.mutate(reorderedSections);
      toast({ title: 'Ordem das seções atualizada!' });
    }
  };

  // Field reorder handler
  const handleReorderFields = (fields: { id: string; order_position: number }[]) => {
    reorderFields.mutate(fields);
    toast({ title: 'Ordem dos campos atualizada!' });
  };

  // Section handlers
  const openSectionModal = (section?: DataCollectionSection) => {
    if (section) {
      setEditingSection(section);
      setSectionForm({
        title: section.title,
        key: section.key,
        description: section.description || '',
        icon: section.icon || 'FileText',
      });
    } else {
      setEditingSection(null);
      setSectionForm({
        title: '',
        key: '',
        description: '',
        icon: 'FileText',
      });
    }
    setSectionModalOpen(true);
  };

  const handleSaveSection = async () => {
    if (!schema?.id) return;
    
    try {
      if (editingSection) {
        await updateSection.mutateAsync({
          id: editingSection.id,
          title: sectionForm.title,
          key: sectionForm.key,
          description: sectionForm.description || null,
          icon: sectionForm.icon,
        });
        toast({ title: 'Seção atualizada com sucesso!' });
      } else {
        await createSection.mutateAsync({
          schema_id: schema.id,
          title: sectionForm.title,
          key: sectionForm.key,
          description: sectionForm.description || null,
          icon: sectionForm.icon,
          order_position: sections.length,
        });
        toast({ title: 'Seção criada com sucesso!' });
      }
      setSectionModalOpen(false);
    } catch (error) {
      toast({ 
        title: 'Erro ao salvar seção', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await deleteSection.mutateAsync(sectionId);
      toast({ title: 'Seção excluída com sucesso!' });
    } catch (error) {
      toast({ 
        title: 'Erro ao excluir seção', 
        variant: 'destructive' 
      });
    }
  };

  // Field handlers
  const openFieldModal = (sectionId: string, field?: DataCollectionField) => {
    setCurrentSectionId(sectionId);
    if (field) {
      setEditingField(field);
      setFieldForm({
        label: field.label,
        key: field.key,
        field_type: field.field_type,
        description: field.description || '',
        placeholder: field.placeholder || '',
        is_required: field.is_required,
        options: field.options?.items?.join('\n') || '',
      });
    } else {
      setEditingField(null);
      setFieldForm({
        label: '',
        key: '',
        field_type: 'text',
        description: '',
        placeholder: '',
        is_required: false,
        options: '',
      });
    }
    setFieldModalOpen(true);
  };

  const handleSaveField = async () => {
    if (!currentSectionId) return;
    
    const section = sections.find(s => s.id === currentSectionId);
    if (!section) return;

    try {
      const fieldData = {
        section_id: currentSectionId,
        label: fieldForm.label,
        key: fieldForm.key,
        field_type: fieldForm.field_type,
        data_path: `${section.key}.${fieldForm.key}`,
        description: fieldForm.description || null,
        placeholder: fieldForm.placeholder || null,
        is_required: fieldForm.is_required,
        options: fieldForm.options 
          ? { items: fieldForm.options.split('\n').filter(Boolean) }
          : null,
        order_position: editingField 
          ? editingField.order_position 
          : (section.fields?.length || 0),
      };

      if (editingField) {
        await updateField.mutateAsync({
          id: editingField.id,
          ...fieldData
        });
        toast({ title: 'Campo atualizado com sucesso!' });
      } else {
        await createField.mutateAsync(fieldData);
        toast({ title: 'Campo criado com sucesso!' });
      }
      setFieldModalOpen(false);
    } catch (error) {
      toast({ 
        title: 'Erro ao salvar campo', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      await deleteField.mutateAsync(fieldId);
      toast({ title: 'Campo excluído com sucesso!' });
    } catch (error) {
      toast({ 
        title: 'Erro ao excluir campo', 
        variant: 'destructive' 
      });
    }
  };

  const handleToggleFieldActive = async (field: DataCollectionField) => {
    try {
      await updateField.mutateAsync({
        id: field.id,
        is_active: !field.is_active
      });
      toast({
        title: field.is_active ? 'Campo desativado' : 'Campo ativado' 
      });
    } catch (error) {
      toast({ 
        title: 'Erro ao atualizar campo', 
        variant: 'destructive' 
      });
    }
  };

  const handleToggleSectionActive = async (section: DataCollectionSection) => {
    try {
      await updateSection.mutateAsync({
        id: section.id,
        is_active: !section.is_active
      });
      toast({
        title: section.is_active ? 'Seção desativada' : 'Seção ativada' 
      });
    } catch (error) {
      toast({ 
        title: 'Erro ao atualizar seção', 
        variant: 'destructive' 
      });
    }
  };

  if (schemaLoading || sectionsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Construtor de Formulário
          </h1>
          <p className="text-muted-foreground">
            Configure os campos do formulário de coleta de dados
          </p>
        </div>
        <Button onClick={() => openSectionModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Seção
        </Button>
      </div>

      {schema && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline">{schema.name}</Badge>
              <span className="text-sm text-muted-foreground">
                Versão: {schema.version}
              </span>
              <span className="text-sm text-muted-foreground">
                {sections.length} seções
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={sections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {sections.map((section) => (
              <SortableSectionCard
                key={section.id}
                section={section}
                isExpanded={expandedSections.includes(section.id)}
                onToggle={() => toggleSection(section.id)}
                onEdit={() => openSectionModal(section)}
                onDelete={() => handleDeleteSection(section.id)}
                onToggleActive={() => handleToggleSectionActive(section)}
                onAddField={() => openFieldModal(section.id)}
                onEditField={(field) => openFieldModal(section.id, field)}
                onDeleteField={handleDeleteField}
                onToggleFieldActive={handleToggleFieldActive}
                onReorderFields={handleReorderFields}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sections.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma seção criada ainda.<br />
              Clique em "Nova Seção" para começar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Section Modal */}
      <Dialog open={sectionModalOpen} onOpenChange={setSectionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Editar Seção' : 'Nova Seção'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="section-title">Título</Label>
              <Input
                id="section-title"
                value={sectionForm.title}
                onChange={(e) => setSectionForm(prev => ({ 
                  ...prev, 
                  title: e.target.value,
                  key: editingSection ? prev.key : e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                }))}
                placeholder="Ex: Perfil do Cliente"
              />
            </div>
            <div>
              <Label htmlFor="section-key">Chave (identificador)</Label>
              <Input
                id="section-key"
                value={sectionForm.key}
                onChange={(e) => setSectionForm(prev => ({ ...prev, key: e.target.value }))}
                placeholder="Ex: profile"
                disabled={!!editingSection}
              />
            </div>
            <div>
              <Label htmlFor="section-description">Descrição</Label>
              <Textarea
                id="section-description"
                value={sectionForm.description}
                onChange={(e) => setSectionForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional da seção"
              />
            </div>
            <div>
              <Label>Ícone</Label>
              <Select
                value={sectionForm.icon}
                onValueChange={(value) => setSectionForm(prev => ({ ...prev, icon: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICONS.map(icon => (
                    <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSection} disabled={!sectionForm.title || !sectionForm.key}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Modal */}
      <Dialog open={fieldModalOpen} onOpenChange={setFieldModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Editar Campo' : 'Novo Campo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="field-label">Rótulo</Label>
                <Input
                  id="field-label"
                  value={fieldForm.label}
                  onChange={(e) => setFieldForm(prev => ({ 
                    ...prev, 
                    label: e.target.value,
                    key: editingField ? prev.key : e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                  }))}
                  placeholder="Ex: Nome Completo"
                />
              </div>
              <div>
                <Label htmlFor="field-key">Chave</Label>
                <Input
                  id="field-key"
                  value={fieldForm.key}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, key: e.target.value }))}
                  placeholder="Ex: full_name"
                  disabled={!!editingField}
                />
              </div>
            </div>
            <div>
              <Label>Tipo de Campo</Label>
              <Select
                value={fieldForm.field_type}
                onValueChange={(value: FieldType) => setFieldForm(prev => ({ ...prev, field_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="field-description">Descrição/Ajuda</Label>
              <Input
                id="field-description"
                value={fieldForm.description}
                onChange={(e) => setFieldForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Texto de ajuda para o usuário"
              />
            </div>
            <div>
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                value={fieldForm.placeholder}
                onChange={(e) => setFieldForm(prev => ({ ...prev, placeholder: e.target.value }))}
                placeholder="Texto exibido quando vazio"
              />
            </div>
            {(fieldForm.field_type === 'select' || fieldForm.field_type === 'multi_select') && (
              <div>
                <Label htmlFor="field-options">Opções (uma por linha)</Label>
                <Textarea
                  id="field-options"
                  value={fieldForm.options}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, options: e.target.value }))}
                  placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                  rows={4}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={fieldForm.is_required}
                onCheckedChange={(checked) => setFieldForm(prev => ({ ...prev, is_required: checked }))}
              />
              <Label>Campo obrigatório</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveField} disabled={!fieldForm.label || !fieldForm.key}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
