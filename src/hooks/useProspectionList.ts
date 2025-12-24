import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@/types/contacts';

export interface ProspectionListItem {
  id: string;
  contact_id: string;
  owner_id: string;
  added_at: string;
  contact?: Contact;
}

export function useProspectionList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prospection-list', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_prospection_list')
        .select(`
          *,
          contact:contacts(
            *,
            owner:profiles!contacts_owner_id_fkey(full_name, email)
          )
        `)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data as ProspectionListItem[];
    },
    enabled: !!user,
  });
}

export function useAddToProspectionList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Insert into prospection list
      const { error: insertError } = await supabase
        .from('contact_prospection_list')
        .insert(
          contactIds.map(contactId => ({
            contact_id: contactId,
            owner_id: user.id,
          }))
        );

      if (insertError) throw insertError;

      // Create history entries for each contact
      const historyEntries = contactIds.map(contactId => ({
        contact_id: contactId,
        action: 'added_to_prospection',
        changed_by: user.id,
        notes: 'Adicionado à Lista de Prospecção',
      }));

      const { error: historyError } = await supabase
        .from('contact_history')
        .insert(historyEntries);

      if (historyError) console.error('Error creating history:', historyError);
    },
    onSuccess: (_, contactIds) => {
      queryClient.invalidateQueries({ queryKey: ['prospection-list'] });
      queryClient.invalidateQueries({ queryKey: ['contact-history'] });
      toast({
        title: `${contactIds.length} contato(s) adicionado(s) à Lista de Prospecção`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar à lista',
        description: error.message.includes('duplicate') 
          ? 'Alguns contatos já estão na lista de prospecção'
          : error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveFromProspectionList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      reason 
    }: { 
      contactId: string; 
      reason: 'negotiation_started' | 'no_contact';
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Remove from prospection list
      const { error: deleteError } = await supabase
        .from('contact_prospection_list')
        .delete()
        .eq('contact_id', contactId)
        .eq('owner_id', user.id);

      if (deleteError) throw deleteError;

      // Create history entry
      const historyAction = reason === 'negotiation_started' 
        ? 'prospection_negotiation_started' 
        : 'prospection_no_contact';
      const historyNotes = reason === 'negotiation_started'
        ? 'Removido da Lista de Prospecção: Negociação Iniciada'
        : 'Removido da Lista de Prospecção: Não foi possível o contato';

      const { error: historyError } = await supabase
        .from('contact_history')
        .insert({
          contact_id: contactId,
          action: historyAction,
          changed_by: user.id,
          notes: historyNotes,
        });

      if (historyError) console.error('Error creating history:', historyError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospection-list'] });
      queryClient.invalidateQueries({ queryKey: ['contact-history'] });
      toast({ title: 'Contato removido da lista' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover da lista',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useContactsInProspectionList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prospection-list-ids', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_prospection_list')
        .select('contact_id');

      if (error) throw error;
      return new Set(data.map(item => item.contact_id));
    },
    enabled: !!user,
  });
}
