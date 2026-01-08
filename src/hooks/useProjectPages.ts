import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface ProjectPage {
  id: string;
  project_id: string;
  title: string;
  icon: string;
  status: 'not_started' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  content: Json;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  assignees?: {
    user_id: string;
    profile?: {
      full_name: string;
    };
  }[];
}

export function useProjectPages(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: pages = [], isLoading, error } = useQuery({
    queryKey: ['project-pages', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_pages')
        .select(`
          *,
          assignees:project_page_assignees(
            user_id,
            profile:profiles(full_name)
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as ProjectPage[];
    },
    enabled: !!projectId,
  });

  const createPage = useMutation({
    mutationFn: async (data: {
      project_id: string;
      title?: string;
      icon?: string;
      status?: string;
      priority?: string;
      due_date?: string | null;
    }) => {
      const { data: page, error } = await supabase
        .from('project_pages')
        .insert({
          project_id: data.project_id,
          title: data.title || 'Nova página',
          icon: data.icon || '📄',
          status: data.status || 'not_started',
          priority: data.priority || 'low',
          due_date: data.due_date || null,
          content: [],
        })
        .select()
        .single();

      if (error) throw error;
      return page;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-pages', projectId] });
      toast.success('Página criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating page:', error);
      toast.error('Erro ao criar página');
    },
  });

  const updatePage = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      icon?: string;
      status?: string;
      priority?: string;
      due_date?: string | null;
      content?: Json;
    }) => {
      const { data: page, error } = await supabase
        .from('project_pages')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return page;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-pages', projectId] });
    },
    onError: (error) => {
      console.error('Error updating page:', error);
      toast.error('Erro ao atualizar página');
    },
  });

  const deletePage = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase
        .from('project_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-pages', projectId] });
      toast.success('Página excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting page:', error);
      toast.error('Erro ao excluir página');
    },
  });

  const assignUser = useMutation({
    mutationFn: async ({ pageId, userId }: { pageId: string; userId: string }) => {
      const { error } = await supabase
        .from('project_page_assignees')
        .insert({ page_id: pageId, user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-pages', projectId] });
    },
    onError: (error) => {
      console.error('Error assigning user:', error);
      toast.error('Erro ao atribuir usuário');
    },
  });

  const unassignUser = useMutation({
    mutationFn: async ({ pageId, userId }: { pageId: string; userId: string }) => {
      const { error } = await supabase
        .from('project_page_assignees')
        .delete()
        .eq('page_id', pageId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-pages', projectId] });
    },
    onError: (error) => {
      console.error('Error unassigning user:', error);
      toast.error('Erro ao remover usuário');
    },
  });

  return {
    pages,
    isLoading,
    error,
    createPage,
    updatePage,
    deletePage,
    assignUser,
    unassignUser,
  };
}
