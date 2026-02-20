import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface InvestmentTicketType {
  id: string;
  name: string;
  slug: string;
  fields_schema: FieldSchema[];
  default_priority: string;
  sla_minutes: number;
  is_active: boolean;
  order_position: number;
  created_at: string;
  updated_at: string;
}

export interface FieldSchema {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'currency' | 'select' | 'date';
  required: boolean;
  options?: string[];
}

export function useInvestmentTicketTypes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['investment-ticket-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_ticket_types')
        .select('*')
        .eq('is_active', true)
        .order('order_position');

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        fields_schema: (d.fields_schema || []) as unknown as FieldSchema[],
      })) as InvestmentTicketType[];
    },
    enabled: !!user,
  });
}

export function useAllInvestmentTicketTypes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['investment-ticket-types-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_ticket_types')
        .select('*')
        .order('order_position');

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        fields_schema: (d.fields_schema || []) as unknown as FieldSchema[],
      })) as InvestmentTicketType[];
    },
    enabled: !!user,
  });
}

export function useUpdateInvestmentTicketType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; sla_minutes?: number; default_priority?: string; is_active?: boolean; fields_schema?: FieldSchema[] }) => {
      const { error } = await supabase
        .from('investment_ticket_types')
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-ticket-types'] });
      queryClient.invalidateQueries({ queryKey: ['investment-ticket-types-all'] });
      toast.success('Tipo de chamado atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}
