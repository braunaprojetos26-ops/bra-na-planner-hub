import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeaderInputs } from './useOneOnOneMeetings';

export interface AIPreparationRequest {
  plannerId: string;
  plannerName: string;
  templateId?: string;
  leaderInputs: LeaderInputs;
}

export interface AIPreparationResponse {
  preparation: string;
  suggestedAgenda: string[];
  tips: string[];
}

export interface AIChatRequest {
  plannerId: string;
  plannerName: string;
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AIChatResponse {
  response: string;
}

export function useAIPrepareMeeting() {
  return useMutation({
    mutationFn: async (data: AIPreparationRequest): Promise<AIPreparationResponse> => {
      const { data: response, error } = await supabase.functions
        .invoke('ai-leadership-coach', {
          body: {
            action: 'prepare_meeting',
            ...data,
          },
        });

      if (error) throw error;
      return response;
    },
    onError: (error) => {
      console.error('AI preparation error:', error);
      toast.error('Erro ao preparar reunião com IA');
    },
  });
}

export function useAIChat() {
  return useMutation({
    mutationFn: async (data: AIChatRequest): Promise<AIChatResponse> => {
      const { data: response, error } = await supabase.functions
        .invoke('ai-leadership-coach', {
          body: {
            action: 'chat',
            ...data,
          },
        });

      if (error) throw error;
      return response;
    },
    onError: (error) => {
      console.error('AI chat error:', error);
      toast.error('Erro ao comunicar com IA');
    },
  });
}
