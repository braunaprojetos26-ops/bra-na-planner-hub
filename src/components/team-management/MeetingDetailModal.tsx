import { useState, useEffect } from 'react';
import { Sparkles, Loader2, FileText, Check, X, ListChecks, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OneOnOneMeeting, TopicResponses, useUpdateOneOnOneMeeting } from '@/hooks/useOneOnOneMeetings';
import { useAIPrepareMeeting } from '@/hooks/useLeadershipAI';
import { MeetingRoadmapTab } from './MeetingRoadmapTab';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MeetingDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: OneOnOneMeeting;
  plannerName: string;
}

export function MeetingDetailModal({ open, onOpenChange, meeting, plannerName }: MeetingDetailModalProps) {
  const updateMutation = useUpdateOneOnOneMeeting();
  const aiMutation = useAIPrepareMeeting();
  
  const [notes, setNotes] = useState(meeting.notes || '');
  const [aiPreparation, setAiPreparation] = useState(meeting.aiPreparation || '');
  const [topicResponses, setTopicResponses] = useState<TopicResponses>(meeting.topicResponses || {});

  // Reset state when meeting changes
  useEffect(() => {
    setNotes(meeting.notes || '');
    setAiPreparation(meeting.aiPreparation || '');
    setTopicResponses(meeting.topicResponses || {});
  }, [meeting.id, meeting.notes, meeting.aiPreparation, meeting.topicResponses]);

  const isReadOnly = meeting.status === 'completed' || meeting.status === 'cancelled';
  const hasTopics = meeting.templateTopics && meeting.templateTopics.length > 0;

  const handlePrepareWithAI = async () => {
    const result = await aiMutation.mutateAsync({
      plannerId: meeting.plannerId,
      plannerName,
      templateId: meeting.templateId || undefined,
      leaderInputs: meeting.leaderInputs,
    });
    setAiPreparation(result.preparation);
    await updateMutation.mutateAsync({
      id: meeting.id,
      plannerId: meeting.plannerId,
      aiPreparation: result.preparation,
    });
  };

  const handleComplete = async () => {
    await updateMutation.mutateAsync({
      id: meeting.id,
      plannerId: meeting.plannerId,
      status: 'completed',
      notes,
      topicResponses,
      completedAt: new Date().toISOString(),
    });
    onOpenChange(false);
  };

  const handleCancel = async () => {
    await updateMutation.mutateAsync({
      id: meeting.id,
      plannerId: meeting.plannerId,
      status: 'cancelled',
    });
    onOpenChange(false);
  };

  const handleSaveNotes = async () => {
    await updateMutation.mutateAsync({
      id: meeting.id,
      plannerId: meeting.plannerId,
      notes,
    });
  };

  const handleSaveRoadmap = async () => {
    await updateMutation.mutateAsync({
      id: meeting.id,
      plannerId: meeting.plannerId,
      topicResponses,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{meeting.templateName || 'Reunião 1:1'} com {plannerName}</DialogTitle>
            <Badge variant={meeting.status === 'completed' ? 'default' : 'secondary'}>
              {meeting.status === 'completed' ? 'Concluída' : meeting.status === 'cancelled' ? 'Cancelada' : 'Agendada'}
            </Badge>
          </div>
          {meeting.scheduledDate && (
            <p className="text-sm text-muted-foreground">
              {format(new Date(meeting.scheduledDate), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </DialogHeader>
        
        <Tabs defaultValue={hasTopics ? 'roadmap' : 'preparation'} className="flex-1 flex flex-col min-h-0">
          <TabsList className={`grid w-full ${hasTopics ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {hasTopics && (
              <TabsTrigger value="roadmap" className="gap-2">
                <ListChecks className="h-4 w-4" />
                Roteiro
              </TabsTrigger>
            )}
            <TabsTrigger value="preparation" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Preparação IA
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Notas Gerais
            </TabsTrigger>
          </TabsList>
          
          {hasTopics && (
            <TabsContent value="roadmap" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <MeetingRoadmapTab
                  topics={meeting.templateTopics || []}
                  topicResponses={topicResponses}
                  onChange={setTopicResponses}
                  onSave={handleSaveRoadmap}
                  isSaving={updateMutation.isPending}
                  isReadOnly={isReadOnly}
                />
              </ScrollArea>
            </TabsContent>
          )}
          
          <TabsContent value="preparation" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px]">
              {!aiPreparation ? (
                <div className="text-center py-8">
                  <Sparkles className="h-10 w-10 mx-auto text-primary/50 mb-3" />
                  <p className="text-muted-foreground mb-4">
                    Deixe a IA preparar sua reunião com base no perfil do colaborador
                  </p>
                  <Button onClick={handlePrepareWithAI} disabled={aiMutation.isPending}>
                    {aiMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Preparando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Preparar com IA
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/50 rounded-lg">
                  <div dangerouslySetInnerHTML={{ __html: aiPreparation.replace(/\n/g, '<br/>') }} />
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="notes" className="flex-1 min-h-0 mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Anotações Gerais da Reunião</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Registre os principais pontos discutidos, acordos, compromissos..."
                rows={12}
                disabled={isReadOnly}
              />
            </div>
            
            {!isReadOnly && (
              <Button variant="outline" onClick={handleSaveNotes} disabled={updateMutation.isPending}>
                Salvar Anotações
              </Button>
            )}
          </TabsContent>
        </Tabs>
        
        {!isReadOnly && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar Reunião
            </Button>
            <Button onClick={handleComplete}>
              <Check className="h-4 w-4 mr-2" />
              Concluir Reunião
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
