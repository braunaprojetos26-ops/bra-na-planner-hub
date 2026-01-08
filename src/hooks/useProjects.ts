import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Project {
  id: string;
  title: string;
  content: unknown[];
  icon: string;
  cover_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  owner?: {
    full_name: string;
    avatar_url?: string;
  };
  is_shared?: boolean;
}

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get projects where user is owner
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      if (ownedError) throw ownedError;

      // Get projects where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (memberError) throw memberError;

      const memberProjectIds = memberships?.map(m => m.project_id) || [];
      
      let sharedProjects: Project[] = [];
      if (memberProjectIds.length > 0) {
        const { data: shared, error: sharedError } = await supabase
          .from('projects')
          .select('*')
          .in('id', memberProjectIds)
          .order('updated_at', { ascending: false });

        if (sharedError) throw sharedError;
        sharedProjects = (shared || []).map(p => ({ ...p, is_shared: true })) as Project[];
      }

      const allProjects = [
        ...(ownedProjects || []).map(p => ({ ...p, is_shared: false })),
        ...sharedProjects
      ] as Project[];

      return allProjects.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    },
    enabled: !!user?.id,
  });

  const createProject = useMutation({
    mutationFn: async (data: { title?: string; icon?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          title: data.title || 'Sem título',
          icon: data.icon || '📄',
          owner_id: user.id,
          content: [],
        })
        .select()
        .single();

      if (error) throw error;
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projeto criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast.error('Erro ao criar projeto');
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ 
      id, 
      title,
      content,
      icon,
      cover_url,
    }: { 
      id: string; 
      title?: string; 
      content?: unknown[]; 
      icon?: string;
      cover_url?: string | null;
    }) => {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (icon !== undefined) updateData.icon = icon;
      if (cover_url !== undefined) updateData.cover_url = cover_url;

      const { data: project, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast.error('Erro ao atualizar projeto');
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projeto excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      toast.error('Erro ao excluir projeto');
    },
  });

  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
  };
}

export function useProject(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });

  const updateContent = useMutation({
    mutationFn: async (content: unknown[]) => {
      if (!projectId) throw new Error('No project ID');

      const { error } = await supabase
        .from('projects')
        .update({ 
          content: content as any, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  return {
    project,
    isLoading,
    error,
    updateContent,
  };
}
