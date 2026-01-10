import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTrainingLessons } from '@/hooks/useTrainingLessons';
import { useToast } from '@/hooks/use-toast';
import type { TrainingLesson } from '@/types/training';

interface EditLessonModalProps {
  lesson: TrainingLesson;
  onClose: () => void;
}

export function EditLessonModal({ lesson, onClose }: EditLessonModalProps) {
  const { toast } = useToast();
  const { updateLesson } = useTrainingLessons(lesson.module_id);
  
  const [name, setName] = useState(lesson.name);
  const [description, setDescription] = useState(lesson.description || '');
  const [youtubeUrl, setYoutubeUrl] = useState(lesson.youtube_video_id || '');
  const [durationMinutes, setDurationMinutes] = useState(lesson.duration_minutes?.toString() || '');

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome da aula.',
        variant: 'destructive',
      });
      return;
    }

    const youtubeId = youtubeUrl ? extractYoutubeId(youtubeUrl) : null;
    
    if (youtubeUrl && !youtubeId) {
      toast({
        title: 'URL inválida',
        description: 'Informe uma URL válida do YouTube.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateLesson.mutateAsync({
        id: lesson.id,
        name: name.trim(),
        description: description.trim() || null,
        youtube_video_id: youtubeId,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : 0,
      });

      toast({
        title: 'Aula atualizada',
        description: 'As alterações foram salvas.',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar aula',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Aula</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da aula"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da aula"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="youtubeUrl">Link do YouTube</Label>
            <Input
              id="youtubeUrl"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            <p className="text-xs text-muted-foreground">
              Cole a URL do vídeo ou apenas o ID
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duração (minutos)</Label>
            <Input
              id="duration"
              type="number"
              min="0"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="Ex: 15"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateLesson.isPending}>
              {updateLesson.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
