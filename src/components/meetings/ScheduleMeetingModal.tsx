import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, X, Loader2, RefreshCw } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCreateMeeting, useRescheduleMeeting } from '@/hooks/useMeetings';
import { useContactOpportunities } from '@/hooks/useContactOpportunities';
import { MEETING_TYPES, type Meeting } from '@/types/meetings';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  meeting_type: z.string().min(1, 'Selecione o tipo de reunião'),
  date: z.date({ required_error: 'Selecione a data' }),
  time: z.string().min(1, 'Informe o horário'),
  duration_minutes: z.number().min(15).max(480),
  allows_companion: z.boolean(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  opportunityId?: string | null;
  reschedulingMeeting?: Meeting | null;
}

export function ScheduleMeetingModal({
  open,
  onOpenChange,
  contactId,
  contactName,
  opportunityId: initialOpportunityId,
  reschedulingMeeting,
}: ScheduleMeetingModalProps) {
  const { toast } = useToast();
  const createMeeting = useCreateMeeting();
  const rescheduleMeeting = useRescheduleMeeting();
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(initialOpportunityId || null);
  
  // Fetch opportunities for this contact (only if no initial opportunityId)
  const { data: opportunities } = useContactOpportunities(contactId);
  const activeOpportunities = opportunities?.filter(o => o.status === 'active') || [];

  const isRescheduling = !!reschedulingMeeting;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      meeting_type: '',
      duration_minutes: 60,
      allows_companion: false,
      notes: '',
      time: '',
    },
  });

  // Pre-fill form when rescheduling or reset on open/close
  useEffect(() => {
    if (reschedulingMeeting && open) {
      form.reset({
        meeting_type: reschedulingMeeting.meeting_type,
        date: undefined, // User must select new date
        time: '', // User must select new time
        duration_minutes: reschedulingMeeting.duration_minutes,
        allows_companion: reschedulingMeeting.allows_companion,
        notes: reschedulingMeeting.notes || '',
      });
      setParticipants(reschedulingMeeting.participants || []);
      setSelectedOpportunityId(reschedulingMeeting.opportunity_id || null);
    } else if (open) {
      // When opening fresh, set initial opportunity if provided
      setSelectedOpportunityId(initialOpportunityId || null);
    } else {
      // When closing, reset everything
      form.reset({
        meeting_type: '',
        duration_minutes: 60,
        allows_companion: false,
        notes: '',
        time: '',
      });
      setParticipants([]);
      setSelectedOpportunityId(null);
    }
  }, [reschedulingMeeting, open, form, initialOpportunityId]);

  const handleAddParticipant = () => {
    const email = newParticipant.trim().toLowerCase();
    if (!email) return;

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'E-mail inválido',
        description: 'Por favor, insira um e-mail válido.',
        variant: 'destructive',
      });
      return;
    }

    if (participants.includes(email)) {
      toast({
        title: 'E-mail já adicionado',
        description: 'Este participante já está na lista.',
        variant: 'destructive',
      });
      return;
    }

    setParticipants([...participants, email]);
    setNewParticipant('');
  };

  const handleRemoveParticipant = (email: string) => {
    setParticipants(participants.filter((p) => p !== email));
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Combine date and time
      const [hours, minutes] = data.time.split(':').map(Number);
      const scheduledAt = new Date(data.date);
      scheduledAt.setHours(hours, minutes, 0, 0);

      if (isRescheduling && reschedulingMeeting) {
        await rescheduleMeeting.mutateAsync({
          originalMeeting: reschedulingMeeting,
          newData: {
            meeting_type: data.meeting_type,
            scheduled_at: scheduledAt,
            duration_minutes: data.duration_minutes,
            participants,
            allows_companion: data.allows_companion,
            notes: data.notes,
          },
        });

        toast({
          title: 'Reunião reagendada!',
          description: `Reunião de ${data.meeting_type} reagendada para ${format(scheduledAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`,
        });
      } else {
        await createMeeting.mutateAsync({
          contactId,
          opportunityId: selectedOpportunityId,
          data: {
            meeting_type: data.meeting_type as any,
            scheduled_at: scheduledAt,
            duration_minutes: data.duration_minutes,
            participants,
            allows_companion: data.allows_companion,
            notes: data.notes,
          },
        });

        toast({
          title: 'Reunião agendada!',
          description: `Reunião de ${data.meeting_type} agendada para ${format(scheduledAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`,
        });
      }

      form.reset();
      setParticipants([]);
      setSelectedOpportunityId(null);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: isRescheduling ? 'Erro ao reagendar' : 'Erro ao agendar',
        description: 'Não foi possível processar a reunião. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const isPending = createMeeting.isPending || rescheduleMeeting.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRescheduling ? (
              <>
                <RefreshCw className="h-5 w-5 text-primary" />
                Reagendar Reunião
              </>
            ) : (
              <>
                <CalendarIcon className="h-5 w-5 text-primary" />
                Agendar Reunião
              </>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isRescheduling ? 'Reagendando para: ' : 'Agendando para: '}
            <span className="font-medium text-foreground">{contactName}</span>
          </p>
          {isRescheduling && reschedulingMeeting && (
            <p className="text-xs text-muted-foreground">
              Reagendamento #{reschedulingMeeting.reschedule_count + 1}
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo de Reunião */}
            <FormField
              control={form.control}
              name="meeting_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Reunião</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEETING_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Negociação (opcional, só mostra se não veio pré-definido e há negociações ativas) */}
            {!initialOpportunityId && activeOpportunities.length > 0 && !isRescheduling && (
              <div className="space-y-2">
                <FormLabel>Vincular a Negociação (opcional)</FormLabel>
                <Select 
                  value={selectedOpportunityId || 'none'} 
                  onValueChange={(v) => setSelectedOpportunityId(v === 'none' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma negociação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {activeOpportunities.map((opp) => (
                      <SelectItem key={opp.id} value={opp.id}>
                        {opp.current_funnel?.name} - {opp.current_stage?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vincule esta reunião a uma negociação específica
                </p>
              </div>
            )}

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal h-10',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duração */}
            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (minutos)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="90">1h 30min</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Participantes */}
            <div className="space-y-2">
              <FormLabel>Participantes Adicionais</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddParticipant();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddParticipant}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {participants.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Quando a integração com Outlook estiver ativa, a disponibilidade será verificada automaticamente.
              </p>
            </div>

            {/* Permite Acompanhante */}
            <FormField
              control={form.control}
              name="allows_companion"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Permite Acompanhante?</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      A pessoa pode trazer alguém para a reunião
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações sobre a reunião..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isRescheduling ? 'Reagendar' : 'Agendar Reunião'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
