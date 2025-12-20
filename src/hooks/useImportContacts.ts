import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ContactFormData } from '@/types/contacts';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

const translateError = (error: string): string => {
  if (error.includes('duplicate key value violates unique constraint "contacts_phone_key"')) {
    return 'Telefone já cadastrado no sistema';
  }
  if (error.includes('duplicate key value violates unique constraint "contacts_cpf_key"')) {
    return 'CPF já cadastrado no sistema';
  }
  if (error.includes('duplicate key value violates unique constraint "contacts_email_key"')) {
    return 'E-mail já cadastrado no sistema';
  }
  if (error.includes('duplicate key value')) {
    return 'Registro duplicado';
  }
  if (error.includes('violates not-null constraint')) {
    return 'Campo obrigatório não preenchido';
  }
  if (error.includes('invalid input syntax')) {
    return 'Formato de dados inválido';
  }
  return error;
};

export function useImportContacts() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contacts: Partial<ContactFormData>[]): Promise<ImportResult> => {
      if (!user) throw new Error('Usuário não autenticado');

      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // Process contacts in batches of 50
      const batchSize = 50;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        
        for (let j = 0; j < batch.length; j++) {
          const contact = batch[j];
          const rowNumber = i + j + 2; // +2 because row 1 is header, and we're 0-indexed

          try {
            // Validate required fields
            if (!contact.full_name?.trim()) {
              throw new Error('Nome completo é obrigatório');
            }
            if (!contact.phone?.trim()) {
              throw new Error('Telefone é obrigatório');
            }

            // Determine owner_id based on role
            const owner_id = role === 'planejador' ? user.id : (contact.owner_id || null);

            // Insert contact
            const { data: newContact, error: insertError } = await supabase
              .from('contacts')
              .insert({
                full_name: contact.full_name.trim(),
                phone: contact.phone.trim(),
                email: contact.email?.trim() || null,
                cpf: contact.cpf?.trim() || null,
                rg: contact.rg?.trim() || null,
                rg_issuer: contact.rg_issuer?.trim() || null,
                rg_issue_date: contact.rg_issue_date || null,
                birth_date: contact.birth_date || null,
                gender: contact.gender || null,
                marital_status: contact.marital_status || null,
                profession: contact.profession?.trim() || null,
                income: contact.income || null,
                zip_code: contact.zip_code?.trim() || null,
                address: contact.address?.trim() || null,
                address_number: contact.address_number?.trim() || null,
                address_complement: contact.address_complement?.trim() || null,
                source: contact.source?.trim() || null,
                source_detail: contact.source_detail?.trim() || null,
                campaign: contact.campaign?.trim() || null,
                temperature: contact.temperature || null,
                qualification: contact.qualification || null,
                notes: contact.notes?.trim() || null,
                is_dirty_base: false,
                owner_id,
                created_by: user.id,
              })
              .select('id')
              .single();

            if (insertError) throw insertError;

            // Create history entry
            if (newContact) {
              await supabase.from('contact_history').insert({
                contact_id: newContact.id,
                action: 'Contato importado via planilha',
                changed_by: user.id,
              });
            }

            result.success++;
          } catch (error: any) {
            result.failed++;
            result.errors.push({
              row: rowNumber,
              error: translateError(error.message || 'Erro desconhecido'),
            });
          }
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      
      if (result.failed === 0) {
        toast({
          title: 'Importação concluída',
          description: `${result.success} contato(s) importado(s) com sucesso!`,
        });
      } else {
        toast({
          title: 'Importação parcial',
          description: `${result.success} sucesso(s), ${result.failed} erro(s)`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro na importação',
        description: error.message || 'Ocorreu um erro ao importar os contatos',
        variant: 'destructive',
      });
    },
  });
}
