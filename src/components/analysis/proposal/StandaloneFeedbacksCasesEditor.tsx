import { useState, useRef } from 'react';
import { Plus, Trash2, MessageSquareQuote, TrendingUp, Upload, Video, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { PlannerFeedback } from '@/hooks/usePlannerFeedbacks';
import type { PlannerCase } from '@/hooks/usePlannerCases';

interface StandaloneFeedbacksCasesEditorProps {
  feedbacks: PlannerFeedback[];
  cases: PlannerCase[];
  onFeedbacksChange: (feedbacks: PlannerFeedback[]) => void;
  onCasesChange: (cases: PlannerCase[]) => void;
}

export function StandaloneFeedbacksCasesEditor({
  feedbacks,
  cases,
  onFeedbacksChange,
  onCasesChange,
}: StandaloneFeedbacksCasesEditorProps) {
  // Feedback form
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [fbClientName, setFbClientName] = useState('');
  const [fbText, setFbText] = useState('');
  const [fbMediaType, setFbMediaType] = useState<'image' | 'video' | ''>('');
  const [fbMediaUrl, setFbMediaUrl] = useState('');
  const [fbMediaSource, setFbMediaSource] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Case form
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [caseInitialValue, setCaseInitialValue] = useState('');
  const [caseFinalValue, setCaseFinalValue] = useState('');
  const [caseAdvantage, setCaseAdvantage] = useState('');

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

  const addCase = () => {
    if (!caseTitle.trim()) return;
    const newCase: PlannerCase = {
      id: crypto.randomUUID(),
      planner_id: '',
      title: caseTitle.trim(),
      description: caseDescription.trim() || null,
      initial_value: caseInitialValue ? parseFloat(caseInitialValue) : null,
      final_value: caseFinalValue ? parseFloat(caseFinalValue) : null,
      advantage: caseAdvantage ? parseFloat(caseAdvantage) : null,
      is_active: true,
      order_position: cases.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onCasesChange([...cases, newCase]);
    setCaseTitle('');
    setCaseDescription('');
    setCaseInitialValue('');
    setCaseFinalValue('');
    setCaseAdvantage('');
    setShowCaseForm(false);
  };

  const removeCase = (id: string) => {
    onCasesChange(cases.filter(c => c.id !== id));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Feedbacks */}
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
              <div className="flex gap-2">
                <Button size="sm" onClick={addFeedback} disabled={!fbClientName.trim() || !fbText.trim()}>
                  Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowFeedbackForm(false)}>
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

      {/* Cases */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Cases de Sucesso
            </CardTitle>
            {!showCaseForm && (
              <Button size="sm" variant="outline" onClick={() => setShowCaseForm(true)}>
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
          {showCaseForm && (
            <div className="p-3 border rounded-lg space-y-2 bg-muted/30">
              <div className="space-y-1">
                <Label className="text-xs">Título *</Label>
                <Input
                  placeholder="Ex: Otimização tributária"
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  placeholder="Descreva o case..."
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Valor Inicial</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={caseInitialValue}
                    onChange={(e) => setCaseInitialValue(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor Final</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={caseFinalValue}
                    onChange={(e) => setCaseFinalValue(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vantagem</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={caseAdvantage}
                    onChange={(e) => setCaseAdvantage(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addCase} disabled={!caseTitle.trim()}>
                  Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCaseForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {cases.length === 0 && !showCaseForm && (
            <p className="text-xs text-muted-foreground text-center py-3">
              Nenhum case adicionado
            </p>
          )}

          {cases.map((c) => (
            <div key={c.id} className="flex items-start gap-2 p-2 border rounded-lg text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{c.title}</p>
                {c.description && <p className="text-muted-foreground text-xs line-clamp-1">{c.description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeCase(c.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
