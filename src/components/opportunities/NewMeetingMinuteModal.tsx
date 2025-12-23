import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  Sparkles, 
  PenLine, 
  Calendar,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCreateMeetingMinute } from '@/hooks/useMeetingMinutes';
import { useToast } from '@/hooks/use-toast';

interface NewMeetingMinuteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  meetingId?: string;
}

export function NewMeetingMinuteModal({
  open,
  onOpenChange,
  contactId,
  contactName,
  meetingId,
}: NewMeetingMinuteModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('ai');
  const [meetingType, setMeetingType] = useState('');
  const [meetingDate, setMeetingDate] = useState<Date>(new Date());
  const [content, setContent] = useState('');
  const [transcription, setTranscription] = useState('');
  const [aiGeneratedContent, setAiGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const createMutation = useCreateMeetingMinute();
  const { toast } = useToast();

  const resetForm = useCallback(() => {
    setMeetingType('');
    setMeetingDate(new Date());
    setContent('');
    setTranscription('');
    setAiGeneratedContent('');
    setIsGenerating(false);
    setActiveTab('ai');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [onOpenChange, resetForm]);

  const handleGenerateWithAI = useCallback(async () => {
    if (!transcription.trim()) {
      toast({
        title: 'Transcrição vazia',
        description: 'Cole a transcrição da reunião para gerar a ata.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setAiGeneratedContent('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Você precisa estar logado para usar a IA.');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Transcrição da reunião com ${contactName}:\n\n${transcription}`,
            },
          ],
          type: 'meeting',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar ata');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setAiGeneratedContent(fullContent);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setAiGeneratedContent(fullContent);
            }
          } catch { /* ignore */ }
        }
      }

      // Clean up client ID line and extract meeting type
      const cleanContent = fullContent.replace(/\n?\[CLIENTE_ID:.*\]/g, '').trim();
      setAiGeneratedContent(cleanContent);

      // Try to extract meeting type from generated content
      const typeMatch = cleanContent.match(/\*\*Tipo de Reunião:\*\*\s*([^\n]+)/i) ||
                        cleanContent.match(/Tipo de Reunião:\s*([^\n]+)/i);
      if (typeMatch && !meetingType) {
        setMeetingType(typeMatch[1].trim());
      }

      toast({
        title: 'Ata gerada',
        description: 'Revise o conteúdo e clique em Salvar.',
      });
    } catch (error) {
      console.error('Error generating meeting minute:', error);
      toast({
        title: 'Erro ao gerar ata',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [transcription, contactName, meetingType, toast]);

  const handleCopyToManual = useCallback(() => {
    setContent(aiGeneratedContent);
    setActiveTab('manual');
    toast({
      title: 'Conteúdo copiado',
      description: 'Você pode editar o conteúdo antes de salvar.',
    });
  }, [aiGeneratedContent, toast]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(aiGeneratedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar para a área de transferência.',
        variant: 'destructive',
      });
    }
  }, [aiGeneratedContent, toast]);

  const handleSave = useCallback(async () => {
    const finalContent = activeTab === 'ai' ? aiGeneratedContent : content;
    const finalMeetingType = meetingType.trim() || 'Reunião';

    if (!finalContent.trim()) {
      toast({
        title: 'Conteúdo vazio',
        description: 'Adicione o conteúdo da ata antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      contact_id: contactId,
      meeting_id: meetingId || null,
      meeting_type: finalMeetingType,
      meeting_date: meetingDate.toISOString(),
      content: finalContent,
    }, {
      onSuccess: () => {
        handleClose();
      },
    });
  }, [activeTab, aiGeneratedContent, content, meetingType, meetingDate, contactId, meetingId, createMutation, handleClose, toast]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Nova Ata de Reunião
          </DialogTitle>
          <DialogDescription>
            Crie uma nova ata para {contactName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'ai')} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Criar com IA
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              Escrever manualmente
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto py-4 space-y-4">
            {/* Common fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meeting-type">Tipo de Reunião</Label>
                <Input
                  id="meeting-type"
                  placeholder="Ex: Reunião de Planejamento"
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data da Reunião</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !meetingDate && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {meetingDate ? format(meetingDate, 'PPP', { locale: ptBR }) : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={meetingDate}
                      onSelect={(date) => date && setMeetingDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <TabsContent value="ai" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transcription">
                  Cole a transcrição da reunião
                </Label>
                <Textarea
                  id="transcription"
                  placeholder="Cole aqui a transcrição completa da reunião..."
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>

              <Button 
                onClick={handleGenerateWithAI} 
                disabled={isGenerating || !transcription.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando ata...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Ata com IA
                  </>
                )}
              </Button>

              {aiGeneratedContent && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Ata Gerada</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyToClipboard}
                        className="h-7 text-xs"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copiar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyToManual}
                        className="h-7 text-xs"
                      >
                        <PenLine className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-md p-4 bg-secondary/30 max-h-[250px] overflow-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                      {aiGeneratedContent}
                    </pre>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo da Ata</Label>
                <Textarea
                  id="content"
                  placeholder="Escreva o conteúdo da ata de reunião..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px] resize-none"
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={createMutation.isPending || (activeTab === 'ai' ? !aiGeneratedContent.trim() : !content.trim())}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Ata'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
