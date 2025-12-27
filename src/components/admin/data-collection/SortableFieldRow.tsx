import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Settings2, Trash2 } from 'lucide-react';
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
import { DataCollectionField } from '@/types/dataCollection';

interface SortableFieldRowProps {
  field: DataCollectionField;
  fieldTypes: { value: string; label: string }[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

export function SortableFieldRow({ 
  field, 
  fieldTypes,
  onEdit, 
  onDelete, 
  onToggleActive 
}: SortableFieldRowProps) {
  const typeLabel = fieldTypes.find(t => t.value === field.field_type)?.label || field.field_type;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-lg border bg-background ${
        !field.is_active ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
          type="button"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div>
          <p className="font-medium text-sm">{field.label}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {typeLabel}
            </Badge>
            {field.is_required && (
              <Badge variant="secondary" className="text-xs">
                Obrigatório
              </Badge>
            )}
            {!field.is_active && (
              <Badge variant="outline" className="text-xs">
                Inativo
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleActive}
          title={field.is_active ? 'Desativar' : 'Ativar'}
        >
          {field.is_active ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Settings2 className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir campo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação excluirá o campo "{field.label}".
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
  );
}
