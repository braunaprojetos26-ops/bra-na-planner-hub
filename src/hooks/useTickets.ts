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
      // First get all tickets
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs and contact IDs
      const userIds = [...new Set([
        ...tickets.map(t => t.created_by),
        ...tickets.filter(t => t.assigned_to).map(t => t.assigned_to)
      ])].filter(Boolean);
      
      const contactIds = tickets.filter(t => t.contact_id).map(t => t.contact_id);

      // Fetch profiles
      const { data: profiles = [] } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      // Fetch contacts if any
      let contacts: any[] = [];
      if (contactIds.length > 0) {
        const { data: contactData = [] } = await supabase
          .from('contacts')
          .select('id, full_name, phone, email, client_code')
          .in('id', contactIds);
        contacts = contactData;
      }

      // Map data
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));
      const contactMap = new Map(contacts.map(c => [c.id, c]));

      return tickets.map(t => ({
        ...t,
        creator: profileMap.get(t.created_by) || null,
        assignee: t.assigned_to ? profileMap.get(t.assigned_to) || null : null,
        contact: t.contact_id ? contactMap.get(t.contact_id) || null : null,
      })) as unknown as Ticket[];
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
      
      // Get ticket
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();

      if (error) throw error;
      if (!ticket) return null;

      // Fetch creator profile
      const { data: creator } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('user_id', ticket.created_by)
        .maybeSingle();

      // Fetch assignee profile if exists
      let assignee = null;
      if (ticket.assigned_to) {
        const { data: assigneeData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .eq('user_id', ticket.assigned_to)
          .maybeSingle();
        assignee = assigneeData;
      }

      // Fetch contact if exists
      let contact = null;
      let contract = null;
      if (ticket.contact_id) {
        const { data: contactData } = await supabase
          .from('contacts')
          .select('id, full_name, phone, email, client_code')
          .eq('id', ticket.contact_id)
          .maybeSingle();
        contact = contactData;

        // If contact has client_code, fetch their active contract
        if (contactData?.client_code) {
          const { data: contractData } = await supabase
            .from('contracts')
            .select(`
              id,
              product:products!contracts_product_id_fkey(name)
            `)
            .eq('contact_id', contactData.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          contract = contractData;
        }
      }

      return { 
        ...ticket, 
        creator, 
        assignee, 
        contact, 
        contract 
      } as unknown as Ticket | null;
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
      contact_id?: string | null;
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
