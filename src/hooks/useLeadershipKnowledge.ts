import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type KnowledgeCategory = 'livro' | 'artigo' | 'conceito' | 'metodologia';

export interface LeadershipKnowledge {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  source: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useLeadershipKnowledge() {
  return useQuery({
    queryKey: ['leadership-knowledge'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leadership_knowledge_base')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category as KnowledgeCategory,
        source: item.source,
        isActive: item.is_active,
        createdBy: item.created_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })) as LeadershipKnowledge[];
    },
  });
}

export function useAllLeadershipKnowledge() {
  return useQuery({
    queryKey: ['leadership-knowledge-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leadership_knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category as KnowledgeCategory,
        source: item.source,
        isActive: item.is_active,
        createdBy: item.created_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })) as LeadershipKnowledge[];
    },
  });
}

export function useCreateLeadershipKnowledge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      category: KnowledgeCategory;
      source?: string;
    }) => {
      const { error } = await supabase
        .from('leadership_knowledge_base')
        .insert({
          title: data.title,
          content: data.content,
          category: data.category,
          source: data.source || null,
          created_by: user!.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadership-knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['leadership-knowledge-all'] });
      toast.success('Conhecimento adicionado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao adicionar conhecimento');
    },
  });
}

export function useUpdateLeadershipKnowledge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      content?: string;
      category?: KnowledgeCategory;
      source?: string;
      isActive?: boolean;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.source !== undefined) updateData.source = data.source;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { error } = await supabase
        .from('leadership_knowledge_base')
        .update(updateData)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadership-knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['leadership-knowledge-all'] });
      toast.success('Conhecimento atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar conhecimento');
    },
  });
}

export function useDeleteLeadershipKnowledge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leadership_knowledge_base')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadership-knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['leadership-knowledge-all'] });
      toast.success('Conhecimento removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover conhecimento');
    },
  });
}
