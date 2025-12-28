import { useState } from 'react';
import { Calendar, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateOneOnOneMeeting, LeaderInputs } from '@/hooks/useOneOnOneMeetings';
import { useMeetingTemplates } from '@/hooks/useMeetingTemplates';

interface NewMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plannerId: string;
  plannerName: string;
}

export function NewMeetingModal({ open, onOpenChange, plannerId, plannerName }: NewMeetingModalProps) {
  const { data: templates } = useMeetingTemplates();
  const createMutation = useCreateOneOnOneMeeting();
  
  const [templateId, setTemplateId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [leaderInputs, setLeaderInputs] = useState<LeaderInputs>({
    problems: '',
    concerns: '',
    objectives: '',
    notes: '',
  });

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      plannerId,
      templateId: templateId || undefined,
      scheduledDate: scheduledDate || undefined,
      leaderInputs,
    });
    onOpenChange(false);
    setTemplateId('');
    setScheduledDate('');
    setLeaderInputs({ problems: '', concerns: '', objectives: '', notes: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Reunião 1:1 com {plannerName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Modelo de Reunião</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Data e Hora</Label>
            <Input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Inputs para a IA preparar a reunião:</p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Problemas/Desafios</Label>
                <Textarea
                  value={leaderInputs.problems}
                  onChange={(e) => setLeaderInputs({ ...leaderInputs, problems: e.target.value })}
                  placeholder="Descreva problemas ou desafios que você percebe..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Preocupações/Aflições</Label>
                <Textarea
                  value={leaderInputs.concerns}
                  onChange={(e) => setLeaderInputs({ ...leaderInputs, concerns: e.target.value })}
                  placeholder="Algo que te preocupa sobre o colaborador..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Objetivos desta reunião</Label>
                <Textarea
                  value={leaderInputs.objectives}
                  onChange={(e) => setLeaderInputs({ ...leaderInputs, objectives: e.target.value })}
                  placeholder="O que você quer alcançar nessa reunião..."
                  rows={2}
                />
              </div>
            </div>
          </div>
          
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Reunião'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
