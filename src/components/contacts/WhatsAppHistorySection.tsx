import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';

interface WhatsAppHistorySectionProps {
  contactId: string;
}

export function WhatsAppHistorySection({ contactId }: WhatsAppHistorySectionProps) {
  const { data: messages, isLoading } = useWhatsAppMessages(contactId);

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
        ) : !messages?.length ? (
          <p className="text-xs text-muted-foreground">Nenhuma mensagem registrada</p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
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
