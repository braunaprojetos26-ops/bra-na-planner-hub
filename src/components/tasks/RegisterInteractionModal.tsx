import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Phone, MessageSquare, Mail, Users, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useActingUser } from '@/contexts/ActingUserContext';
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

const CHANNEL_OPTIONS = [
  { value: 'ligacao', label: 'Ligação', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'reuniao_presencial', label: 'Reunião Presencial', icon: Users },
  { value: 'reuniao_online', label: 'Reunião Online', icon: Monitor },
] as const;

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
  const [date, setDate] = useState<Date>(new Date());
  const [channel, setChannel] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fix Radix UI bug: body keeps pointer-events:none after Dialog closes
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setTimeout(() => {
        document.body.style.pointerEvents = '';
      }, 100);
    }
  };

  const handleSubmit = async () => {
    if (!channel) {
      toast.error('Selecione o canal utilizado');
      return;
    }
    
    // Get the actual authenticated user for DB operations
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);
    try {
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
        });

      if (interactionError) throw interactionError;

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

      toast.success('Relacionamento registrado com sucesso');
      handleOpenChange(false);
      setChannel('');
      setNotes('');
      setDate(new Date());
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
