import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Ticket, TicketMessage, TicketDepartment, TicketStatus, TicketPriority } from '@/types/tickets';
import { toast } from 'sonner';

export function useTickets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Ticket[];
    },
    enabled: !!user,
  });
}

export function useTicket(ticketId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as Ticket | null;
    },
    enabled: !!user && !!ticketId,
  });
}

export function useTicketMessages(ticketId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as TicketMessage[];
    },
    enabled: !!user && !!ticketId,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      department: TicketDepartment;
      priority: TicketPriority;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Chamado criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar chamado: ' + error.message);
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      status?: TicketStatus;
      assigned_to?: string | null;
      resolved_at?: string | null;
      resolved_by?: string | null;
    }) => {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
      toast.success('Chamado atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar chamado: ' + error.message);
    },
  });
}

export function useAddTicketMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      ticket_id: string;
      message: string;
      is_internal?: boolean;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: msg, error } = await supabase
        .from('ticket_messages')
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return msg;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', variables.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticket_id] });
    },
    onError: (error) => {
      toast.error('Erro ao enviar mensagem: ' + error.message);
    },
  });
}
