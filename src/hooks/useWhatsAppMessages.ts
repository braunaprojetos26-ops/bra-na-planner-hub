import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppMessage {
  id: string;
  contact_id: string;
  message_text: string;
  direction: 'entrada' | 'saida';
  message_timestamp: string;
  created_at: string;
}

export function useWhatsAppMessages(contactId: string) {
  return useQuery({
    queryKey: ['whatsapp-messages', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('message_timestamp', { ascending: false });

      if (error) throw error;
      return data as WhatsAppMessage[];
    },
    enabled: !!contactId,
  });
}
