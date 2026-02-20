import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useClientInvestmentTickets(contactId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-investment-tickets', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('department', 'investimentos')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!tickets || tickets.length === 0) return [];

      // Fetch ticket type names
      const typeIds = [...new Set(tickets.filter(t => t.ticket_type_id).map(t => t.ticket_type_id))];
      let typeMap = new Map<string, string>();
      if (typeIds.length > 0) {
        const { data: types } = await supabase
          .from('investment_ticket_types')
          .select('id, name')
          .in('id', typeIds);
        typeMap = new Map((types || []).map(t => [t.id, t.name]));
      }

      // Fetch creator names
      const creatorIds = [...new Set(tickets.map(t => t.created_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', creatorIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      return tickets.map(t => ({
        ...t,
        ticket_type_name: t.ticket_type_id ? typeMap.get(t.ticket_type_id) || null : null,
        creator_name: profileMap.get(t.created_by) || null,
      }));
    },
    enabled: !!user && !!contactId,
  });
}

export function useInvestmentQueue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['investment-queue'],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('department', 'investimentos')
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!tickets || tickets.length === 0) return [];

      // Fetch ticket types
      const typeIds = [...new Set(tickets.filter(t => t.ticket_type_id).map(t => t.ticket_type_id))];
      let typeMap = new Map<string, string>();
      if (typeIds.length > 0) {
        const { data: types } = await supabase
          .from('investment_ticket_types')
          .select('id, name')
          .in('id', typeIds);
        typeMap = new Map((types || []).map(t => [t.id, t.name]));
      }

      // Fetch contacts
      const contactIds = [...new Set(tickets.filter(t => t.contact_id).map(t => t.contact_id))];
      let contactMap = new Map<string, { full_name: string; client_code: string | null }>();
      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, full_name, client_code')
          .in('id', contactIds);
        contactMap = new Map((contacts || []).map(c => [c.id, { full_name: c.full_name, client_code: c.client_code }]));
      }

      // Fetch creators
      const creatorIds = [...new Set(tickets.map(t => t.created_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', creatorIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      return tickets.map(t => ({
        ...t,
        ticket_type_name: t.ticket_type_id ? typeMap.get(t.ticket_type_id) || 'Não especificado' : 'Não especificado',
        contact_name: t.contact_id ? contactMap.get(t.contact_id)?.full_name || null : null,
        contact_code: t.contact_id ? contactMap.get(t.contact_id)?.client_code || null : null,
        creator_name: profileMap.get(t.created_by) || null,
      }));
    },
    enabled: !!user,
  });
}
