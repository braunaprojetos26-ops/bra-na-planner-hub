import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';

interface RDCRMConfig {
  connected: boolean;
  connected_at?: string;
  account_name?: string;
}

export interface ImportJobStatus {
  id: string;
  status: string; // pending | fetching_deals | fetching_contacts | importing | done | error
  deals_found: number;
  contacts_found: number;
  contacts_imported: number;
  contacts_skipped: number;
  contacts_errors: number;
  error_details: Array<{ name: string; error: string }>;
  error_message: string | null;
}

export interface RDCRMUser {
  id: string;
  name: string;
  email: string;
}

interface ImportParams {
  rd_user_id: string;
  import_type: 'contacts' | 'deals';
  owner_user_id?: string;
}

interface CreateSystemUserParams {
  email: string;
  full_name: string;
}

interface CreateSystemUserResult {
  user_id: string;
  already_existed: boolean;
}

export function useRDCRM() {
  const { toast } = useToast();
  const updateSetting = useUpdateSystemSetting();

  const { data: setting, isLoading } = useSystemSetting('rd_crm_config');

  const config: RDCRMConfig = (setting?.value as unknown as RDCRMConfig) || {
    connected: false,
  };

  const isConnected = config.connected === true;

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('rd-crm', {
        body: { action: 'test_connection' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha na conexão');
      return data.data;
    },
    onSuccess: (accountData) => {
      const newConfig: RDCRMConfig = {
        connected: true,
        connected_at: new Date().toISOString(),
        account_name: accountData?.name || 'RD Station CRM',
      };
      updateSetting.mutate({
        key: 'rd_crm_config',
        value: newConfig as unknown as Record<string, unknown>,
        description: 'Configuração da integração com RD Station CRM',
      });
      toast({
        title: 'Conectado ao RD Station CRM!',
        description: 'Token validado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na conexão',
        description: error.message || 'Não foi possível conectar ao RD Station CRM.',
        variant: 'destructive',
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const newConfig: RDCRMConfig = { connected: false };
      await updateSetting.mutateAsync({
        key: 'rd_crm_config',
        value: newConfig as unknown as Record<string, unknown>,
        description: 'Configuração da integração com RD Station CRM',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Desconectado',
        description: 'Integração com RD Station CRM foi desconectada.',
      });
    },
  });

  const listUsersMutation = useMutation({
    mutationFn: async (): Promise<RDCRMUser[]> => {
      const { data, error } = await supabase.functions.invoke('rd-crm', {
        body: { action: 'list_users' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao listar usuários');
      return data.data as RDCRMUser[];
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao listar usuários do RD CRM',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createSystemUserMutation = useMutation({
    mutationFn: async (params: CreateSystemUserParams): Promise<CreateSystemUserResult> => {
      const { data, error } = await supabase.functions.invoke('rd-crm', {
        body: { action: 'create_system_user', ...params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao criar usuário');
      return data.data as CreateSystemUserResult;
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar usuário no sistema',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Start backfill sources job
  const startBackfillSourcesMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('rd-crm', {
        body: { action: 'start_backfill_sources' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao iniciar backfill');
      return data.data.job_id as string;
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao iniciar atualização de fontes',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Start async import job
  const startImportMutation = useMutation({
    mutationFn: async (params: ImportParams): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('rd-crm', {
        body: { action: 'start_import', ...params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao iniciar importação');
      return data.data.job_id as string;
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao iniciar importação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Poll job status
  const pollJobStatus = async (jobId: string): Promise<ImportJobStatus> => {
    const { data, error } = await supabase.functions.invoke('rd-crm', {
      body: { action: 'get_import_status', job_id: jobId },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Falha ao consultar status');
    return data.data as ImportJobStatus;
  };

  return {
    config,
    isLoading,
    isConnected,
    testConnection: testConnectionMutation.mutate,
    isTesting: testConnectionMutation.isPending,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    // Users
    listUsers: listUsersMutation.mutateAsync,
    isListingUsers: listUsersMutation.isPending,
    rdUsers: listUsersMutation.data,
    // Create system user
    createSystemUser: createSystemUserMutation.mutateAsync,
    isCreatingUser: createSystemUserMutation.isPending,
    // Async import
    startImport: startImportMutation.mutateAsync,
    isStartingImport: startImportMutation.isPending,
    pollJobStatus,
    // Backfill sources
    startBackfillSources: startBackfillSourcesMutation.mutateAsync,
    isStartingBackfill: startBackfillSourcesMutation.isPending,
  };
}
