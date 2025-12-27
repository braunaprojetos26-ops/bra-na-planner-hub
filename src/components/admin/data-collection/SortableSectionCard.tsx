import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, Edit, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DataCollectionSection, DataCollectionField } from '@/types/dataCollection';
import { useDataCollectionFields } from '@/hooks/useDataCollectionSchema';
import { SortableFieldRow } from './SortableFieldRow';
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

interface SortableSectionCardProps {
  section: DataCollectionSection;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onAddField: () => void;
  onEditField: (field: DataCollectionField) => void;
  onDeleteField: (fieldId: string) => void;
  onToggleFieldActive: (field: DataCollectionField) => void;
  onReorderFields: (fields: { id: string; order_position: number }[]) => void;
}

const FIELD_TYPES: { value: string; label: string }[] = [
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

export function SortableSectionCard({
  section,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onToggleActive,
  onAddField,
  onEditField,
  onDeleteField,
  onToggleFieldActive,
  onReorderFields,
}: SortableSectionCardProps) {
  const { data: fields = [] } = useDataCollectionFields(section.id);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);

      const newFields = arrayMove(fields, oldIndex, newIndex);
      const reorderedFields = newFields.map((field, index) => ({
        id: field.id,
        order_position: index,
      }));

      onReorderFields(reorderedFields);
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={!section.is_active ? 'opacity-60' : ''}>
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing touch-none"
                  type="button"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-3 hover:text-primary transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <CardTitle className="text-base font-medium">
                      {section.title}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {fields.length} campos
                    </Badge>
                    {!section.is_active && (
                      <Badge variant="outline" className="text-xs">
                        Inativo
                      </Badge>
                    )}
                  </button>
                </CollapsibleTrigger>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleActive}
                  title={section.is_active ? 'Desativar seção' : 'Ativar seção'}
                >
                  {section.is_active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir seção?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação excluirá a seção "{section.title}" e todos os seus campos.
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <DndContext
                sensors={fieldSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleFieldDragEnd}
              >
                <SortableContext
                  items={fields.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 mb-4">
                    {fields.map((field) => (
                      <SortableFieldRow
                        key={field.id}
                        field={field}
                        fieldTypes={FIELD_TYPES}
                        onEdit={() => onEditField(field)}
                        onDelete={() => onDeleteField(field.id)}
                        onToggleActive={() => onToggleFieldActive(field)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddField}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Campo
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
