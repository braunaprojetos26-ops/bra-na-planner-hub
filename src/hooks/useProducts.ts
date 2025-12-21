import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProductCategory, Product, ProductCustomField } from '@/types/contracts';
import type { ContractVariableKey, ProductConstantKey } from '@/lib/pbFormulaParser';

export function useProductCategories(includeInactive = false) {
  return useQuery({
    queryKey: ['product-categories', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('product_categories')
        .select('*')
        .order('order_position');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProductCategory[];
    },
  });
}

export function useProducts(includeInactive = false) {
  return useQuery({
    queryKey: ['products', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:product_categories(*)
        `)
        .order('order_position');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data.map((p) => ({
        ...p,
        custom_fields: (p.custom_fields || []) as unknown as ProductCustomField[],
        pb_variables: (p.pb_variables || []) as ContractVariableKey[],
        pb_constants: (p.pb_constants || {}) as Record<ProductConstantKey, number>,
      })) as Product[];
    },
  });
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; icon?: string }) => {
      const { data: result, error } = await supabase
        .from('product_categories')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: 'Categoria criada!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao criar categoria', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProductCategory> & { id: string }) => {
      const { error } = await supabase
        .from('product_categories')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: 'Categoria atualizada!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar categoria', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      category_id?: string;
      partner_name?: string;
      base_value?: number;
      pb_calculation_type: 'percentage' | 'fixed';
      pb_value: number;
      custom_fields?: ProductCustomField[];
      has_validity?: boolean;
      requires_payment_type?: boolean;
      pb_formula?: string;
      pb_variables?: ContractVariableKey[];
      pb_constants?: Record<ProductConstantKey, number>;
    }) => {
      const insertData = {
        name: data.name,
        category_id: data.category_id,
        partner_name: data.partner_name,
        base_value: data.base_value,
        pb_calculation_type: data.pb_calculation_type,
        pb_value: data.pb_value,
        custom_fields: (data.custom_fields || []) as unknown as Record<string, never>[],
        has_validity: data.has_validity,
        requires_payment_type: data.requires_payment_type,
        pb_formula: data.pb_formula,
        pb_variables: data.pb_variables,
        pb_constants: data.pb_constants,
      };

      const { data: result, error } = await supabase
        .from('products')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produto criado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao criar produto', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Product> & { id: string }) => {
      const updates: Record<string, unknown> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.category_id !== undefined) updates.category_id = data.category_id;
      if (data.partner_name !== undefined) updates.partner_name = data.partner_name;
      if (data.base_value !== undefined) updates.base_value = data.base_value;
      if (data.pb_calculation_type !== undefined) updates.pb_calculation_type = data.pb_calculation_type;
      if (data.pb_value !== undefined) updates.pb_value = data.pb_value;
      if (data.custom_fields !== undefined) updates.custom_fields = data.custom_fields;
      if (data.has_validity !== undefined) updates.has_validity = data.has_validity;
      if (data.requires_payment_type !== undefined) updates.requires_payment_type = data.requires_payment_type;
      if (data.is_active !== undefined) updates.is_active = data.is_active;
      if (data.pb_formula !== undefined) updates.pb_formula = data.pb_formula;
      if (data.pb_variables !== undefined) updates.pb_variables = data.pb_variables;
      if (data.pb_constants !== undefined) updates.pb_constants = data.pb_constants;

      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produto atualizado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar produto', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

// Calculate PBs based on product configuration and contract value (legacy support)
export function calculatePBs(product: Product, contractValue: number): number {
  // If product has a formula, use it with valor_total as the main variable
  if (product.pb_formula) {
    const { calculatePBsWithFormula } = require('@/lib/pbFormulaParser');
    return calculatePBsWithFormula(
      product.pb_formula,
      { valor_total: contractValue },
      product.pb_constants || {}
    );
  }
  
  // Legacy calculation
  if (product.pb_calculation_type === 'fixed') {
    return product.pb_value;
  }
  // percentage: pb_value is stored as decimal (e.g., 0.1 = 10%)
  return contractValue * product.pb_value;
}
