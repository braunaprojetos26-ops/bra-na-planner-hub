import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DiagnosticCategory {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  weight: number;
  order_position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticRule {
  id: string;
  category_id: string;
  evaluation_prompt: string;
  data_paths: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all categories (including inactive for admin)
export function useAllDiagnosticCategories() {
  return useQuery({
    queryKey: ['diagnostic-categories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnostic_categories')
        .select('*')
        .order('order_position');
      
      if (error) throw error;
      return data as DiagnosticCategory[];
    },
  });
}

// Fetch rules for a category
export function useDiagnosticRules(categoryId: string | null) {
  return useQuery({
    queryKey: ['diagnostic-rules', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      const { data, error } = await supabase
        .from('diagnostic_rules')
        .select('*')
        .eq('category_id', categoryId);
      
      if (error) throw error;
      return (data || []).map(rule => ({
        ...rule,
        data_paths: Array.isArray(rule.data_paths) ? rule.data_paths : []
      })) as DiagnosticRule[];
    },
    enabled: !!categoryId,
  });
}

// Create category
export function useCreateDiagnosticCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Omit<DiagnosticCategory, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('diagnostic_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-categories-all'] });
      toast.success('Categoria criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast.error('Erro ao criar categoria');
    },
  });
}

// Update category
export function useUpdateDiagnosticCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DiagnosticCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('diagnostic_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-categories-all'] });
      toast.success('Categoria atualizada');
    },
    onError: (error) => {
      console.error('Error updating category:', error);
      toast.error('Erro ao atualizar categoria');
    },
  });
}

// Delete category
export function useDeleteDiagnosticCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('diagnostic_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-categories-all'] });
      toast.success('Categoria excluída');
    },
    onError: (error) => {
      console.error('Error deleting category:', error);
      toast.error('Erro ao excluir categoria');
    },
  });
}

// Create rule
export function useCreateDiagnosticRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: Omit<DiagnosticRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('diagnostic_rules')
        .insert(rule)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-rules', variables.category_id] });
      toast.success('Regra criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating rule:', error);
      toast.error('Erro ao criar regra');
    },
  });
}

// Update rule
export function useUpdateDiagnosticRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DiagnosticRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('diagnostic_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-rules', data.category_id] });
      toast.success('Regra atualizada');
    },
    onError: (error) => {
      console.error('Error updating rule:', error);
      toast.error('Erro ao atualizar regra');
    },
  });
}

// Delete rule
export function useDeleteDiagnosticRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string }) => {
      const { error } = await supabase
        .from('diagnostic_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return categoryId;
    },
    onSuccess: (categoryId) => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-rules', categoryId] });
      toast.success('Regra excluída');
    },
    onError: (error) => {
      console.error('Error deleting rule:', error);
      toast.error('Erro ao excluir regra');
    },
  });
}
