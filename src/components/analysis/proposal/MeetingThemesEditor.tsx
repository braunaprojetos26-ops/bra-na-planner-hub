import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GripVertical, Lock, Pencil, Check } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface MeetingTheme {
  id: string;
  name: string;
  locked: boolean;
}

interface MeetingThemesEditorProps {
  themes: MeetingTheme[];
  onThemesChange: (themes: MeetingTheme[]) => void;
}

function SortableThemeItem({
  theme,
  index,
  onNameChange,
}: {
  theme: MeetingTheme;
  index: number;
  onNameChange: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(theme.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: theme.id,
    disabled: theme.locked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onNameChange(theme.id, trimmed);
    } else {
      setEditValue(theme.name);
    }
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isDragging ? 'bg-accent shadow-lg border-primary/30' : 'bg-card hover:bg-accent/50'
      } ${theme.locked ? 'opacity-80' : ''}`}
    >
      {/* Drag handle or lock */}
      <div className="flex-shrink-0 w-6 flex justify-center">
        {theme.locked ? (
          <Lock className="w-4 h-4 text-muted-foreground/50" />
        ) : (
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Number */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-xs flex-shrink-0">
        {index + 1}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {editing && !theme.locked ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setEditValue(theme.name); setEditing(false); }
            }}
            className="h-8 text-sm"
            autoFocus
          />
        ) : (
          <span className="text-sm font-medium truncate block">{theme.name}</span>
        )}
      </div>

      {/* Edit button */}
      {!theme.locked && (
        <button
          onClick={() => {
            if (editing) {
              handleSave();
            } else {
              setEditValue(theme.name);
              setEditing(true);
            }
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          {editing ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

export function MeetingThemesEditor({ themes, onThemesChange }: MeetingThemesEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = themes.findIndex((t) => t.id === active.id);
    const newIndex = themes.findIndex((t) => t.id === over.id);

    // Don't allow dropping into locked positions
    if (newIndex < 3) return;

    onThemesChange(arrayMove(themes, oldIndex, newIndex));
  };

  const handleNameChange = (id: string, name: string) => {
    onThemesChange(themes.map((t) => (t.id === id ? { ...t, name } : t)));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pauta das Reuniões</CardTitle>
        <p className="text-sm text-muted-foreground">
          Arraste para reordenar ou clique no ícone de edição para alterar o tema. As 3 primeiras reuniões são fixas.
        </p>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={themes.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {themes.map((theme, index) => (
                <SortableThemeItem
                  key={theme.id}
                  theme={theme}
                  index={index}
                  onNameChange={handleNameChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}
