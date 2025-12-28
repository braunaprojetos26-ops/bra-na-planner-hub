import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClickSignEvent {
  event: {
    name: string;
    occurred_at: string;
  };
  document: {
    key: string;
    status: string;
    auto_close?: boolean;
  };
  signer?: {
    key: string;
    email: string;
    name?: string;
    sign_as?: string;
    events?: Array<{
      name: string;
      occurred_at: string;
    }>;
  };
  account?: {
    key: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('ClickSign webhook received');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload
    const payload: ClickSignEvent = await req.json();
    
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));

    const eventName = payload.event?.name;
    const documentKey = payload.document?.key;
    const documentStatus = payload.document?.status;

    if (!documentKey) {
      console.error('No document key in payload');
      return new Response(
        JSON.stringify({ error: 'Missing document key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Event: ${eventName}, Document Key: ${documentKey}, Status: ${documentStatus}`);

    // Find the contract by clicksign_document_key
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('id, status, clicksign_status, owner_id, contact_id')
      .eq('clicksign_document_key', documentKey)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching contract:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contract) {
      console.log(`No contract found for document key: ${documentKey}`);
      // Return 200 to acknowledge receipt even if we don't have the contract
      return new Response(
        JSON.stringify({ message: 'Contract not found, webhook acknowledged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found contract: ${contract.id}`);

    // Determine new status based on event
    let newStatus: string | null = null;
    let newClicksignStatus: string | null = null;
    let notificationMessage: string | null = null;

    switch (eventName) {
      case 'auto_close':
        // Document was automatically closed (all signatures complete)
        newStatus = 'active';
        newClicksignStatus = 'signed';
        notificationMessage = 'Contrato assinado com sucesso!';
        console.log('Document auto_close - all signatures complete');
        break;

      case 'sign':
        // A signer has signed
        // Check if this is the last signer (document status becomes 'closed')
        if (documentStatus === 'closed') {
          newStatus = 'active';
          newClicksignStatus = 'signed';
          notificationMessage = 'Contrato assinado com sucesso!';
          console.log('Final signature received, document closed');
        } else {
          // Partial signature, just update clicksign status
          newClicksignStatus = 'partially_signed';
          console.log('Partial signature received');
        }
        break;

      case 'cancel':
        // Document was cancelled
        newStatus = 'cancelled';
        newClicksignStatus = 'cancelled';
        notificationMessage = 'Contrato foi cancelado.';
        console.log('Document cancelled');
        break;

      case 'deadline':
        // Document deadline passed
        newClicksignStatus = 'expired';
        console.log('Document deadline passed');
        break;

      case 'refuse':
        // Signer refused to sign
        newStatus = 'cancelled';
        newClicksignStatus = 'refused';
        notificationMessage = 'Contrato foi recusado pelo signatário.';
        console.log('Document refused');
        break;

      default:
        console.log(`Unhandled event: ${eventName}`);
    }

    // Update the contract if we have changes
    if (newStatus || newClicksignStatus) {
      const updateData: Record<string, string> = {};
      
      if (newStatus) {
        updateData.status = newStatus;
      }
      if (newClicksignStatus) {
        updateData.clicksign_status = newClicksignStatus;
      }

      console.log('Updating contract with:', updateData);

      const { error: updateError } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', contract.id);

      if (updateError) {
        console.error('Error updating contract:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update contract' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Contract updated successfully');

      // Create notification for the owner if we have a message
      if (notificationMessage && contract.owner_id) {
        // Fetch contact name for the notification
        const { data: contactData } = await supabase
          .from('contacts')
          .select('full_name')
          .eq('id', contract.contact_id)
          .single();

        const contactName = contactData?.full_name || 'Cliente';

        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: contract.owner_id,
            title: 'Atualização de Contrato',
            message: `${contactName}: ${notificationMessage}`,
            type: 'contract_update',
            link: '/contracts',
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
          // Don't fail the webhook for notification errors
        } else {
          console.log('Notification created for owner');
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        contract_id: contract.id,
        event: eventName,
        new_status: newStatus,
        new_clicksign_status: newClicksignStatus
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
