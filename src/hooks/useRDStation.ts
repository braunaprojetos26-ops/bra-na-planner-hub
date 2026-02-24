import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';

interface RDStationConfig {
  connected: boolean;
  connected_at?: string;
  account_name?: string;
  auto_sync_contacts?: boolean;
  sync_events?: boolean;
}

export function useRDStation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateSetting = useUpdateSystemSetting();

  const { data: setting, isLoading } = useSystemSetting('rd_station_config');

  const config: RDStationConfig = (setting?.value as unknown as RDStationConfig) || {
    connected: false,
  };

  const isConnected = config.connected === true;

  // Test connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('rd-station', {
        body: { action: 'test_connection' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha na conexão');
      return data.data;
    },
    onSuccess: (accountData) => {
      const newConfig: RDStationConfig = {
        connected: true,
        connected_at: new Date().toISOString(),
        account_name: accountData?.name || 'RD Station',
        auto_sync_contacts: config.auto_sync_contacts ?? true,
        sync_events: config.sync_events ?? true,
      };
      updateSetting.mutate({
        key: 'rd_station_config',
        value: newConfig as unknown as Record<string, unknown>,
        description: 'Configuração da integração com RD Station Marketing',
      });
      toast({
        title: 'Conectado ao RD Station!',
        description: `Conta "${accountData?.name || 'RD Station'}" conectada com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na conexão',
        description: error.message || 'Não foi possível conectar ao RD Station. Verifique a API Key.',
        variant: 'destructive',
      });
    },
  });

  // Disconnect
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const newConfig: RDStationConfig = { connected: false };
      await updateSetting.mutateAsync({
        key: 'rd_station_config',
        value: newConfig as unknown as Record<string, unknown>,
        description: 'Configuração da integração com RD Station Marketing',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Desconectado',
        description: 'Integração com RD Station foi desconectada.',
      });
    },
  });

  // Send conversion
  const sendConversionMutation = useMutation({
    mutationFn: async (payload: {
      email: string;
      name?: string;
      phone?: string;
      conversion_identifier?: string;
      tags?: string[];
      custom_fields?: Record<string, unknown>;
      cf_source?: string;
      cf_campaign?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('rd-station', {
        body: { action: 'send_conversion', ...payload },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      return data.data;
    },
  });

  // Register event
  const registerEventMutation = useMutation({
    mutationFn: async (payload: {
      email: string;
      event_type?: string;
      event_family?: string;
      event_data?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke('rd-station', {
        body: { action: 'register_event', ...payload },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      return data.data;
    },
  });

  return {
    config,
    isLoading,
    isConnected,
    testConnection: testConnectionMutation.mutate,
    isTesting: testConnectionMutation.isPending,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    sendConversion: sendConversionMutation.mutateAsync,
    registerEvent: registerEventMutation.mutateAsync,
  };
}
