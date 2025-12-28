import { useState } from 'react';
import { Sparkles, Loader2, FileText, Check, X } from 'lucide-react';
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
import { OneOnOneMeeting, useUpdateOneOnOneMeeting } from '@/hooks/useOneOnOneMeetings';
import { useAIPrepareMeeting } from '@/hooks/useLeadershipAI';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
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
        
        <Tabs defaultValue="preparation" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preparation">Preparação IA</TabsTrigger>
            <TabsTrigger value="notes">Ata da Reunião</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preparation" className="space-y-4">
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
              <ScrollArea className="h-[300px]">
                <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/50 rounded-lg">
                  <div dangerouslySetInnerHTML={{ __html: aiPreparation.replace(/\n/g, '<br/>') }} />
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="notes" className="space-y-4">
            <div className="space-y-2">
              <Label>Anotações da Reunião</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Registre os principais pontos discutidos..."
                rows={10}
                disabled={meeting.status === 'completed' || meeting.status === 'cancelled'}
              />
            </div>
            
            {meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
              <Button variant="outline" onClick={handleSaveNotes} disabled={updateMutation.isPending}>
                Salvar Anotações
              </Button>
            )}
          </TabsContent>
        </Tabs>
        
        {meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
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
