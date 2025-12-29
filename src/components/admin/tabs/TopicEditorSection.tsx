import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { MeetingTopic } from '@/hooks/useMeetingTemplates';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TopicEditorSectionProps {
  topics: MeetingTopic[];
  onChange: (topics: MeetingTopic[]) => void;
}

function SortableTopicItem({
  topic,
  onEdit,
  onDelete,
}: {
  topic: MeetingTopic;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
    >
      <button
        className="mt-1 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{topic.title}</div>
        {topic.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {topic.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function TopicEditorSection({ topics, onChange }: TopicEditorSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<MeetingTopic | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '' });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = topics.findIndex((t) => t.id === active.id);
      const newIndex = topics.findIndex((t) => t.id === over.id);
      const newTopics = arrayMove(topics, oldIndex, newIndex).map((t, idx) => ({
        ...t,
        orderPosition: idx,
      }));
      onChange(newTopics);
    }
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    if (editingTopic) {
      const updated = topics.map((t) =>
        t.id === editingTopic.id
          ? { ...t, title: formData.title, description: formData.description }
          : t
      );
      onChange(updated);
    } else {
      const newTopic: MeetingTopic = {
        id: crypto.randomUUID(),
        title: formData.title,
        description: formData.description,
        orderPosition: topics.length,
      };
      onChange([...topics, newTopic]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({ title: '', description: '' });
    setEditingTopic(null);
    setIsOpen(false);
  };

  const handleEdit = (topic: MeetingTopic) => {
    setEditingTopic(topic);
    setFormData({ title: topic.title, description: topic.description });
    setIsOpen(true);
  };

  const handleDelete = (topicId: string) => {
    const updated = topics
      .filter((t) => t.id !== topicId)
      .map((t, idx) => ({ ...t, orderPosition: idx }));
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Tópicos do Roteiro</Label>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) resetForm();
            setIsOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Tópico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTopic ? 'Editar Tópico' : 'Novo Tópico'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título do Tópico</Label>
                <Input
                  placeholder="Ex: Small Talk"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Texto Guia / Instrução</Label>
                <Textarea
                  placeholder="Ex: Como você está? Como foi sua semana?"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Este texto aparecerá como guia para o líder durante a reunião
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingTopic ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {topics.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Nenhum tópico cadastrado</p>
            <p className="text-sm">
              Adicione tópicos para criar o roteiro da reunião
            </p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={topics.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {topics
                .sort((a, b) => a.orderPosition - b.orderPosition)
                .map((topic) => (
                  <SortableTopicItem
                    key={topic.id}
                    topic={topic}
                    onEdit={() => handleEdit(topic)}
                    onDelete={() => handleDelete(topic.id)}
                  />
                ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
