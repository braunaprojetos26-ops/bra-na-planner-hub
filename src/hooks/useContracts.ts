import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Contract, ContractFormData, ProductCustomField, Product } from '@/types/contracts';
import { calculatePBs } from './useProducts';

export function useContracts(filters?: {
  contactId?: string;
  opportunityId?: string;
  ownerId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['contracts', filters],
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select(`
          *,
          product:products(
            *,
            category:product_categories(*)
          ),
          contact:contacts(id, full_name, phone)
        `)
        .order('reported_at', { ascending: false });

      if (filters?.contactId) {
        query = query.eq('contact_id', filters.contactId);
      }
      if (filters?.opportunityId) {
        query = query.eq('opportunity_id', filters.opportunityId);
      }
      if (filters?.ownerId) {
        query = query.eq('owner_id', filters.ownerId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data.map((c) => ({
        ...c,
        custom_data: c.custom_data as Record<string, unknown>,
        product: c.product ? {
          ...c.product,
          custom_fields: (c.product.custom_fields || []) as unknown as ProductCustomField[],
        } : undefined,
      })) as Contract[];
    },
  });
}

export function useContactContracts(contactId: string) {
  return useContracts({ contactId });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      contactId,
      opportunityId,
      product,
      data,
      calculatedPbs: providedPbs,
    }: {
      contactId: string;
      opportunityId?: string;
      product: Product;
      data: ContractFormData;
      calculatedPbs?: number;
    }) => {
      const calculatedPbs = providedPbs ?? calculatePBs(product, data.contract_value);

      const insertData = {
        contact_id: contactId,
        opportunity_id: opportunityId,
        product_id: data.product_id,
        owner_id: user?.id,
        contract_value: data.contract_value,
        payment_type: data.payment_type,
        installments: data.installments,
        installment_value: data.installment_value,
        custom_data: (data.custom_data || {}) as unknown as Record<string, never>,
        calculated_pbs: calculatedPbs,
        start_date: data.start_date,
        end_date: data.end_date,
        notes: data.notes,
      };

      const { data: result, error } = await supabase
        .from('contracts')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({ title: 'Contrato registrado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao registrar contrato', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status?: string; notes?: string }) => {
      const updates: Record<string, unknown> = {};
      if (status !== undefined) updates.status = status;
      if (notes !== undefined) updates.notes = notes;

      const { error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({ title: 'Contrato atualizado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar contrato', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

// Metrics with partner product filter
export function useContractMetrics(period?: { start: string; end: string }, isPartnerProduct?: boolean) {
  return useQuery({
    queryKey: ['contract-metrics', period, isPartnerProduct],
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select(`
          calculated_pbs, 
          contract_value, 
          status,
          product:products!inner(is_partner_product)
        `)
        .eq('status', 'active');

      if (period?.start) {
        query = query.gte('reported_at', period.start);
      }
      if (period?.end) {
        query = query.lte('reported_at', period.end);
      }
      
      if (isPartnerProduct !== undefined) {
        query = query.eq('product.is_partner_product', isPartnerProduct);
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalPbs = data.reduce((sum, c) => sum + Number(c.calculated_pbs || 0), 0);
      const totalValue = data.reduce((sum, c) => sum + Number(c.contract_value || 0), 0);
      const count = data.length;

      return { totalPbs, totalValue, count };
    },
  });
}

// Contracts filtered by partner product type
export function useContractsByType(isPartnerProduct: boolean) {
  return useQuery({
    queryKey: ['contracts', 'by-type', isPartnerProduct],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          product:products!inner(
            *,
            category:product_categories(*)
          ),
          contact:contacts(id, full_name, phone)
        `)
        .eq('product.is_partner_product', isPartnerProduct)
        .order('reported_at', { ascending: false });

      if (error) throw error;
      return data.map((c) => ({
        ...c,
        custom_data: c.custom_data as Record<string, unknown>,
        product: c.product ? {
          ...c.product,
          custom_fields: (c.product.custom_fields || []) as unknown as ProductCustomField[],
        } : undefined,
      })) as Contract[];
    },
  });
}
