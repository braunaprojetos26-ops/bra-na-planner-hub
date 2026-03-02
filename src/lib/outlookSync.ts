import { supabase } from '@/integrations/supabase/client';

/**
 * Shared helper for syncing events with Outlook calendar.
 * All calls are non-blocking - they won't fail the main operation if Outlook sync fails.
 */

async function isOutlookConnected(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('outlook_connections')
      .select('microsoft_email')
      .maybeSingle();
    return !!data?.microsoft_email;
  } catch {
    return false;
  }
}

export async function syncMeetingToOutlook(meeting: {
  subject: string;
  start: Date;
  end: Date;
  attendees?: string[];
  body?: string;
  location?: string;
}): Promise<string | null> {
  try {
    if (!(await isOutlookConnected())) {
      console.log('Outlook not connected, skipping sync');
      return null;
    }

    const { data, error } = await supabase.functions.invoke('outlook-calendar', {
      body: {
        action: 'create-event',
        event: {
          subject: meeting.subject,
          start: meeting.start.toISOString(),
          end: meeting.end.toISOString(),
          attendees: meeting.attendees || [],
          body: meeting.body,
          location: meeting.location,
        },
      },
    });

    if (error) {
      console.error('Error syncing to Outlook:', error);
      return null;
    }

    console.log('Outlook calendar event created:', data?.event?.id);
    return data?.event?.id || null;
  } catch (error) {
    console.error('Error syncing to Outlook:', error);
    return null;
  }
}

export async function syncTaskToOutlook(task: {
  title: string;
  scheduledAt: Date;
  description?: string;
  durationMinutes?: number;
}): Promise<string | null> {
  const durationMs = (task.durationMinutes || 30) * 60 * 1000;
  const endDate = new Date(task.scheduledAt.getTime() + durationMs);

  return syncMeetingToOutlook({
    subject: `📋 ${task.title}`,
    start: task.scheduledAt,
    end: endDate,
    body: task.description ? `<p>${task.description}</p>` : undefined,
  });
}

export async function deleteOutlookEvent(eventId: string): Promise<void> {
  try {
    if (!(await isOutlookConnected())) return;

    await supabase.functions.invoke('outlook-calendar', {
      body: {
        action: 'delete-event',
        eventId,
      },
    });

    console.log('Outlook event deleted:', eventId);
  } catch (error) {
    console.error('Error deleting Outlook event:', error);
  }
}
