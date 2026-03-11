import { useState, useRef } from 'react';
import { Plus, Trash2, MessageSquareQuote, Upload, Video, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { PlannerFeedback } from '@/hooks/usePlannerFeedbacks';

interface StandaloneFeedbacksCasesEditorProps {
  feedbacks: PlannerFeedback[];
  onFeedbacksChange: (feedbacks: PlannerFeedback[]) => void;
}

export function StandaloneFeedbacksCasesEditor({
  feedbacks,
  onFeedbacksChange,
}: StandaloneFeedbacksCasesEditorProps) {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [fbClientName, setFbClientName] = useState('');
  const [fbText, setFbText] = useState('');
  const [fbMediaType, setFbMediaType] = useState<'image' | 'video' | ''>('');
  const [fbMediaUrl, setFbMediaUrl] = useState('');
  const [fbMediaSource, setFbMediaSource] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Apenas imagens e vídeos são permitidos');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFbMediaType(isImage ? 'image' : 'video');
        setFbMediaUrl(reader.result as string);
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast.error('Erro ao ler arquivo');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Erro ao processar arquivo');
      setIsUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addFeedback = () => {
    if (!fbClientName.trim()) return;
    if (!fbText.trim() && !fbMediaUrl) return;
    const newFeedback: PlannerFeedback = {
      id: crypto.randomUUID(),
      planner_id: '',
      client_name: fbClientName.trim(),
      feedback_text: fbText.trim() || null,
      media_type: fbMediaType || null,
      media_url: fbMediaUrl || null,
      is_active: true,
      order_position: feedbacks.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onFeedbacksChange([...feedbacks, newFeedback]);
    setFbClientName('');
    setFbText('');
    setFbMediaType('');
    setFbMediaUrl('');
    setFbMediaSource('upload');
    setShowFeedbackForm(false);
  };

  const removeFeedback = (id: string) => {
    onFeedbacksChange(feedbacks.filter(f => f.id !== id));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4" />
            Feedbacks de Clientes
          </CardTitle>
          {!showFeedbackForm && (
            <Button size="sm" variant="outline" onClick={() => setShowFeedbackForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Opcional — serão exibidos na proposta
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {showFeedbackForm && (
          <div className="p-3 border rounded-lg space-y-2 bg-muted/30">
            <div className="space-y-1">
              <Label className="text-xs">Nome do Cliente</Label>
              <Input
                placeholder="Ex: João Silva"
                value={fbClientName}
                onChange={(e) => setFbClientName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Texto do Feedback</Label>
              <Textarea
                placeholder="O que o cliente disse..."
                value={fbText}
                onChange={(e) => setFbText(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mídia (opcional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-1" />
                  )}
                  {isUploading ? 'Enviando...' : 'Enviar arquivo'}
                </Button>
                <Button
                  type="button"
                  variant={fbMediaSource === 'url' && fbMediaType === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (fbMediaSource === 'url' && fbMediaType === 'video') {
                      setFbMediaSource('upload');
                      setFbMediaType('');
                      setFbMediaUrl('');
                    } else {
                      setFbMediaSource('url');
                      setFbMediaType('video');
                    }
                  }}
                >
                  <Video className="w-4 h-4 mr-1" />
                  URL de vídeo
                </Button>
              </div>

              {fbMediaUrl && fbMediaSource === 'upload' && (
                <div className="relative mt-2">
                  {fbMediaType === 'image' ? (
                    <img src={fbMediaUrl} alt="Preview" className="w-full max-h-24 object-cover rounded-lg border" />
                  ) : (
                    <video src={fbMediaUrl} className="w-full max-h-24 object-cover rounded-lg border" />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-5 w-5"
                    onClick={() => { setFbMediaType(''); setFbMediaUrl(''); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {fbMediaSource === 'url' && fbMediaType === 'video' && (
                <Input
                  placeholder="URL do vídeo (YouTube, Vimeo)"
                  value={fbMediaUrl}
                  onChange={(e) => setFbMediaUrl(e.target.value)}
                  className="h-9"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addFeedback} disabled={!fbClientName.trim() || (!fbText.trim() && !fbMediaUrl)}>
                Adicionar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowFeedbackForm(false); setFbMediaType(''); setFbMediaUrl(''); setFbMediaSource('upload'); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {feedbacks.length === 0 && !showFeedbackForm && (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhum feedback adicionado
          </p>
        )}

        {feedbacks.map((fb) => (
          <div key={fb.id} className="flex items-start gap-2 p-2 border rounded-lg text-sm">
            <div className="flex-1 min-w-0">
              <p className="font-medium">{fb.client_name}</p>
              <p className="text-muted-foreground text-xs line-clamp-2">"{fb.feedback_text}"</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeFeedback(fb.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
