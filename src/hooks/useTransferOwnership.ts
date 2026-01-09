import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TransferContactParams {
  contactId: string;
  newOwnerId: string;
  contactName: string;
  newOwnerName: string;
}

interface TransferOpportunityParams {
  opportunityId: string;
  contactId: string;
  newOwnerId: string;
  contactName: string;
  newOwnerName: string;
}

export function useTransferOwnership() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const transferContact = useMutation({
    mutationFn: async ({ contactId, newOwnerId, contactName, newOwnerName }: TransferContactParams) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Check if contact has active opportunities
      const { data: activeOpportunities, error: oppError } = await supabase
        .from('opportunities')
        .select('id')
        .eq('contact_id', contactId)
        .eq('status', 'active')
        .limit(1);

      if (oppError) throw oppError;

      if (activeOpportunities && activeOpportunities.length > 0) {
        throw new Error('Este contato possui negociações ativas. Transfira através da negociação para mover ambos.');
      }

      // Update contact owner
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ owner_id: newOwnerId })
        .eq('id', contactId);

      if (updateError) throw updateError;

      // Create history entry
      const { error: historyError } = await supabase
        .from('contact_history')
        .insert({
          contact_id: contactId,
          changed_by: user.id,
          action: 'owner_transfer',
          notes: `Responsável alterado para ${newOwnerName}`,
        });

      if (historyError) throw historyError;

      // Create notification for new owner
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: newOwnerId,
          title: 'Novo contato atribuído',
          message: `O contato ${contactName} foi transferido para você.`,
          type: 'assignment',
          link: `/contacts/${contactId}`,
        });

      if (notifError) throw notifError;

      return { contactId, newOwnerId };
    },
    onSuccess: (_, variables) => {
      toast.success(`Contato transferido para ${variables.newOwnerName}`);
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact-history', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const transferOpportunity = useMutation({
    mutationFn: async ({ opportunityId, contactId, newOwnerId, contactName, newOwnerName }: TransferOpportunityParams) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Update contact owner (opportunity inherits from contact)
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ owner_id: newOwnerId })
        .eq('id', contactId);

      if (updateError) throw updateError;

      // Create history entry
      const { error: historyError } = await supabase
        .from('contact_history')
        .insert({
          contact_id: contactId,
          changed_by: user.id,
          action: 'owner_transfer',
          notes: `Responsável alterado para ${newOwnerName} (via negociação)`,
        });

      if (historyError) throw historyError;

      // Create notification for new owner
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: newOwnerId,
          title: 'Nova negociação atribuída',
          message: `A negociação do contato ${contactName} foi transferida para você.`,
          type: 'assignment',
          link: `/pipeline/${opportunityId}`,
        });

      if (notifError) throw notifError;

      return { opportunityId, contactId, newOwnerId };
    },
    onSuccess: (_, variables) => {
      toast.success(`Negociação e contato transferidos para ${variables.newOwnerName}`);
      queryClient.invalidateQueries({ queryKey: ['opportunity', variables.opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact-history', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    transferContact,
    transferOpportunity,
  };
}
