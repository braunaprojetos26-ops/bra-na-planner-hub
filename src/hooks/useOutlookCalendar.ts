import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOutlookConnection } from './useOutlookConnection';

interface CreateEventParams {
  subject: string;
  start: Date;
  end: Date;
  attendees: string[];
  body?: string;
  location?: string;
}

interface CalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  webLink: string;
}

export function useOutlookCalendar() {
  const { toast } = useToast();
  const { isConnected } = useOutlookConnection();

  // Create calendar event
  const createEventMutation = useMutation({
    mutationFn: async (params: CreateEventParams): Promise<CalendarEvent> => {
      const { data, error } = await supabase.functions.invoke('outlook-calendar', {
        body: {
          action: 'create-event',
          event: {
            subject: params.subject,
            start: params.start.toISOString(),
            end: params.end.toISOString(),
            attendees: params.attendees,
            body: params.body,
            location: params.location,
          },
        },
      });

      if (error) throw error;
      if (!data?.event) throw new Error('Evento não criado');

      return data.event;
    },
    onSuccess: () => {
      toast({
        title: 'Evento criado',
        description: 'O evento foi adicionado ao seu calendário do Outlook.',
      });
    },
    onError: (error) => {
      console.error('Error creating calendar event:', error);
      toast({
        title: 'Erro ao criar evento',
        description: 'Não foi possível adicionar o evento ao calendário.',
        variant: 'destructive',
      });
    },
  });

  // Delete calendar event
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.functions.invoke('outlook-calendar', {
        body: {
          action: 'delete-event',
          eventId,
        },
      });

      if (error) throw error;
    },
    onError: (error) => {
      console.error('Error deleting calendar event:', error);
    },
  });

  // Check availability
  const checkAvailability = async (start: Date, end: Date) => {
    if (!isConnected) return null;

    try {
      const { data, error } = await supabase.functions.invoke('outlook-calendar', {
        body: {
          action: 'check-availability',
          start: start.toISOString(),
          end: end.toISOString(),
        },
      });

      if (error) throw error;
      return data?.events || [];
    } catch (error) {
      console.error('Error checking availability:', error);
      return null;
    }
  };

  return {
    isConnected,
    createEvent: createEventMutation.mutateAsync,
    isCreatingEvent: createEventMutation.isPending,
    deleteEvent: deleteEventMutation.mutateAsync,
    isDeletingEvent: deleteEventMutation.isPending,
    checkAvailability,
  };
}
