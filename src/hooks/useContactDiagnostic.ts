import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticCategory {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  weight: number;
  order_position: number;
}

export interface ContactDiagnostic {
  id: string;
  contact_id: string;
  overall_score: number;
  category_scores: Record<string, { score: number; insight: string }>;
  schema_version: string;
  generated_by: string;
  created_at: string;
}

// Fetch diagnostic categories
export function useDiagnosticCategories() {
  return useQuery({
    queryKey: ['diagnostic-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnostic_categories')
        .select('*')
        .eq('is_active', true)
        .order('order_position');

      if (error) throw error;
      return data as DiagnosticCategory[];
    },
  });
}

// Fetch latest diagnostic for a contact
export function useContactDiagnostic(contactId: string, skipQuery = false) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['contact-diagnostic', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_diagnostics')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ContactDiagnostic | null;
    },
    enabled: !!contactId && !skipQuery,
  });

  const mutation = useMutation({
    mutationFn: async ({ contactId }: { contactId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-diagnostic`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ contactId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao gerar diagnóstico');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-diagnostic', contactId] });
    },
  });

  return {
    ...query,
    mutate: mutation.mutate,
    isPending: mutation.isPending,
  };
}
