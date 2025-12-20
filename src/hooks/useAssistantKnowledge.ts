import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type KnowledgeCategory = 'processo' | 'faq' | 'linguagem' | 'regra';

export interface AssistantKnowledge {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateKnowledgeData {
  category: KnowledgeCategory;
  title: string;
  content: string;
  is_active?: boolean;
}

export interface UpdateKnowledgeData {
  id: string;
  category?: KnowledgeCategory;
  title?: string;
  content?: string;
  is_active?: boolean;
}

export function useAssistantKnowledge(category?: KnowledgeCategory) {
  return useQuery({
    queryKey: ['assistant-knowledge', category],
    queryFn: async () => {
      let query = supabase
        .from('assistant_knowledge')
        .select('*')
        .order('title');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as AssistantKnowledge[];
    },
  });
}

export function useCreateKnowledge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateKnowledgeData) => {
      const { data: knowledge, error } = await supabase
        .from('assistant_knowledge')
        .insert({
          category: data.category,
          title: data.title,
          content: data.content,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return knowledge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-knowledge'] });
      toast({
        title: 'Conhecimento criado',
        description: 'O novo conhecimento foi adicionado à base.',
      });
    },
    onError: (error) => {
      console.error('Error creating knowledge:', error);
      toast({
        title: 'Erro ao criar conhecimento',
        description: 'Não foi possível adicionar o conhecimento.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateKnowledge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateKnowledgeData) => {
      const { data: knowledge, error } = await supabase
        .from('assistant_knowledge')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return knowledge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-knowledge'] });
      toast({
        title: 'Conhecimento atualizado',
        description: 'As alterações foram salvas.',
      });
    },
    onError: (error) => {
      console.error('Error updating knowledge:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteKnowledge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assistant_knowledge')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-knowledge'] });
      toast({
        title: 'Conhecimento removido',
        description: 'O item foi excluído da base.',
      });
    },
    onError: (error) => {
      console.error('Error deleting knowledge:', error);
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível excluir o conhecimento.',
        variant: 'destructive',
      });
    },
  });
}
