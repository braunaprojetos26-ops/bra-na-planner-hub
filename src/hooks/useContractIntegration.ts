import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContactData {
  full_name: string;
  cpf: string;
  rg?: string;
  rg_issuer?: string;
  rg_issue_date?: string;
  birth_date?: string;
  marital_status?: string;
  profession?: string;
  income?: number;
  email: string;
  phone: string;
  zip_code?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  city?: string;
  state?: string;
}

export interface ContractIntegrationData {
  contactId: string;
  planType: 'novo_planejamento' | 'planejamento_pontual';
  planValue: number;
  billingType: 'assinatura' | 'fatura_avulsa';
  paymentMethodCode: 'credit_card' | 'pix' | 'pix_bank_slip' | 'bank_slip_yapay';
  billingDate: string;
  installments?: number;
  startDate: string;
  endDate: string;
  meetingCount: number;
  productId: string;
  contactData: ContactData;
}

interface IntegrationResult {
  success: boolean;
  contractId: string;
  clicksign: {
    documentKey: string;
    status: string;
    error?: string;
  };
  vindi: {
    customerId: string;
    billId?: string;
    subscriptionId?: string;
    status: string;
    error?: string;
  };
}

export function useContractIntegration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ContractIntegrationData): Promise<IntegrationResult> => {
      const { data: result, error } = await supabase.functions.invoke('create-contract-payment', {
        body: data,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao processar contrato');
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido');
      }

      return result as IntegrationResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
      
      const clicksignOk = result.clicksign.status === 'sent';
      const vindiOk = result.vindi.status === 'sent';

      if (clicksignOk && vindiOk) {
        toast({
          title: 'Contrato e cobrança criados com sucesso!',
          description: 'O cliente receberá os links por email.',
        });
      } else if (clicksignOk) {
        toast({
          title: 'Contrato enviado, mas houve erro na cobrança',
          description: result.vindi.error || 'Verifique a configuração da Vindi',
          variant: 'destructive',
        });
      } else if (vindiOk) {
        toast({
          title: 'Cobrança criada, mas houve erro no contrato',
          description: result.clicksign.error || 'Verifique a configuração da ClickSign',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erros nas integrações',
          description: 'Verifique as configurações das APIs',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar contrato',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
