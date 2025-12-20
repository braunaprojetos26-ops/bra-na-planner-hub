import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Contact, ContactFormData, ContactHistory } from '@/types/contacts';

export function useContacts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          owner:profiles!contacts_owner_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!user,
  });
}

export function useContact(contactId: string) {
  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          owner:profiles!contacts_owner_id_fkey(full_name, email)
        `)
        .eq('id', contactId)
        .maybeSingle();

      if (error) throw error;
      return data as Contact | null;
    },
    enabled: !!contactId,
  });
}

export function useContactHistory(contactId: string) {
  return useQuery({
    queryKey: ['contact-history', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_history')
        .select(`
          *,
          changed_by_profile:profiles!contact_history_changed_by_fkey(full_name),
          from_stage:funnel_stages!contact_history_from_stage_id_fkey(*),
          to_stage:funnel_stages!contact_history_to_stage_id_fkey(*)
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContactHistory[];
    },
    enabled: !!contactId,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, role } = useAuth();

  return useMutation({
    mutationFn: async (data: ContactFormData) => {
      // If planejador, auto-assign contact to themselves
      const ownerId = role === 'planejador' ? user?.id : data.owner_id;

      const { data: contact, error } = await supabase
        .from('contacts')
        .insert({
          ...data,
          created_by: user?.id,
          owner_id: ownerId,
        })
        .select()
        .single();

      if (error) throw error;

      // Create history entry
      await supabase.from('contact_history').insert({
        contact_id: contact.id,
        action: 'created',
        changed_by: user?.id,
        notes: 'Contato criado',
      });

      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contato criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao criar contato', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ contactId, data }: { contactId: string; data: Partial<ContactFormData> }) => {
      const { error } = await supabase
        .from('contacts')
        .update(data)
        .eq('id', contactId);

      if (error) throw error;

      // Create history entry
      await supabase.from('contact_history').insert({
        contact_id: contactId,
        action: 'updated',
        changed_by: user?.id,
        notes: 'Contato atualizado',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
      toast({ title: 'Contato atualizado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar contato', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useAssignContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      ownerId,
      notes 
    }: { 
      contactId: string; 
      ownerId: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('contacts')
        .update({ owner_id: ownerId })
        .eq('id', contactId);

      if (error) throw error;

      // Create history entry
      await supabase.from('contact_history').insert({
        contact_id: contactId,
        action: 'assignment',
        changed_by: user?.id,
        notes: notes || 'Contato atribuído',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contato atribuído!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atribuir contato', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}
