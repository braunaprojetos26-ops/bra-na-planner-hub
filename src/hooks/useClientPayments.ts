import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentInstallment {
  id: string;
  installmentNumber: number;
  amount: number;
  status: 'pending' | 'paid' | 'processing' | 'canceled' | 'overdue';
  dueDate: string;
  paidAt: string | null;
  paymentUrl: string | null;
  paymentMethod: string | null;
}

export interface ClientPaymentData {
  success: boolean;
  isUpToDate: boolean;
  overdueCount: number;
  paidCount: number;
  totalCount: number;
  totalAmount: number;
  paidAmount: number;
  installments: PaymentInstallment[];
  vindiStatus: string | null;
  error?: string;
}

export function useClientPayments(contactId: string | undefined) {
  return useQuery({
    queryKey: ['client-payments', contactId],
    queryFn: async (): Promise<ClientPaymentData> => {
      if (!contactId) {
        return {
          success: true,
          isUpToDate: true,
          overdueCount: 0,
          paidCount: 0,
          totalCount: 0,
          totalAmount: 0,
          paidAmount: 0,
          installments: [],
          vindiStatus: null,
        };
      }

      const { data, error } = await supabase.functions.invoke('get-vindi-payments', {
        body: { contactId },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar pagamentos');
      }

      return data as ClientPaymentData;
    },
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });
}
