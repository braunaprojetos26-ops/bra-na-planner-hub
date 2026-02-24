import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';

interface RDCRMConfig {
  connected: boolean;
  connected_at?: string;
  account_name?: string;
}

interface ImportResult {
  total_fetched: number;
  imported: number;
  skipped: number;
  errors: number;
  error_details: Array<{ name: string; error: string }>;
}

export interface RDCRMUser {
  id: string;
  name: string;
  email: string;
}

interface ImportParams {
  rd_user_id?: string;
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

  // List RD CRM users
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

  // Create system user
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

  // Import contacts with optional filters
  const importContactsMutation = useMutation({
    mutationFn: async (params: ImportParams = {}): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke('rd-crm', {
        body: { action: 'import_contacts', ...params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha na importação');
      return data.data as ImportResult;
    },
    onSuccess: (result) => {
      toast({
        title: 'Importação de contatos concluída!',
        description: `${result.imported} importados, ${result.skipped} já existentes, ${result.errors} erros.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na importação de contatos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Import deals with optional filters
  const importDealsMutation = useMutation({
    mutationFn: async (params: ImportParams = {}): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke('rd-crm', {
        body: { action: 'import_deals', ...params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha na importação');
      return data.data as ImportResult;
    },
    onSuccess: (result) => {
      toast({
        title: 'Importação de negociações concluída!',
        description: `${result.imported} importadas, ${result.skipped} ignoradas, ${result.errors} erros.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na importação de negociações',
        description: error.message,
        variant: 'destructive',
      });
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
    // Users
    listUsers: listUsersMutation.mutateAsync,
    isListingUsers: listUsersMutation.isPending,
    rdUsers: listUsersMutation.data,
    // Create system user
    createSystemUser: createSystemUserMutation.mutateAsync,
    isCreatingUser: createSystemUserMutation.isPending,
    // Contacts
    importContacts: importContactsMutation.mutateAsync,
    isImportingContacts: importContactsMutation.isPending,
    importContactsResult: importContactsMutation.data,
    // Deals
    importDeals: importDealsMutation.mutateAsync,
    isImportingDeals: importDealsMutation.isPending,
    importDealsResult: importDealsMutation.data,
  };
}
