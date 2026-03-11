import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Phone, MessageSquare, Mail, Users, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useActingUser } from '@/contexts/ActingUserContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { MeetingCycleLinkSection } from './MeetingCycleLinkSection';

const CHANNEL_OPTIONS = [
  { value: 'ligacao', label: 'Ligação', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'reuniao_presencial', label: 'Reunião Presencial', icon: Users },
  { value: 'reuniao_online', label: 'Reunião Online', icon: Monitor },
] as const;

const MEETING_CHANNELS = ['reuniao_presencial', 'reuniao_online'];

interface RegisterInteractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  taskId?: string;
}

export function RegisterInteractionModal({
  open,
  onOpenChange,
  contactId,
  contactName,
  taskId,
}: RegisterInteractionModalProps) {
  const { actingUser } = useActingUser();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [channel, setChannel] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkToCycle, setLinkToCycle] = useState(false);
  const [selectedPlanMeetingId, setSelectedPlanMeetingId] = useState<string>('');

  const isMeetingChannel = MEETING_CHANNELS.includes(channel);

  // Reset cycle linking when channel changes away from meeting
  useEffect(() => {
    if (!isMeetingChannel) {
      setLinkToCycle(false);
      setSelectedPlanMeetingId('');
    }
  }, [isMeetingChannel]);

  // Fix Radix UI bug: body keeps pointer-events:none after Dialog closes
  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      // Use multiple attempts to ensure pointer-events is cleared,
      // even if React re-renders or other dialogs interfere
      const clearPointerEvents = () => {
        document.body.style.removeProperty('pointer-events');
      };
      setTimeout(clearPointerEvents, 0);
      setTimeout(clearPointerEvents, 100);
      setTimeout(clearPointerEvents, 300);
    }
  };

  // Cleanup on unmount — ensures pointer-events is always restored
  useEffect(() => {
    return () => {
      document.body.style.removeProperty('pointer-events');
    };
  }, []);

  const handleSubmit = async () => {
    if (!channel) {
      toast.error('Selecione o canal utilizado');
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);
    try {
      const planMeetingId = linkToCycle && selectedPlanMeetingId ? selectedPlanMeetingId : null;

      // Insert into contact_interactions
      const { error: interactionError } = await supabase
        .from('contact_interactions')
        .insert({
          contact_id: contactId,
          user_id: userId,
          task_id: taskId || null,
          interaction_date: date.toISOString(),
          channel,
          notes: notes.trim() || null,
          plan_meeting_id: planMeetingId,
        });

      if (interactionError) throw interactionError;

      // If linked to a cycle meeting, mark it as completed
      if (planMeetingId) {
        const { error: meetingUpdateError } = await supabase
          .from('client_plan_meetings')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', planMeetingId);

        if (meetingUpdateError) throw meetingUpdateError;
      }

      // Insert into contact_history
      const channelLabel = CHANNEL_OPTIONS.find(c => c.value === channel)?.label || channel;
      const historyNotes = `Relacionamento registrado via ${channelLabel}${notes.trim() ? `: ${notes.trim()}` : ''}`;

      const { error: historyError } = await supabase
        .from('contact_history')
        .insert({
          contact_id: contactId,
          changed_by: userId,
          action: 'interaction_registered',
          notes: historyNotes,
        });

      if (historyError) throw historyError;

      // Complete the associated task (critical activity or otherwise)
      if (taskId) {
        await supabase
          .from('tasks')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', taskId);
      }

      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['contact-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['critical-activities'] });
      queryClient.invalidateQueries({ queryKey: ['critical-activity-detail'] });
      if (planMeetingId) {
        queryClient.invalidateQueries({ queryKey: ['plan-meetings'] });
        queryClient.invalidateQueries({ queryKey: ['client-plan'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['client-metrics'] });
      }

      toast.success('Relacionamento registrado com sucesso');
      handleOpenChange(false);
      setChannel('');
      setNotes('');
      setDate(new Date());
      setLinkToCycle(false);
      setSelectedPlanMeetingId('');
    } catch (error) {
      console.error('Error registering interaction:', error);
      toast.error('Erro ao registrar relacionamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Relacionamento</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Cliente: <span className="font-medium text-foreground">{contactName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date */}
          <div className="space-y-2">
            <Label>Data da interação</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Channel */}
          <div className="space-y-2">
            <Label>Canal utilizado</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o canal" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meeting Cycle Link Section */}
          {isMeetingChannel && (
            <MeetingCycleLinkSection
              contactId={contactId}
              linkToCycle={linkToCycle}
              onLinkToCycleChange={setLinkToCycle}
              selectedPlanMeetingId={selectedPlanMeetingId}
              onSelectedPlanMeetingIdChange={setSelectedPlanMeetingId}
            />
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Anotações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o que foi conversado..."
              rows={4}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
