import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, FileText, HelpCircle, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useChatAssistant, ChatMessage } from '@/hooks/useChatAssistant';
import { useContacts } from '@/hooks/useContacts';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null);
  const [lastMeetingContent, setLastMeetingContent] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isLoading, sendMessage, saveToHistory, clearMessages } = useChatAssistant();
  const { data: contacts } = useContacts();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (type: 'question' | 'meeting' = 'question') => {
    if (!input.trim() || isLoading) return;

    const content = input;
    setInput('');
    const response = await sendMessage(content, type);
    
    if (type === 'meeting' && response) {
      setLastMeetingContent(response);
      // Try to extract client from response
      const clientMatch = response.match(/\[CLIENTE_ID: ([^\|]+)/);
      if (clientMatch) {
        const clientName = clientMatch[1].trim();
        const foundContact = contacts?.find(c => 
          c.full_name.toLowerCase().includes(clientName.toLowerCase())
        );
        if (foundContact) {
          setSelectedContact({ id: foundContact.id, name: foundContact.full_name });
        }
      }
    }
  };

  const handleSaveToHistory = async () => {
    if (!selectedContact || !lastMeetingContent) return;
    
    // Clean up the content (remove the client ID line)
    const cleanContent = lastMeetingContent.replace(/\n?\[CLIENTE_ID:.*\]/, '').trim();
    const formatted = `📋 **Resumo de Reunião (IA)**\n\n${cleanContent}`;
    
    const success = await saveToHistory(selectedContact.id, formatted);
    if (success) {
      setLastMeetingContent(null);
      setSelectedContact(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('question');
    }
  };

  const formatMessage = (content: string) => {
    // Remove client ID line from display
    const cleanContent = content.replace(/\n?\[CLIENTE_ID:.*\]/, '');
    
    // Simple markdown-like formatting
    return cleanContent
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <strong key={i} className="block mt-2">{line.slice(2, -2)}</strong>;
        }
        if (line.startsWith('✅')) {
          return <p key={i} className="mt-2">{line}</p>;
        }
        if (line.startsWith('*Tarefas')) {
          return <p key={i} className="font-medium mt-3 text-primary">{line}</p>;
        }
        if (line.startsWith('[Tarefa')) {
          return <p key={i} className="ml-2 text-muted-foreground">{line}</p>;
        }
        return <p key={i}>{line}</p>;
      });
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>

      {/* Chat Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <DialogTitle>Assistente Brauna</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={clearMessages} title="Limpar conversa">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-b flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (input.trim()) {
                  handleSend('meeting');
                } else {
                  setInput('Cole aqui a transcrição da reunião...');
                  inputRef.current?.focus();
                }
              }}
              disabled={isLoading}
            >
              <FileText className="h-4 w-4 mr-1" />
              Gerar Ata
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setInput('');
                inputRef.current?.focus();
              }}
              disabled={isLoading}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Tirar Dúvida
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Olá! Como posso ajudar?</p>
                <p className="text-sm mt-2">
                  Você pode me fazer perguntas sobre processos internos ou colar uma transcrição de reunião para eu gerar uma ata.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {formatMessage(message.content)}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Save to History Section */}
          {lastMeetingContent && (
            <div className="px-4 py-2 border-t bg-muted/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Salvar ata no histórico de:</span>
                <Popover open={showContactSearch} onOpenChange={setShowContactSearch}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      {selectedContact ? selectedContact.name : 'Selecionar contato...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[300px]">
                    <Command>
                      <CommandInput placeholder="Buscar contato..." />
                      <CommandList>
                        <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                        <CommandGroup>
                          {contacts?.slice(0, 10).map((contact) => (
                            <CommandItem
                              key={contact.id}
                              onSelect={() => {
                                setSelectedContact({ id: contact.id, name: contact.full_name });
                                setShowContactSearch(false);
                              }}
                            >
                              {contact.full_name}
                              {contact.client_code && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {contact.client_code}
                                </Badge>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  size="sm"
                  onClick={handleSaveToHistory}
                  disabled={!selectedContact}
                  className="h-8"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLastMeetingContent(null);
                    setSelectedContact(null);
                  }}
                  className="h-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Cole uma transcrição ou faça uma pergunta..."
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={() => handleSend('question')}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-[60px]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
