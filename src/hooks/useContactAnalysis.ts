import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useContactAnalysisMeeting(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-analysis-meeting', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from('meetings')
        .select('id, meeting_type, status, scheduled_at')
        .eq('contact_id', contactId)
        .eq('meeting_type', 'Análise')
        .in('status', ['scheduled', 'completed'])
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });
}

export function useHasAnalysisMeeting(contactId: string | undefined) {
  const { data, isLoading } = useContactAnalysisMeeting(contactId);
  return {
    hasAnalysisMeeting: !!data,
    isLoading,
    analysisMeeting: data,
  };
}
