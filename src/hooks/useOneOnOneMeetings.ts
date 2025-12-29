import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export type MeetingStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';

export interface LeaderInputs {
  problems?: string;
  concerns?: string;
  objectives?: string;
  notes?: string;
}

export interface TopicResponse {
  completed: boolean;
  notes: string;
}

export type TopicResponses = Record<string, TopicResponse>;

export interface OneOnOneMeeting {
  id: string;
  plannerId: string;
  leaderId: string;
  templateId: string | null;
  templateName?: string;
  templateTopics?: Array<{ id: string; title: string; description: string; orderPosition: number }>;
  scheduledDate: string | null;
  completedAt: string | null;
  status: MeetingStatus;
  notes: string | null;
  aiPreparation: string | null;
  leaderInputs: LeaderInputs;
  topicResponses: TopicResponses;
  createdAt: string;
  updatedAt: string;
}

export function useOneOnOneMeetings(plannerId: string) {
  return useQuery({
    queryKey: ['one-on-one-meetings', plannerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('one_on_one_meetings')
        .select(`
          *,
          template:leadership_meeting_templates(name, topics)
        `)
        .eq('planner_id', plannerId)
        .order('scheduled_date', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(meeting => ({
        id: meeting.id,
        plannerId: meeting.planner_id,
        leaderId: meeting.leader_id,
        templateId: meeting.template_id,
        templateName: meeting.template?.name,
        templateTopics: (Array.isArray(meeting.template?.topics) ? meeting.template.topics : []) as OneOnOneMeeting['templateTopics'],
        scheduledDate: meeting.scheduled_date,
        completedAt: meeting.completed_at,
        status: meeting.status as MeetingStatus,
        notes: meeting.notes,
        aiPreparation: meeting.ai_preparation,
        leaderInputs: (meeting.leader_inputs as LeaderInputs) || {},
        topicResponses: (typeof meeting.topic_responses === 'object' && meeting.topic_responses !== null && !Array.isArray(meeting.topic_responses) ? meeting.topic_responses : {}) as unknown as TopicResponses,
        createdAt: meeting.created_at,
        updatedAt: meeting.updated_at,
      })) as OneOnOneMeeting[];
    },
    enabled: !!plannerId,
  });
}

export function useCreateOneOnOneMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      plannerId: string;
      templateId?: string;
      scheduledDate?: string;
      leaderInputs?: LeaderInputs;
    }) => {
      const { error } = await supabase
        .from('one_on_one_meetings')
        .insert({
          planner_id: data.plannerId,
          leader_id: user!.id,
          template_id: data.templateId || null,
          scheduled_date: data.scheduledDate || null,
          status: data.scheduledDate ? 'scheduled' : 'pending',
          leader_inputs: (data.leaderInputs || {}) as Json,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['one-on-one-meetings', variables.plannerId] });
      toast.success('Reunião criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar reunião');
    },
  });
}

export function useUpdateOneOnOneMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      plannerId: string;
      templateId?: string;
      scheduledDate?: string;
      status?: MeetingStatus;
      notes?: string;
      aiPreparation?: string;
      leaderInputs?: LeaderInputs;
      topicResponses?: TopicResponses;
      completedAt?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (data.templateId !== undefined) updateData.template_id = data.templateId;
      if (data.scheduledDate !== undefined) updateData.scheduled_date = data.scheduledDate;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.aiPreparation !== undefined) updateData.ai_preparation = data.aiPreparation;
      if (data.leaderInputs !== undefined) updateData.leader_inputs = data.leaderInputs as Json;
      if (data.topicResponses !== undefined) updateData.topic_responses = data.topicResponses as unknown as Json;
      if (data.completedAt !== undefined) updateData.completed_at = data.completedAt;

      const { error } = await supabase
        .from('one_on_one_meetings')
        .update(updateData)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['one-on-one-meetings', variables.plannerId] });
      toast.success('Reunião atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar reunião');
    },
  });
}

export function useDeleteOneOnOneMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; plannerId: string }) => {
      const { error } = await supabase
        .from('one_on_one_meetings')
        .delete()
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['one-on-one-meetings', variables.plannerId] });
      toast.success('Reunião removida com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover reunião');
    },
  });
}
