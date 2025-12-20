import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Meeting, MeetingFormData, MeetingType } from '@/types/meetings';

export function useMeetings(contactId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meetings', contactId],
    queryFn: async () => {
      let query = supabase
        .from('meetings')
        .select(`
          *,
          contact:contacts(id, full_name, email),
          scheduled_by_profile:profiles!meetings_scheduled_by_fkey(full_name, email)
        `)
        .order('scheduled_at', { ascending: true });

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Meeting[];
    },
    enabled: !!user,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ contactId, data }: { contactId: string; data: MeetingFormData }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('meetings')
        .insert({
          contact_id: contactId,
          scheduled_by: user.id,
          meeting_type: data.meeting_type as string,
          scheduled_at: data.scheduled_at.toISOString(),
          duration_minutes: data.duration_minutes,
          participants: data.participants,
          allows_companion: data.allows_companion,
          notes: data.notes || null,
        });

      if (error) throw error;
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', contactId] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useUpdateMeetingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, status }: { meetingId: string; status: string }) => {
      const { error } = await supabase
        .from('meetings')
        .update({ status })
        .eq('id', meetingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}
