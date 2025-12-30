import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface SelectedTopic {
  topic: string;
  meetings: number;
}

export interface Proposal {
  id: string;
  contact_id: string;
  opportunity_id: string | null;
  created_by: string;
  proposal_type: string;
  complexity: number;
  meetings: number;
  months_of_income: number;
  installments: number;
  discount_applied: boolean;
  monthly_income: number;
  base_value: number;
  final_value: number;
  installment_value: number;
  diagnostic_score: number | null;
  diagnostic_scores: Json;
  show_feedbacks: boolean;
  show_cases: boolean;
  selected_topics: Json;
  status: 'draft' | 'presented' | 'accepted' | 'rejected';
  presented_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalInsert {
  contact_id: string;
  opportunity_id?: string | null;
  proposal_type?: string;
  complexity: number;
  meetings: number;
  months_of_income: number;
  installments: number;
  discount_applied: boolean;
  monthly_income: number;
  base_value: number;
  final_value: number;
  installment_value: number;
  diagnostic_score?: number | null;
  diagnostic_scores?: Json;
  show_feedbacks?: boolean;
  show_cases?: boolean;
  selected_topics?: Json;
  status?: string;
}

export function useContactProposals(contactId: string | undefined) {
  return useQuery({
    queryKey: ['proposals', 'contact', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Proposal[];
    },
    enabled: !!contactId,
  });
}

export function useProposal(proposalId: string | undefined) {
  return useQuery({
    queryKey: ['proposals', proposalId],
    queryFn: async () => {
      if (!proposalId) return null;
      
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (error) throw error;
      return data as Proposal;
    },
    enabled: !!proposalId,
  });
}

export function useProposalMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const createProposal = useMutation({
    mutationFn: async (data: ProposalInsert) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data: proposal, error } = await supabase
        .from('proposals')
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return proposal as Proposal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({
        title: 'Proposta salva',
        description: 'A proposta foi salva com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar proposta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateProposal = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProposalInsert> & { id: string }) => {
      const { data: proposal, error } = await supabase
        .from('proposals')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return proposal as Proposal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({
        title: 'Proposta atualizada',
        description: 'A proposta foi atualizada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar proposta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const markAsPresented = useMutation({
    mutationFn: async (proposalId: string) => {
      const { data: proposal, error } = await supabase
        .from('proposals')
        .update({
          status: 'presented',
          presented_at: new Date().toISOString(),
        })
        .eq('id', proposalId)
        .select()
        .single();

      if (error) throw error;
      return proposal as Proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({
        title: 'Proposta apresentada',
        description: 'A proposta foi marcada como apresentada.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteProposal = useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({
        title: 'Proposta excluída',
        description: 'A proposta foi excluída com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    createProposal,
    updateProposal,
    markAsPresented,
    deleteProposal,
  };
}
