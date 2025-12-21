import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActingUser } from '@/contexts/ActingUserContext';
import { useToast } from '@/hooks/use-toast';
import type { Opportunity, OpportunityHistory, OpportunityFormData } from '@/types/opportunities';

export function useOpportunities(funnelId?: string, status?: 'active' | 'lost' | 'won') {
  const { user } = useAuth();
  const { actingUser, isImpersonating } = useActingUser();

  // Determine which user's opportunities to fetch
  const targetUserId = isImpersonating && actingUser ? actingUser.id : null;

  return useQuery({
    queryKey: ['opportunities', funnelId, status, targetUserId],
    queryFn: async () => {
      // When impersonating, we need to filter opportunities by contact owner
      // We do this by first fetching contacts owned by the target user
      let query = supabase
        .from('opportunities')
        .select(`
          *,
          contact:contacts!opportunities_contact_id_fkey(
            id,
            full_name,
            phone,
            email,
            owner_id,
            owner:profiles!contacts_owner_id_fkey(full_name, email)
          ),
          current_stage:funnel_stages!opportunities_current_stage_id_fkey(*),
          current_funnel:funnels!opportunities_current_funnel_id_fkey(id, name, generates_contract, contract_prompt_text),
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

      // Filter by contact owner when impersonating
      let opportunities = data as Opportunity[];
      if (targetUserId) {
        opportunities = opportunities.filter(o => o.contact?.owner_id === targetUserId);
      }

      return opportunities;
    },
    enabled: !!user,
  });
}

export function useOpportunity(opportunityId: string) {
  return useQuery({
    queryKey: ['opportunity', opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          contact:contacts!opportunities_contact_id_fkey(
            id,
            full_name,
            phone,
            email,
            owner_id,
            owner:profiles!contacts_owner_id_fkey(full_name, email)
          ),
          current_stage:funnel_stages!opportunities_current_stage_id_fkey(*),
          current_funnel:funnels!opportunities_current_funnel_id_fkey(id, name, generates_contract, contract_prompt_text),
          lost_reason:lost_reasons(*)
        `)
        .eq('id', opportunityId)
        .maybeSingle();

      if (error) throw error;
      return data as Opportunity | null;
    },
    enabled: !!opportunityId,
  });
}

export function useContactOpportunities(contactId: string) {
  return useQuery({
    queryKey: ['contact-opportunities', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          current_stage:funnel_stages!opportunities_current_stage_id_fkey(*),
          current_funnel:funnels!opportunities_current_funnel_id_fkey(id, name, generates_contract, contract_prompt_text),
          lost_reason:lost_reasons(*)
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!contactId,
  });
}

export function useOpportunityHistory(opportunityId: string) {
  return useQuery({
    queryKey: ['opportunity-history', opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunity_history')
        .select(`
          *,
          from_stage:funnel_stages!opportunity_history_from_stage_id_fkey(id, name),
          to_stage:funnel_stages!opportunity_history_to_stage_id_fkey(id, name)
        `)
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as OpportunityHistory[];
    },
    enabled: !!opportunityId,
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: OpportunityFormData) => {
      const { data: opportunity, error } = await supabase
        .from('opportunities')
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create history entry
      await supabase.from('opportunity_history').insert({
        opportunity_id: opportunity.id,
        action: 'created',
        to_stage_id: data.current_stage_id,
        changed_by: user?.id,
        notes: 'Oportunidade criada',
      });

      return opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contact-opportunities'] });
      toast({ title: 'Oportunidade criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao criar oportunidade', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useMoveOpportunityStage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      opportunityId, 
      fromStageId, 
      toStageId,
      notes 
    }: { 
      opportunityId: string; 
      fromStageId: string; 
      toStageId: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('opportunities')
        .update({
          current_stage_id: toStageId,
          stage_entered_at: new Date().toISOString(),
        })
        .eq('id', opportunityId);

      if (error) throw error;

      // Create history entry
      await supabase.from('opportunity_history').insert({
        opportunity_id: opportunityId,
        action: 'stage_change',
        from_stage_id: fromStageId,
        to_stage_id: toStageId,
        changed_by: user?.id,
        notes,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contact-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', variables.opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-history', variables.opportunityId] });
      toast({ title: 'Oportunidade movida!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao mover oportunidade', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useMarkOpportunityLost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      opportunityId, 
      fromStageId,
      lostReasonId,
      notes 
    }: { 
      opportunityId: string; 
      fromStageId: string;
      lostReasonId: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('opportunities')
        .update({
          status: 'lost',
          lost_at: new Date().toISOString(),
          lost_from_stage_id: fromStageId,
          lost_reason_id: lostReasonId,
        })
        .eq('id', opportunityId);

      if (error) throw error;

      // Create history entry
      await supabase.from('opportunity_history').insert({
        opportunity_id: opportunityId,
        action: 'lost',
        from_stage_id: fromStageId,
        changed_by: user?.id,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contact-opportunities'] });
      toast({ title: 'Oportunidade marcada como perdida' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao marcar como perdida', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useMarkOpportunityWon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      opportunityId, 
      fromStageId,
      nextFunnelId,
      nextStageId 
    }: { 
      opportunityId: string; 
      fromStageId: string;
      nextFunnelId: string;
      nextStageId: string;
    }) => {
      // Update opportunity to won status first
      const { error: wonError } = await supabase
        .from('opportunities')
        .update({
          status: 'won',
          converted_at: new Date().toISOString(),
        })
        .eq('id', opportunityId);

      if (wonError) throw wonError;

      // Create history entry for won
      await supabase.from('opportunity_history').insert({
        opportunity_id: opportunityId,
        action: 'won',
        from_stage_id: fromStageId,
        changed_by: user?.id,
        notes: 'Oportunidade ganha',
      });

      // Get the contact_id from the opportunity
      const { data: opportunity } = await supabase
        .from('opportunities')
        .select('contact_id')
        .eq('id', opportunityId)
        .single();

      if (!opportunity) throw new Error('Oportunidade não encontrada');

      // Create new opportunity in next funnel
      const { data: newOpportunity, error: createError } = await supabase
        .from('opportunities')
        .insert({
          contact_id: opportunity.contact_id,
          current_funnel_id: nextFunnelId,
          current_stage_id: nextStageId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create history entry for new opportunity
      await supabase.from('opportunity_history').insert({
        opportunity_id: newOpportunity.id,
        action: 'created',
        to_stage_id: nextStageId,
        changed_by: user?.id,
        notes: 'Oportunidade criada após conversão',
      });

      return newOpportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contact-opportunities'] });
      toast({ title: 'Oportunidade ganha! Nova oportunidade criada no próximo funil.' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao marcar como ganha', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useReactivateOpportunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      opportunityId, 
      toStageId,
      notes 
    }: { 
      opportunityId: string; 
      toStageId: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('opportunities')
        .update({
          status: 'active',
          current_stage_id: toStageId,
          stage_entered_at: new Date().toISOString(),
          lost_at: null,
          lost_from_stage_id: null,
          lost_reason_id: null,
        })
        .eq('id', opportunityId);

      if (error) throw error;

      // Create history entry
      await supabase.from('opportunity_history').insert({
        opportunity_id: opportunityId,
        action: 'reactivated',
        to_stage_id: toStageId,
        changed_by: user?.id,
        notes: notes || 'Oportunidade reativada',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contact-opportunities'] });
      toast({ title: 'Oportunidade reativada!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao reativar oportunidade', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}
