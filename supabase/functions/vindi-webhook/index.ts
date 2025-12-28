import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de status Vindi para status interno
const vindiStatusMap: Record<string, string> = {
  // Bill events
  'bill_created': 'pending',
  'bill_paid': 'paid',
  'bill_canceled': 'cancelled',
  // Charge events (parcelas)
  'charge_created': 'pending',
  'charge_paid': 'paid', // Primeira parcela paga = trabalho inicia
  'charge_rejected': 'rejected',
  'charge_refunded': 'refunded',
  // Subscription events
  'subscription_created': 'pending',
  'subscription_activated': 'paid',
  'subscription_canceled': 'cancelled',
  'subscription_reactivated': 'paid',
  // Payment profile
  'payment_profile_created': 'pending',
};

// Labels para notificações
const notificationMessages: Record<string, { title: string; message: string }> = {
  'bill_created': { title: 'Fatura emitida', message: 'Nova fatura foi emitida para o cliente' },
  'bill_paid': { title: 'Fatura paga! 💰', message: 'O cliente pagou a fatura' },
  'bill_canceled': { title: 'Fatura cancelada', message: 'A fatura do cliente foi cancelada' },
  'charge_created': { title: 'Cobrança criada', message: 'Nova cobrança criada para o cliente' },
  'charge_paid': { title: 'Pagamento confirmado! 💰', message: 'O cliente pagou' },
  'charge_rejected': { title: 'Pagamento rejeitado ⚠️', message: 'O pagamento do cliente foi rejeitado' },
  'charge_refunded': { title: 'Pagamento estornado', message: 'O pagamento foi estornado' },
  'subscription_created': { title: 'Assinatura criada', message: 'Nova assinatura criada para o cliente' },
  'subscription_activated': { title: 'Assinatura ativa! 💰', message: 'A assinatura do cliente foi ativada' },
  'subscription_canceled': { title: 'Assinatura cancelada', message: 'A assinatura do cliente foi cancelada' },
  'subscription_reactivated': { title: 'Assinatura reativada', message: 'A assinatura do cliente foi reativada' },
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Vindi webhook received:', JSON.stringify(payload, null, 2));

    const eventType = payload.event?.type;
    const eventData = payload.event?.data;

    if (!eventType || !eventData) {
      console.log('Invalid webhook payload - missing event type or data');
      return new Response(JSON.stringify({ success: false, error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair informações relevantes do evento
    const bill = eventData.bill;
    const charge = eventData.charge;
    const subscription = eventData.subscription;
    
    // Determinar IDs para buscar o contrato
    const vindiSubscriptionId = subscription?.id?.toString() || bill?.subscription?.id?.toString() || charge?.bill?.subscription?.id?.toString();
    const vindiBillId = bill?.id?.toString() || charge?.bill?.id?.toString();

    console.log(`Event: ${eventType}, Subscription ID: ${vindiSubscriptionId}, Bill ID: ${vindiBillId}`);

    // Buscar o contrato correspondente
    let contract = null;
    
    if (vindiSubscriptionId) {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, owner_id, contact_id, vindi_status, installments, contact:contacts(full_name)')
        .eq('vindi_subscription_id', vindiSubscriptionId)
        .maybeSingle();
      
      if (!error && data) {
        contract = data;
        console.log('Found contract by subscription ID:', contract.id);
      }
    }
    
    if (!contract && vindiBillId) {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, owner_id, contact_id, vindi_status, installments, contact:contacts(full_name)')
        .eq('vindi_bill_id', vindiBillId)
        .maybeSingle();
      
      if (!error && data) {
        contract = data;
        console.log('Found contract by bill ID:', contract.id);
      }
    }

    if (!contract) {
      console.log('No contract found for this event');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No matching contract found - event logged' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atualizar status do contrato
    const newStatus = vindiStatusMap[eventType] || contract.vindi_status;
    
    // Para cobranças (parcelas), a primeira paga já é considerada "paid"
    // porque o importante é que o trabalho pode iniciar
    const updateData: Record<string, unknown> = {
      vindi_status: newStatus,
    };

    // Atualizar dados de progresso de pagamento se for cobrança paga
    if (eventType === 'charge_paid' && charge) {
      // Calcular quantas parcelas já foram pagas
      // O charge.installment mostra qual parcela é (1, 2, 3...)
      const chargeInstallment = charge.installment || 1;
      
      // Armazenar o progresso de pagamento no custom_data
      const { data: currentContract } = await supabase
        .from('contracts')
        .select('custom_data')
        .eq('id', contract.id)
        .single();
      
      const currentCustomData = (currentContract?.custom_data || {}) as Record<string, unknown>;
      updateData.custom_data = {
        ...currentCustomData,
        paid_installments: chargeInstallment,
        last_payment_at: new Date().toISOString(),
      };
    }

    const { error: updateError } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', contract.id);

    if (updateError) {
      console.error('Error updating contract:', updateError);
      throw updateError;
    }

    console.log(`Contract ${contract.id} updated with status: ${newStatus}`);

    // Criar notificação para o owner do contrato
    const notificationConfig = notificationMessages[eventType];
    
    if (notificationConfig && contract.owner_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contactData = contract.contact as any;
      const contactName = contactData?.full_name || 'Cliente';
      
      // Mensagem detalhada baseada no tipo de evento
      let detailedMessage = notificationConfig.message;
      
      if (eventType === 'charge_paid' && charge) {
        const installment = charge.installment || 1;
        const totalInstallments = contract.installments || 1;
        if (totalInstallments > 1) {
          detailedMessage = `${contactName} pagou a parcela ${installment}/${totalInstallments}`;
        } else {
          detailedMessage = `${contactName} realizou o pagamento`;
        }
      } else {
        detailedMessage = `${contactName}: ${notificationConfig.message}`;
      }

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: contract.owner_id,
          title: notificationConfig.title,
          message: detailedMessage,
          type: 'payment',
          link: '/contracts',
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      } else {
        console.log('Notification created for user:', contract.owner_id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      contract_id: contract.id,
      new_status: newStatus,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Vindi webhook error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
