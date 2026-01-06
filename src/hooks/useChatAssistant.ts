import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'confirmation';
  content: string;
  timestamp: Date;
  confirmationData?: {
    contactId: string;
    contactName: string;
    clientCode?: string;
    meetingContent: string;
  };
}

export function useChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = useCallback(async (content: string, type: 'question' | 'meeting' = 'question') => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let assistantContent = '';
    const assistantId = crypto.randomUUID();

    try {
      // Get the current session to use the user's access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Você precisa estar logado para usar o assistente.');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role === 'confirmation' ? 'assistant' : m.role,
            content: m.content,
          })),
          type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar mensagem');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Add empty assistant message to start streaming into
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => prev.map(m => 
                m.id === assistantId ? { ...m, content: assistantContent } : m
              ));
            }
          } catch {
            // Incomplete JSON, put it back
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => prev.map(m => 
                m.id === assistantId ? { ...m, content: assistantContent } : m
              ));
            }
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Erro no chat',
        description: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
        variant: 'destructive',
      });
      // Remove the empty assistant message if error
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }

    return assistantContent;
  }, [messages, toast]);

  const addConfirmationMessage = useCallback((contactId: string, contactName: string, clientCode: string | undefined, meetingContent: string) => {
    const confirmationMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'confirmation',
      content: `📌 Identifiquei o cliente **${contactName}**${clientCode ? ` (${clientCode})` : ''}. Deseja salvar a ata nas anotações deste contato?`,
      timestamp: new Date(),
      confirmationData: {
        contactId,
        contactName,
        clientCode,
        meetingContent,
      },
    };
    setMessages(prev => [...prev, confirmationMessage]);
  }, []);

  const removeConfirmationMessages = useCallback(() => {
    setMessages(prev => prev.filter(m => m.role !== 'confirmation'));
  }, []);

  const saveToContactNotes = useCallback(async (contactId: string, meetingContent: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get contact info
      const { data: contact, error: fetchError } = await supabase
        .from('contacts')
        .select('full_name')
        .eq('id', contactId)
        .single();

      if (fetchError) throw fetchError;

      // Clean up the content (remove the client ID line)
      const cleanContent = meetingContent.replace(/\n?\[CLIENTE_ID:.*\]/g, '').trim();
      
      // Try to extract meeting type from content
      const meetingTypeMatch = cleanContent.match(/\*\*Tipo de Reunião:\*\*\s*([^\n]+)/i) ||
                               cleanContent.match(/Tipo de Reunião:\s*([^\n]+)/i) ||
                               cleanContent.match(/Reunião de\s+(\w+)/i);
      const meetingType = meetingTypeMatch ? meetingTypeMatch[1].trim() : 'Reunião';

      // Save to meeting_minutes table
      const { error: insertError } = await supabase
        .from('meeting_minutes')
        .insert({
          contact_id: contactId,
          meeting_type: meetingType,
          meeting_date: new Date().toISOString(),
          content: cleanContent,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      // Also save to history
      await supabase.from('contact_history').insert({
        contact_id: contactId,
        action: 'meeting_minute_created',
        notes: `📋 Ata de reunião "${meetingType}" gerada pelo assistente`,
        changed_by: user.id,
      });

      // Add success message to chat
      const successMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `✅ **Ata salva automaticamente!**\n\nA ata foi salva na seção "Atas de Reunião" de **${contact?.full_name || 'contato'}**.\n\n[Ver atas do contato →](/contacts/${contactId})`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev.filter(m => m.role !== 'confirmation'), successMessage]);

      toast({
        title: 'Ata salva',
        description: `A ata foi salva no histórico de ${contact?.full_name}`,
      });

      return true;
    } catch (error) {
      console.error('Error saving meeting minute:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a ata de reunião.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const saveToHistory = useCallback(async (contactId: string, notes: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para salvar no histórico.',
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase
      .from('contact_history')
      .insert({
        contact_id: contactId,
        action: 'ai_meeting_summary',
        notes,
        changed_by: user.id,
      });

    if (error) {
      console.error('Error saving to history:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a ata no histórico do contato.',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Ata salva',
      description: 'A ata foi salva no histórico do contato.',
    });
    return true;
  }, [toast]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    saveToHistory,
    saveToContactNotes,
    addConfirmationMessage,
    removeConfirmationMessages,
    clearMessages,
  };
}
