import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface OutlookConnection {
  id: string;
  user_id: string;
  expires_at: string;
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
        .select('id, user_id, expires_at, created_at, updated_at')
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

  // Check if token is expired
  const isExpired = connection ? new Date(connection.expires_at) < new Date() : false;
  const isConnected = !!connection && !isExpired;

  // Start OAuth flow
  const connect = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para conectar o Outlook.',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão não encontrada');
      }

      // Call edge function to get auth URL
      const { data, error } = await supabase.functions.invoke('get-outlook-auth-url', {
        body: { userId: user.id },
      });

      if (error) throw error;
      if (!data?.authUrl) throw new Error('URL de autenticação não retornada');

      // Build URL with state containing user info
      const authUrl = new URL(data.authUrl);
      authUrl.searchParams.set('state', `${user.id}:${session.access_token}`);

      // Open popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl.toString(),
        'outlook-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      // Poll for popup close
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setIsConnecting(false);
          // Refetch connection status
          setTimeout(() => refetch(), 1000);
        }
      }, 500);

    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      toast({
        title: 'Erro ao conectar',
        description: 'Não foi possível iniciar a conexão com o Outlook. Tente novamente.',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  }, [user?.id, toast, refetch]);

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
    isExpired,
    isConnecting,
    connect,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    refetch,
  };
}
