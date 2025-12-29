import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface MeetingTopic {
  id: string;
  title: string;
  description: string;
  orderPosition: number;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  description: string | null;
  orderPosition: number;
  templateContent: string;
  topics: MeetingTopic[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useMeetingTemplates() {
  return useQuery({
    queryKey: ['meeting-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leadership_meeting_templates')
        .select('*')
        .eq('is_active', true)
        .order('order_position');
      
      if (error) throw error;
      
      return (data || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        orderPosition: template.order_position,
        templateContent: template.template_content,
        topics: (Array.isArray(template.topics) ? template.topics : []) as unknown as MeetingTopic[],
        isActive: template.is_active,
        createdBy: template.created_by,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
      })) as MeetingTemplate[];
    },
  });
}

export function useAllMeetingTemplates() {
  return useQuery({
    queryKey: ['meeting-templates-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leadership_meeting_templates')
        .select('*')
        .order('order_position');
      
      if (error) throw error;
      
      return (data || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        orderPosition: template.order_position,
        templateContent: template.template_content,
        topics: (Array.isArray(template.topics) ? template.topics : []) as unknown as MeetingTopic[],
        isActive: template.is_active,
        createdBy: template.created_by,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
      })) as MeetingTemplate[];
    },
  });
}

export function useCreateMeetingTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      templateContent?: string;
      topics?: MeetingTopic[];
      orderPosition?: number;
    }) => {
      const insertData = {
        name: data.name,
        description: data.description || null,
        template_content: data.templateContent || '',
        topics: (data.topics || []) as unknown as Json,
        order_position: data.orderPosition || 0,
        created_by: user!.id,
      };

      const { error } = await supabase
        .from('leadership_meeting_templates')
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-templates'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-templates-all'] });
      toast.success('Modelo de reunião criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar modelo de reunião');
    },
  });
}

export function useUpdateMeetingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      description?: string;
      templateContent?: string;
      topics?: MeetingTopic[];
      orderPosition?: number;
      isActive?: boolean;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.templateContent !== undefined) updateData.template_content = data.templateContent;
      if (data.topics !== undefined) updateData.topics = data.topics;
      if (data.orderPosition !== undefined) updateData.order_position = data.orderPosition;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { error } = await supabase
        .from('leadership_meeting_templates')
        .update(updateData)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-templates'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-templates-all'] });
      toast.success('Modelo atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar modelo');
    },
  });
}

export function useDeleteMeetingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leadership_meeting_templates')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-templates'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-templates-all'] });
      toast.success('Modelo removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover modelo');
    },
  });
}
