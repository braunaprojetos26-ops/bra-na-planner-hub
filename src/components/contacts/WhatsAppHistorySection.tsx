import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppMessage {
  id: string;
  contact_id: string;
  message_text: string;
  direction: 'entrada' | 'saida';
  message_timestamp: string;
  created_at: string;
}

interface WhatsAppHistorySectionProps {
  contactId: string;
}

export function WhatsAppHistorySection({ contactId }: WhatsAppHistorySectionProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch inicial + Realtime subscription
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('message_timestamp', { ascending: true }); // Antigas primeiro, novas embaixo

      if (!error && data) {
        setMessages(data as WhatsAppMessage[]);
      }
      setIsLoading(false);
    };

    fetchMessages();

    // Configura Realtime para novas mensagens
    const channel = supabase
      .channel(`whatsapp-messages-${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `contact_id=eq.${contactId}`
        },
        (payload) => {
          const newMessage = payload.new as WhatsAppMessage;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId]);

  // Auto-scroll para a última mensagem (apenas dentro do container)
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const formatMessageTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-1 pt-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <MessageCircle className="w-3 h-3 text-accent" />
          Histórico do WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando mensagens...</p>
        ) : !messages.length ? (
          <p className="text-xs text-muted-foreground">Nenhuma mensagem registrada</p>
        ) : (
          <ScrollArea className="h-[300px] pr-4" ref={scrollAreaRef}>
            <div className="flex flex-col gap-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'entrada' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      message.direction === 'entrada'
                        ? 'bg-blue-500 text-white rounded-bl-none'
                        : 'bg-green-500 text-white rounded-br-none'
                    }`}
                  >
                    <p className="text-xs whitespace-pre-wrap break-words">{message.message_text}</p>
                    <p className="text-[10px] opacity-75 mt-1 text-right">
                      {formatMessageTime(message.message_timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
