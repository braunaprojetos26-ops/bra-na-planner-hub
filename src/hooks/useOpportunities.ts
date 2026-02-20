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
            source,
            campaign,
            referred_by,
            is_dirty_base,
            owner:profiles!contacts_owner_id_fkey(full_name, email)
          ),
          current_stage:funnel_stages!opportunities_current_stage_id_fkey(*),
          current_funnel:funnels!opportunities_current_funnel_id_fkey(id, name, generates_contract, contract_prompt_text),
          lost_reason:lost_reasons(*),
          contracts(contract_value)
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

      // Filter by contact owner when impersonating and calculate contract totals
      let opportunities = (data || []).map(opp => {
        // Calculate total contract value
        const contracts = (opp as any).contracts || [];
        const total_contract_value = contracts.reduce((sum: number, c: { contract_value: number }) => sum + (c.contract_value || 0), 0);
        return {
          ...opp,
          total_contract_value: total_contract_value > 0 ? total_contract_value : null,
        };
      }) as Opportunity[];
      
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
            source,
            campaign,
            referred_by,
            is_dirty_base,
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
          contact_id: data.contact_id,
          current_funnel_id: data.current_funnel_id,
          current_stage_id: data.current_stage_id,
          qualification: data.qualification,
          temperature: data.temperature,
          notes: data.notes,
          proposal_value: data.proposal_value,
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
      notes,
      proposalValue 
    }: { 
      opportunityId: string; 
      fromStageId: string; 
      toStageId: string;
      notes?: string;
      proposalValue?: number;
    }) => {
      const updateData: Record<string, unknown> = {
        current_stage_id: toStageId,
        stage_entered_at: new Date().toISOString(),
      };

      // Include proposal_value if provided
      if (proposalValue !== undefined) {
        updateData.proposal_value = proposalValue;
      }

      const { error } = await supabase
        .from('opportunities')
        .update(updateData)
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

export function useUpdateProposalValue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      opportunityId, 
      proposalValue 
    }: { 
      opportunityId: string; 
      proposalValue: number | null;
    }) => {
      const { error } = await supabase
        .from('opportunities')
        .update({ proposal_value: proposalValue })
        .eq('id', opportunityId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contact-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', variables.opportunityId] });
      toast({ title: 'Valor da proposta atualizado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar valor', 
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
      nextFunnelId?: string;
      nextStageId?: string;
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

      // Recalculate PBs for the contract linked to this opportunity
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, product_id, contract_value, products(pb_formula, pb_value, pb_calculation_type, pb_variables, pb_constants)')
        .eq('opportunity_id', opportunityId);

      if (contracts && contracts.length > 0) {
        for (const contract of contracts) {
          const product = contract.products as any;
          let calculatedPbs = 0;

          if (product) {
            if (product.pb_formula) {
              // Use formula - simplified calculation here
              // Full formula parsing would need the pbFormulaParser
              calculatedPbs = contract.contract_value * 0.1; // Fallback
            } else if (product.pb_calculation_type === 'percentage') {
              calculatedPbs = contract.contract_value * (product.pb_value / 100);
            } else {
              calculatedPbs = product.pb_value;
            }
          }

          await supabase
            .from('contracts')
            .update({ calculated_pbs: calculatedPbs, status: 'active' })
            .eq('id', contract.id);
        }
      }

      // Auto-complete scheduling_analysis tasks when won from "Reunião Agendada" in "PROSPECÇÃO - PLANEJAMENTO"
      const PROSPECCAO_PLANEJAMENTO_FUNNEL_ID = '11111111-1111-1111-1111-111111111111';
      const REUNIAO_AGENDADA_STAGE_ID = 'fa3c2495-6fe4-43f0-84d0-913105bbdbb7';

      if (
        // We need to check the funnel - fetch it from the opportunity
        fromStageId === REUNIAO_AGENDADA_STAGE_ID
      ) {
        // Get the opportunity's funnel and contact owner
        const { data: oppData } = await supabase
          .from('opportunities')
          .select('current_funnel_id, contact:contacts!opportunities_contact_id_fkey(owner_id)')
          .eq('id', opportunityId)
          .single();

        if (
          oppData &&
          oppData.current_funnel_id === PROSPECCAO_PLANEJAMENTO_FUNNEL_ID &&
          oppData.contact?.owner_id
        ) {
          const ownerId = (oppData.contact as any).owner_id;

          // Find pending/overdue scheduling_analysis tasks assigned to this owner
          const { data: pendingTasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('assigned_to', ownerId)
            .eq('task_type', 'scheduling_analysis')
            .in('status', ['pending', 'overdue'])
            .order('scheduled_at', { ascending: true })
            .limit(1);

          if (pendingTasks && pendingTasks.length > 0) {
            await supabase
              .from('tasks')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', pendingTasks[0].id);
          }
        }
      }

      // Only create new opportunity if there's a next funnel
      if (nextFunnelId && nextStageId) {
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
      }

      return null;
    },
    onSuccess: (newOpportunity) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contact-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['team-task-stats'] });
      if (newOpportunity) {
        toast({ title: 'Oportunidade ganha! PBs calculados e nova oportunidade criada.' });
      } else {
        toast({ title: 'Oportunidade marcada como ganha! PBs calculados.' });
      }
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

export function useUpdateOpportunityNotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      opportunityId, 
      notes 
    }: { 
      opportunityId: string; 
      notes: string | null;
    }) => {
      const { error } = await supabase
        .from('opportunities')
        .update({ notes })
        .eq('id', opportunityId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contact-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', variables.opportunityId] });
      toast({ title: 'Anotação salva!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao salvar anotação', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}
