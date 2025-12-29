import { useState } from 'react';
import { Plus, GripVertical, Trash2, Edit2, Image, Video, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useMyFeedbacks, useFeedbackMutations } from '@/hooks/usePlannerFeedbacks';
import { toast } from 'sonner';

export function PlannerFeedbacksManager() {
  const { data: feedbacks, isLoading } = useMyFeedbacks();
  const { createFeedback, updateFeedback, deleteFeedback } = useFeedbackMutations();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    client_name: '',
    feedback_text: '',
    media_type: '' as '' | 'image' | 'video',
    media_url: '',
  });

  const resetForm = () => {
    setFormData({
      client_name: '',
      feedback_text: '',
      media_type: '',
      media_url: '',
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.client_name.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    if (!formData.feedback_text?.trim() && !formData.media_url?.trim()) {
      toast.error('Adicione um texto ou uma mídia');
      return;
    }

    try {
      if (editingId) {
        await updateFeedback.mutateAsync({
          id: editingId,
          client_name: formData.client_name,
          feedback_text: formData.feedback_text || undefined,
          media_type: formData.media_type || undefined,
          media_url: formData.media_url || undefined,
        });
        toast.success('Feedback atualizado');
      } else {
        await createFeedback.mutateAsync({
          client_name: formData.client_name,
          feedback_text: formData.feedback_text || null,
          media_type: formData.media_type || null,
          media_url: formData.media_url || null,
        });
        toast.success('Feedback adicionado');
      }
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar feedback');
    }
  };

  const handleEdit = (feedback: typeof feedbacks extends (infer T)[] | undefined ? T : never) => {
    if (!feedback) return;
    setFormData({
      client_name: feedback.client_name,
      feedback_text: feedback.feedback_text || '',
      media_type: (feedback.media_type as '' | 'image' | 'video') || '',
      media_url: feedback.media_url || '',
    });
    setEditingId(feedback.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este feedback?')) return;
    try {
      await deleteFeedback.mutateAsync(id);
      toast.success('Feedback removido');
    } catch (error) {
      toast.error('Erro ao remover feedback');
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Meus Feedbacks de Clientes</CardTitle>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Feedbacks que serão exibidos nas suas propostas comerciais
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add/Edit Form */}
        {isAdding && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Cliente *</Label>
              <Input
                placeholder="Ex: João Silva"
                value={formData.client_name}
                onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Texto do Feedback</Label>
              <Textarea
                placeholder="O que o cliente disse..."
                value={formData.feedback_text}
                onChange={(e) => setFormData(prev => ({ ...prev, feedback_text: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Mídia (opcional)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.media_type === 'image' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    media_type: prev.media_type === 'image' ? '' : 'image' 
                  }))}
                >
                  <Image className="w-4 h-4 mr-1" />
                  Imagem
                </Button>
                <Button
                  type="button"
                  variant={formData.media_type === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    media_type: prev.media_type === 'video' ? '' : 'video' 
                  }))}
                >
                  <Video className="w-4 h-4 mr-1" />
                  Vídeo
                </Button>
              </div>
              {formData.media_type && (
                <Input
                  placeholder={formData.media_type === 'image' ? 'URL da imagem' : 'URL do vídeo (YouTube, Vimeo)'}
                  value={formData.media_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, media_url: e.target.value }))}
                />
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={createFeedback.isPending || updateFeedback.isPending}>
                <Save className="w-4 h-4 mr-1" />
                {editingId ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Feedbacks List */}
        {feedbacks?.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum feedback cadastrado. Adicione feedbacks dos seus clientes para exibir nas propostas.
          </p>
        )}

        <div className="space-y-2">
          {feedbacks?.map((feedback) => (
            <div
              key={feedback.id}
              className="flex items-start gap-3 p-3 border rounded-lg bg-card"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground mt-1 cursor-move" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{feedback.client_name}</p>
                  {feedback.media_type && (
                    <Badge variant="secondary" className="text-[10px]">
                      {feedback.media_type === 'image' ? 'Imagem' : 'Vídeo'}
                    </Badge>
                  )}
                </div>
                {feedback.feedback_text && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    "{feedback.feedback_text}"
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleEdit(feedback)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleDelete(feedback.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
