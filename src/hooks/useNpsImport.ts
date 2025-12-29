import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NpsImportRecord {
  email: string;
  npsValue: number;
  responseDate: string;
}

interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; error: string }>;
}

export function useNpsImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (records: NpsImportRecord[]): Promise<ImportResult> => {
      if (!user) throw new Error('User not authenticated');
      
      setIsProcessing(true);
      
      const errors: Array<{ row: number; error: string }> = [];
      let successCount = 0;
      
      // Create import batch
      const batchId = crypto.randomUUID();
      
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          // Find contact by email
          const { data: contacts, error: contactError } = await supabase
            .from('contacts')
            .select('id')
            .eq('email', record.email.toLowerCase().trim())
            .limit(1);
          
          if (contactError) throw contactError;
          
          if (!contacts || contacts.length === 0) {
            errors.push({ row: i + 2, error: `Email não encontrado: ${record.email}` });
            continue;
          }
          
          const contactId = contacts[0].id;
          
          // Insert NPS response
          const { error: insertError } = await supabase
            .from('nps_responses')
            .insert({
              contact_id: contactId,
              nps_value: record.npsValue,
              response_date: record.responseDate,
              imported_by: user.id,
              import_batch_id: batchId,
            });
          
          if (insertError) {
            errors.push({ row: i + 2, error: insertError.message });
          } else {
            successCount++;
          }
        } catch (err: any) {
          errors.push({ row: i + 2, error: err.message || 'Erro desconhecido' });
        }
      }
      
      // Log the import
      await supabase.from('nps_imports').insert({
        id: batchId,
        imported_by: user.id,
        file_name: 'manual_import',
        total_records: records.length,
        success_count: successCount,
        error_count: errors.length,
        errors: errors,
      });
      
      setIsProcessing(false);
      
      return {
        success: errors.length === 0,
        totalRecords: records.length,
        successCount,
        errorCount: errors.length,
        errors,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['nps-imports'] });
      queryClient.invalidateQueries({ queryKey: ['health-score'] });
      
      if (result.success) {
        toast.success(`${result.successCount} respostas NPS importadas com sucesso!`);
      } else {
        toast.warning(`Importação concluída: ${result.successCount} sucesso, ${result.errorCount} erros`);
      }
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      toast.error(`Erro na importação: ${error.message}`);
    },
  });

  return {
    importNps: importMutation.mutate,
    isImporting: importMutation.isPending || isProcessing,
    importResult: importMutation.data,
  };
}

export function useNpsImportHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nps-imports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nps_imports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
