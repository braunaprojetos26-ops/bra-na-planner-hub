import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface PreQualificationQuestion {
  id: string;
  label: string;
  key: string;
  field_type: 'text' | 'textarea' | 'select' | 'multi_select' | 'number' | 'boolean';
  options: Json;
  placeholder: string | null;
  is_required: boolean;
  is_active: boolean;
  order_position: number;
  created_at: string;
  updated_at: string;
}

export interface PreQualificationResponse {
  id: string;
  contact_id: string;
  meeting_id: string | null;
  token: string;
  responses: Json;
  submitted_at: string | null;
  viewed_at: string | null;
  viewed_by: string | null;
  created_at: string;
  updated_at: string;
}

// Hook to fetch all questions (for admin)
export function usePreQualificationQuestions() {
  return useQuery({
    queryKey: ['pre-qualification-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pre_qualification_questions')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) throw error;
      return data as PreQualificationQuestion[];
    },
  });
}

// Hook to fetch active questions (for public form)
export function useActivePreQualificationQuestions() {
  return useQuery({
    queryKey: ['pre-qualification-questions', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pre_qualification_questions')
        .select('*')
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      return data as PreQualificationQuestion[];
    },
  });
}

// Hook to create a question
export function useCreatePreQualificationQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (question: {
      label: string;
      key: string;
      field_type: string;
      options?: Json;
      placeholder?: string | null;
      is_required?: boolean;
      is_active?: boolean;
      order_position?: number;
    }) => {
      const { data, error } = await supabase
        .from('pre_qualification_questions')
        .insert(question)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-qualification-questions'] });
      toast({ title: 'Pergunta criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar pergunta', description: error.message, variant: 'destructive' });
    },
  });
}

// Hook to update a question
export function useUpdatePreQualificationQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      label?: string;
      key?: string;
      field_type?: string;
      options?: Json;
      placeholder?: string | null;
      is_required?: boolean;
      is_active?: boolean;
      order_position?: number;
    }) => {
      const { data, error } = await supabase
        .from('pre_qualification_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-qualification-questions'] });
      toast({ title: 'Pergunta atualizada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar pergunta', description: error.message, variant: 'destructive' });
    },
  });
}

// Hook to delete a question
export function useDeletePreQualificationQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pre_qualification_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-qualification-questions'] });
      toast({ title: 'Pergunta removida com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover pergunta', description: error.message, variant: 'destructive' });
    },
  });
}

// Hook to reorder questions
export function useReorderPreQualificationQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        order_position: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('pre_qualification_questions')
          .update({ order_position: update.order_position })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-qualification-questions'] });
    },
  });
}

// Hook to get response by token (for public form)
export function usePreQualificationByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['pre-qualification-response', token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase
        .from('pre_qualification_responses')
        .select(`
          *,
          contact:contacts(id, full_name),
          meeting:meetings(id, scheduled_at, meeting_type)
        `)
        .eq('token', token)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });
}

// Hook to submit response (for public form)
export function useSubmitPreQualificationResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, responses }: { token: string; responses: Json }) => {
      const { data, error } = await supabase
        .from('pre_qualification_responses')
        .update({
          responses,
          submitted_at: new Date().toISOString(),
        })
        .eq('token', token)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pre-qualification-response', variables.token] });
    },
  });
}

// Hook to get response for a contact
export function useContactPreQualification(contactId: string | undefined) {
  return useQuery({
    queryKey: ['pre-qualification-response', 'contact', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from('pre_qualification_responses')
        .select('*')
        .eq('contact_id', contactId)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PreQualificationResponse | null;
    },
    enabled: !!contactId,
  });
}

// Hook to mark response as viewed
export function useMarkPreQualificationViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ responseId, userId }: { responseId: string; userId: string }) => {
      const { error } = await supabase
        .from('pre_qualification_responses')
        .update({
          viewed_at: new Date().toISOString(),
          viewed_by: userId,
        })
        .eq('id', responseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-qualification-response'] });
    },
  });
}

// Hook to create a pre-qualification response (when scheduling a meeting)
export function useCreatePreQualificationResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, meetingId }: { contactId: string; meetingId: string }) => {
      // Generate a unique token
      const token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

      const { data, error } = await supabase
        .from('pre_qualification_responses')
        .insert({
          contact_id: contactId,
          meeting_id: meetingId,
          token,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PreQualificationResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-qualification-response'] });
    },
  });
}

// Hook to get the form link for a meeting
export function useMeetingPreQualificationLink(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['pre-qualification-response', 'meeting', meetingId],
    queryFn: async () => {
      if (!meetingId) return null;

      const { data, error } = await supabase
        .from('pre_qualification_responses')
        .select('token, submitted_at')
        .eq('meeting_id', meetingId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
  });
}
