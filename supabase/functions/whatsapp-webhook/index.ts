import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Accept',
  'Access-Control-Max-Age': '86400',
};

interface WhatsAppMessage {
  telefone_cliente: string;
  texto_mensagem: string;
  direcao: 'entrada' | 'saida';
  timestamp: string;
}

// Normalize phone number - keep only digits
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Get last N digits of a phone number for flexible matching
function getLastDigits(phone: string, count: number): string {
  const normalized = normalizePhone(phone);
  return normalized.slice(-count);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate API key authentication
  const apiKey = req.headers.get('X-API-Key');
  const expectedKey = Deno.env.get('WHATSAPP_WEBHOOK_API_KEY');

  if (!expectedKey) {
    console.error('WHATSAPP_WEBHOOK_API_KEY is not configured');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    console.error('Invalid or missing API key');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload: WhatsAppMessage = await req.json();
    console.log('Received WhatsApp message:', JSON.stringify(payload));

    // Validate payload
    if (!payload.telefone_cliente || !payload.texto_mensagem || !payload.direcao || !payload.timestamp) {
      console.error('Invalid payload - missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: telefone_cliente, texto_mensagem, direcao, timestamp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.direcao !== 'entrada' && payload.direcao !== 'saida') {
      console.error('Invalid direction:', payload.direcao);
      return new Response(
        JSON.stringify({ error: 'Invalid direction. Must be "entrada" or "saida"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize incoming phone
    const normalizedPhone = normalizePhone(payload.telefone_cliente);
    const last11Digits = getLastDigits(normalizedPhone, 11);
    const last10Digits = getLastDigits(normalizedPhone, 10);

    console.log('Looking for contact with phone:', normalizedPhone);
    console.log('Last 11 digits:', last11Digits);
    console.log('Last 10 digits:', last10Digits);

    // Fetch all contacts and match phone numbers flexibly
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, phone');

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find matching contact
    let matchedContact = null;
    for (const contact of contacts || []) {
      const contactPhoneNormalized = normalizePhone(contact.phone);
      
      // Try exact match first
      if (contactPhoneNormalized === normalizedPhone) {
        matchedContact = contact;
        break;
      }
      
      // Try matching last 11 digits (with area code)
      if (getLastDigits(contactPhoneNormalized, 11) === last11Digits) {
        matchedContact = contact;
        break;
      }
      
      // Try matching last 10 digits (without 9th digit prefix)
      if (getLastDigits(contactPhoneNormalized, 10) === last10Digits) {
        matchedContact = contact;
        break;
      }
    }

    if (!matchedContact) {
      console.log('No matching contact found for phone:', normalizedPhone);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Contact not found',
          phone: payload.telefone_cliente 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found matching contact:', matchedContact.id);

    // Insert the message
    const { data: message, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        contact_id: matchedContact.id,
        message_text: payload.texto_mensagem,
        direction: payload.direcao,
        message_timestamp: payload.timestamp
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Message saved successfully:', message.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: message.id,
        contact_id: matchedContact.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
