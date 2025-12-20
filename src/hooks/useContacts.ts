import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Contact, ContactFormData, ContactHistory, ContactStatus } from '@/types/contacts';

export function useContacts(funnelId?: string, status?: ContactStatus) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['contacts', funnelId, status],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select(`
          *,
          owner:profiles!contacts_owner_id_fkey(full_name, email),
          current_stage:funnel_stages!contacts_current_stage_id_fkey(*),
          current_funnel:funnels!contacts_current_funnel_id_fkey(*),
          lost_reason:lost_reasons(*)
        `)
        .order('stage_entered_at', { ascending: false });

      if (funnelId) {
        query = query.eq('current_funnel_id', funnelId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

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
          owner:profiles!contacts_owner_id_fkey(full_name, email),
          current_stage:funnel_stages!contacts_current_stage_id_fkey(*),
          current_funnel:funnels!contacts_current_funnel_id_fkey(*),
          lost_reason:lost_reasons(*)
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
      // Se for planejador, auto-atribui o contato a ele mesmo
      const ownerId = role === 'planejador' ? user?.id : undefined;

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
        to_stage_id: data.current_stage_id,
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

export function useMoveContactStage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      fromStageId, 
      toStageId,
      notes 
    }: { 
      contactId: string; 
      fromStageId: string; 
      toStageId: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('contacts')
        .update({
          current_stage_id: toStageId,
          stage_entered_at: new Date().toISOString(),
        })
        .eq('id', contactId);

      if (error) throw error;

      // Create history entry
      await supabase.from('contact_history').insert({
        contact_id: contactId,
        action: 'stage_change',
        from_stage_id: fromStageId,
        to_stage_id: toStageId,
        changed_by: user?.id,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contato movido!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao mover contato', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useMarkContactLost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      fromStageId,
      lostReasonId,
      notes 
    }: { 
      contactId: string; 
      fromStageId: string;
      lostReasonId: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('contacts')
        .update({
          status: 'lost',
          lost_at: new Date().toISOString(),
          lost_from_stage_id: fromStageId,
          lost_reason_id: lostReasonId,
        })
        .eq('id', contactId);

      if (error) throw error;

      // Create history entry
      await supabase.from('contact_history').insert({
        contact_id: contactId,
        action: 'lost',
        from_stage_id: fromStageId,
        changed_by: user?.id,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contato marcado como perdido' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao marcar como perdido', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useMarkContactWon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      fromStageId,
      nextFunnelId,
      nextStageId 
    }: { 
      contactId: string; 
      fromStageId: string;
      nextFunnelId: string;
      nextStageId: string;
    }) => {
      // Update contact to won status first
      const { error: wonError } = await supabase
        .from('contacts')
        .update({
          status: 'won',
          converted_at: new Date().toISOString(),
        })
        .eq('id', contactId);

      if (wonError) throw wonError;

      // Create history entry for won
      await supabase.from('contact_history').insert({
        contact_id: contactId,
        action: 'won',
        from_stage_id: fromStageId,
        changed_by: user?.id,
        notes: 'Contato ganho',
      });

      // Move to next funnel
      const { error: moveError } = await supabase
        .from('contacts')
        .update({
          status: 'active',
          current_funnel_id: nextFunnelId,
          current_stage_id: nextStageId,
          stage_entered_at: new Date().toISOString(),
          converted_at: null,
        })
        .eq('id', contactId);

      if (moveError) throw moveError;

      // Create history entry for funnel change
      await supabase.from('contact_history').insert({
        contact_id: contactId,
        action: 'funnel_change',
        to_stage_id: nextStageId,
        changed_by: user?.id,
        notes: 'Movido para próximo funil',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contato marcado como ganho e movido!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao marcar como ganho', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useReactivateContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      toStageId,
      notes 
    }: { 
      contactId: string; 
      toStageId: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('contacts')
        .update({
          status: 'active',
          current_stage_id: toStageId,
          stage_entered_at: new Date().toISOString(),
          lost_at: null,
          lost_from_stage_id: null,
          lost_reason_id: null,
        })
        .eq('id', contactId);

      if (error) throw error;

      // Create history entry
      await supabase.from('contact_history').insert({
        contact_id: contactId,
        action: 'reactivated',
        to_stage_id: toStageId,
        changed_by: user?.id,
        notes: notes || 'Contato reativado',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contato reativado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao reativar contato', 
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
