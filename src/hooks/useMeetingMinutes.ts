import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MeetingMinute } from '@/types/meetingMinutes';

export function useMeetingMinutes(contactId: string) {
  return useQuery({
    queryKey: ['meeting-minutes', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_minutes')
        .select('*')
        .eq('contact_id', contactId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      
      // Fetch profile info for each minute
      const createdByIds = [...new Set(data.map(m => m.created_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', createdByIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(m => ({
        ...m,
        created_by_profile: profilesMap.get(m.created_by) || undefined,
      })) as MeetingMinute[];
    },
    enabled: !!contactId,
  });
}

export function useCreateMeetingMinute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      contact_id: string;
      meeting_id?: string | null;
      meeting_type: string;
      meeting_date: string;
      content: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { data: result, error } = await supabase
        .from('meeting_minutes')
        .insert({
          contact_id: data.contact_id,
          meeting_id: data.meeting_id || null,
          meeting_type: data.meeting_type,
          meeting_date: data.meeting_date,
          content: data.content,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Also log to contact history
      await supabase.from('contact_history').insert({
        contact_id: data.contact_id,
        action: 'meeting_minute_created',
        notes: `Ata de reunião "${data.meeting_type}" criada`,
        changed_by: user.user.id,
      });

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes', variables.contact_id] });
      queryClient.invalidateQueries({ queryKey: ['contact-history', variables.contact_id] });
      toast({
        title: 'Ata salva',
        description: 'A ata de reunião foi salva com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error creating meeting minute:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a ata de reunião.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMeetingMinute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, contactId, data }: {
      id: string;
      contactId: string;
      data: {
        meeting_type?: string;
        meeting_date?: string;
        content?: string;
      };
    }) => {
      const { data: result, error } = await supabase
        .from('meeting_minutes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes', variables.contactId] });
      toast({
        title: 'Ata atualizada',
        description: 'A ata de reunião foi atualizada com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating meeting minute:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar a ata de reunião.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMeetingMinute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from('meeting_minutes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes', variables.contactId] });
      toast({
        title: 'Ata excluída',
        description: 'A ata de reunião foi excluída com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error deleting meeting minute:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a ata de reunião.',
        variant: 'destructive',
      });
    },
  });
}
