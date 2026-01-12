import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Meeting } from '@/types/meetings';

// Helper to create Outlook calendar event
async function createOutlookEvent(meeting: {
  meeting_type: string;
  scheduled_at: Date;
  duration_minutes: number;
  participants: string[];
  contact_name: string;
}) {
  try {
    // Check if user has Outlook connected
    const { data: connection } = await supabase
      .from('outlook_connections')
      .select('id')
      .maybeSingle();

    if (!connection) {
      console.log('Outlook not connected, skipping calendar event creation');
      return;
    }

    const endTime = new Date(meeting.scheduled_at);
    endTime.setMinutes(endTime.getMinutes() + meeting.duration_minutes);

    await supabase.functions.invoke('outlook-calendar', {
      body: {
        action: 'create-event',
        event: {
          subject: `${meeting.meeting_type} - ${meeting.contact_name}`,
          start: meeting.scheduled_at.toISOString(),
          end: endTime.toISOString(),
          attendees: meeting.participants,
          body: `<p>Reunião de <strong>${meeting.meeting_type}</strong> com <strong>${meeting.contact_name}</strong></p>`,
        },
      },
    });

    console.log('Outlook calendar event created successfully');
  } catch (error) {
    console.error('Error creating Outlook event:', error);
    // Don't throw - we don't want to fail the meeting creation if Outlook fails
  }
}

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
          scheduled_by_profile:profiles!meetings_scheduled_by_fkey(full_name, email),
          opportunity:opportunities(
            id,
            current_funnel:funnels!opportunities_current_funnel_id_fkey(name),
            current_stage:funnel_stages!opportunities_current_stage_id_fkey(name)
          )
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
    mutationFn: async ({ contactId, contactName, opportunityId, data: meetingData }: { 
      contactId: string; 
      contactName?: string;
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

      const { data, error } = await supabase
        .from('meetings')
        .insert({
          contact_id: contactId,
          opportunity_id: opportunityId || null,
          scheduled_by: user.id,
          meeting_type: meetingData.meeting_type,
          scheduled_at: meetingData.scheduled_at.toISOString(),
          duration_minutes: meetingData.duration_minutes,
          participants: meetingData.participants,
          allows_companion: meetingData.allows_companion,
          notes: meetingData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add entry to contact_history
      await supabase.from('contact_history').insert({
        contact_id: contactId,
        changed_by: user.id,
        action: `Reunião agendada: ${meetingData.meeting_type}`,
        notes: meetingData.notes || null,
      });

      // Try to create Outlook calendar event (non-blocking)
      if (contactName) {
        createOutlookEvent({
          meeting_type: meetingData.meeting_type,
          scheduled_at: meetingData.scheduled_at,
          duration_minutes: meetingData.duration_minutes,
          participants: meetingData.participants,
          contact_name: contactName,
        });
      }

      return data;
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

export function useContactMeetingsForLinking(contactId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meetings', 'for-linking', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          id,
          meeting_type,
          scheduled_at,
          status,
          notes
        `)
        .eq('contact_id', contactId!)
        .in('status', ['completed', 'scheduled'])
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!contactId,
  });
}
