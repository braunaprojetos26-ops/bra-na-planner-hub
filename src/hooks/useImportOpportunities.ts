import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ImportOpportunityData {
  contact_id: string;
  current_funnel_id: string;
  current_stage_id: string;
  qualification?: number;
  temperature?: string;
  notes?: string;
  proposal_value?: number;
  _rowNumber: number;
}

export function useImportOpportunities() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (opportunities: ImportOpportunityData[]) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ row: number; error: string }>,
      };

      for (const opp of opportunities) {
        try {
          const { data: inserted, error } = await supabase
            .from('opportunities')
            .insert({
              contact_id: opp.contact_id,
              current_funnel_id: opp.current_funnel_id,
              current_stage_id: opp.current_stage_id,
              qualification: opp.qualification,
              temperature: opp.temperature,
              notes: opp.notes,
              proposal_value: opp.proposal_value,
              created_by: user?.id,
            })
            .select()
            .single();

          if (error) throw error;

          // Create history entry
          await supabase.from('opportunity_history').insert({
            opportunity_id: inserted.id,
            action: 'created',
            to_stage_id: opp.current_stage_id,
            changed_by: user?.id,
            notes: 'Importado via planilha',
          });

          results.success++;
        } catch (err: any) {
          results.failed++;
          results.errors.push({
            row: opp._rowNumber,
            error: err.message || 'Erro desconhecido',
          });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contact-opportunities'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
