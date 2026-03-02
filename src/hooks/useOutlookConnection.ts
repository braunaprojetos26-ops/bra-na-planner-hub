import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface OutlookConnection {
  id: string;
  user_id: string;
  microsoft_email: string;
  created_at: string;
  updated_at: string;
}

export function useOutlookConnection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch connection status
  const { data: connection, isLoading, refetch } = useQuery({
    queryKey: ['outlook-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('outlook_connections')
        .select('id, user_id, microsoft_email, created_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching outlook connection:', error);
        return null;
      }

      return data as OutlookConnection | null;
    },
    enabled: !!user?.id,
  });

  const isConnected = !!connection?.microsoft_email;

  // Connect - save Microsoft email and test access
  const connect = async (microsoftEmail: string) => {
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para conectar o Outlook.',
        variant: 'destructive',
      });
      return false;
    }

    setIsConnecting(true);

    try {
      // First save the email
      const { error: upsertError } = await supabase
        .from('outlook_connections')
        .upsert(
          {
            user_id: user.id,
            microsoft_email: microsoftEmail,
            access_token: null,
            refresh_token: null,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) throw upsertError;

      // Test the connection
      const { data, error } = await supabase.functions.invoke('outlook-calendar', {
        body: { action: 'test-connection' },
      });

      if (error || !data?.success) {
        // Rollback - remove the connection
        await supabase.from('outlook_connections').delete().eq('user_id', user.id);
        throw new Error(data?.error || 'Não foi possível acessar o calendário');
      }

      toast({
        title: 'Outlook conectado!',
        description: 'Seu calendário do Microsoft 365 foi vinculado com sucesso.',
      });

      await refetch();
      return true;
    } catch (error: any) {
      console.error('Error connecting Outlook:', error);
      toast({
        title: 'Erro ao conectar',
        description: error.message || 'Não foi possível conectar o Outlook. Verifique o email e tente novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('outlook_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlook-connection'] });
      toast({
        title: 'Desconectado',
        description: 'Sua conta do Outlook foi desvinculada.',
      });
    },
    onError: (error) => {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Erro ao desconectar',
        description: 'Não foi possível desvincular o Outlook. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return {
    connection,
    isLoading,
    isConnected,
    isExpired: false, // No longer relevant with client_credentials
    isConnecting,
    connect,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    refetch,
  };
}
