import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, FileText, HelpCircle, Trash2, Check, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useChatAssistant, ChatMessage } from '@/hooks/useChatAssistant';
import { useContacts } from '@/hooks/useContacts';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
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
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const { 
    messages, 
    isLoading, 
    sendMessage, 
    saveToContactNotes,
    addConfirmationMessage,
    removeConfirmationMessages,
    clearMessages 
  } = useChatAssistant();
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
      // Try to extract client from response - format: [CLIENTE_ID: Nome | Código: CXX | Confiança: alta]
      const clientMatch = response.match(/\[CLIENTE_ID:\s*([^\|\]]+?)(?:\s*\|\s*Código:\s*([^\|\]]+?))?(?:\s*\|\s*Confiança:\s*([^\]]+?))?\]/i);
      
      console.log('Client extraction:', { 
        fullMatch: clientMatch?.[0], 
        name: clientMatch?.[1]?.trim(), 
        code: clientMatch?.[2]?.trim(),
        confidence: clientMatch?.[3]?.trim()
      });
      
      if (clientMatch) {
        const clientName = clientMatch[1]?.trim();
        const clientCode = clientMatch[2]?.trim(); // Now correctly extracts just "C06"
        
        console.log('Searching for contact:', { clientName, clientCode, totalContacts: contacts?.length });
        
        // Search for contact - prioritize code match, then name
        const foundContact = contacts?.find(c => {
          if (clientCode && c.client_code) {
            // Exact code match (case insensitive)
            return c.client_code.toLowerCase() === clientCode.toLowerCase();
          }
          if (clientName) {
            // Partial name match
            return c.full_name.toLowerCase().includes(clientName.toLowerCase());
          }
          return false;
        });
        
        console.log('Found contact:', foundContact ? { id: foundContact.id, name: foundContact.full_name, code: foundContact.client_code } : 'none');
        
        if (foundContact) {
          // Add confirmation message
          addConfirmationMessage(
            foundContact.id,
            foundContact.full_name,
            foundContact.client_code || undefined,
            response
          );
        } else if (clientName) {
          // Client identified but not found in database - show manual search
          setShowContactSearch(true);
        }
      }
    }
  };

  const handleConfirmSave = async (message: ChatMessage) => {
    if (!message.confirmationData) return;
    
    const { contactId, meetingContent } = message.confirmationData;
    await saveToContactNotes(contactId, meetingContent);
  };

  const handleRejectConfirmation = () => {
    removeConfirmationMessages();
    setShowContactSearch(true);
  };

  const handleManualContactSelect = async (contactId: string, contactName: string) => {
    setShowContactSearch(false);
    
    // Find the last meeting content from messages
    const lastAssistantMessage = [...messages].reverse().find(m => 
      m.role === 'assistant' && m.content.includes('Ata de Reunião')
    );
    
    if (lastAssistantMessage) {
      addConfirmationMessage(contactId, contactName, undefined, lastAssistantMessage.content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('question');
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('/')) {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
        setIsOpen(false);
        navigate(href);
      }
    }
  };

  const formatMessage = (content: string) => {
    // Remove client ID line from display
    const cleanContent = content.replace(/\n?\[CLIENTE_ID:.*\]/g, '');
    
    // Simple markdown-like formatting
    return cleanContent
      .split('\n')
      .map((line, i) => {
        // Handle links
        const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          const [, text, href] = linkMatch;
          const beforeLink = line.substring(0, line.indexOf('['));
          const afterLink = line.substring(line.indexOf(')') + 1);
          return (
            <p key={i}>
              {beforeLink}
              <a href={href} className="text-primary underline hover:no-underline cursor-pointer">
                {text}
              </a>
              {afterLink}
            </p>
          );
        }
        
        // Bold text
        if (line.includes('**')) {
          const parts = line.split(/\*\*([^*]+)\*\*/g);
          return (
            <p key={i} className={line.startsWith('**') ? 'mt-2 font-semibold' : ''}>
              {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
            </p>
          );
        }
        
        if (line.startsWith('✅') || line.startsWith('📌')) {
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

  const filteredContacts = contacts?.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.client_code?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

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
            <div onClick={handleLinkClick}>
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
                            : message.role === 'confirmation'
                            ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700'
                            : 'bg-muted'
                        )}
                      >
                        {message.role === 'confirmation' ? (
                          <div>
                            <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
                              {formatMessage(message.content)}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleConfirmSave(message)}
                                className="h-7 text-xs"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Sim, salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleRejectConfirmation}
                                className="h-7 text-xs"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Escolher outro
                              </Button>
                            </div>
                          </div>
                        ) : message.role === 'assistant' ? (
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
            </div>
          </ScrollArea>

          {/* Manual Contact Search */}
          {showContactSearch && (
            <div className="px-4 py-2 border-t bg-muted/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Selecionar contato manualmente:</span>
                <Popover open={true} onOpenChange={setShowContactSearch}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      Buscar contato...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[300px]">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar contato..." 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                        <CommandGroup>
                          {filteredContacts?.map((contact) => (
                            <CommandItem
                              key={contact.id}
                              onSelect={() => handleManualContactSelect(contact.id, contact.full_name)}
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
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContactSearch(false)}
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
