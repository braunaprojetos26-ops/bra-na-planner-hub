import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Meeting } from '@/types/meetings';

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

export function useOpportunityMeetings(opportunityId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meetings', 'opportunity', opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          contact:contacts(id, full_name, email),
          scheduled_by_profile:profiles!meetings_scheduled_by_fkey(full_name, email)
        `)
        .eq('opportunity_id', opportunityId!)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data as Meeting[];
    },
    enabled: !!user && !!opportunityId,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ contactId, opportunityId, data }: { 
      contactId: string; 
      opportunityId?: string | null;
      data: {
        meeting_type: string;
        scheduled_at: Date;
        duration_minutes: number;
        participants: string[];
        allows_companion: boolean;
        notes?: string;
      };
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('meetings')
        .insert({
          contact_id: contactId,
          opportunity_id: opportunityId || null,
          scheduled_by: user.id,
          meeting_type: data.meeting_type,
          scheduled_at: data.scheduled_at.toISOString(),
          duration_minutes: data.duration_minutes,
          participants: data.participants,
          allows_companion: data.allows_companion,
          notes: data.notes || null,
        });

      if (error) throw error;

      // Add entry to contact_history
      await supabase.from('contact_history').insert({
        contact_id: contactId,
        changed_by: user.id,
        action: `Reunião agendada: ${data.meeting_type}`,
        notes: data.notes || null,
      });
    },
    onSuccess: (_, { contactId, opportunityId }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', contactId] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meetings', 'opportunity', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['contact-history'] });
    },
  });
}

export function useUpdateMeetingStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ meetingId, status, contactId, meetingType }: { 
      meetingId: string; 
      status: string;
      contactId: string;
      meetingType: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('meetings')
        .update({ status })
        .eq('id', meetingId);

      if (error) throw error;

      // Add entry to contact_history
      const statusLabels: Record<string, string> = {
        completed: 'Reunião realizada',
        cancelled: 'Reunião cancelada',
        no_show: 'Não compareceu à reunião',
      };
      
      const actionLabel = statusLabels[status] || `Status da reunião alterado para: ${status}`;
      
      await supabase.from('contact_history').insert({
        contact_id: contactId,
        changed_by: user.id,
        action: `${actionLabel}: ${meetingType}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['contact-history'] });
    },
  });
}

export function useRescheduleMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      originalMeeting,
      newData,
    }: {
      originalMeeting: Meeting;
      newData: {
        meeting_type: string;
        scheduled_at: Date;
        duration_minutes: number;
        participants: string[];
        allows_companion: boolean;
        notes?: string;
      };
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Calculate new reschedule count
      const newRescheduleCount = originalMeeting.reschedule_count + 1;

      // Mark original meeting as rescheduled
      const { error: updateError } = await supabase
        .from('meetings')
        .update({ status: 'rescheduled' })
        .eq('id', originalMeeting.id);

      if (updateError) throw updateError;

      // Create new meeting linked to original
      const { error: insertError } = await supabase
        .from('meetings')
        .insert({
          contact_id: originalMeeting.contact_id,
          opportunity_id: originalMeeting.opportunity_id,
          scheduled_by: user.id,
          meeting_type: newData.meeting_type,
          scheduled_at: newData.scheduled_at.toISOString(),
          duration_minutes: newData.duration_minutes,
          participants: newData.participants,
          allows_companion: newData.allows_companion,
          notes: newData.notes || null,
          parent_meeting_id: originalMeeting.parent_meeting_id || originalMeeting.id,
          reschedule_count: newRescheduleCount,
        });

      if (insertError) throw insertError;

      // Add entry to contact_history
      const formattedDate = newData.scheduled_at.toLocaleDateString('pt-BR');
      await supabase.from('contact_history').insert({
        contact_id: originalMeeting.contact_id,
        changed_by: user.id,
        action: `Reunião reagendada: ${newData.meeting_type} - Nova data: ${formattedDate}`,
        notes: newData.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['contact-history'] });
    },
  });
}
