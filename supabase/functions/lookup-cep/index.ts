import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cep } = await req.json();
    
    // Remove non-numeric characters
    const cleanCep = cep?.replace(/\D/g, '');
    
    if (!cleanCep || cleanCep.length !== 8) {
      console.log('Invalid CEP format:', cep);
      return new Response(
        JSON.stringify({ erro: true, message: 'CEP inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Fetching address for CEP:', cleanCep);
    
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Lovable/1.0'
      }
    });

    console.log('ViaCEP response status:', response.status);
    
    // Check if response is ok
    if (!response.ok) {
      console.error('ViaCEP returned non-ok status:', response.status);
      return new Response(
        JSON.stringify({ erro: true, message: `Erro na API ViaCEP: ${response.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // Get response as text first to check content
    const responseText = await response.text();
    console.log('ViaCEP raw response:', responseText.substring(0, 200));
    
    // Check if response looks like JSON
    if (!responseText.trim().startsWith('{') && !responseText.trim().startsWith('[')) {
      console.error('ViaCEP returned non-JSON response');
      return new Response(
        JSON.stringify({ erro: true, message: 'Resposta inválida da API ViaCEP' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }
    
    const data = JSON.parse(responseText);
    console.log('ViaCEP parsed response:', data);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching address:', error);
    return new Response(
      JSON.stringify({ erro: true, message: 'Erro ao buscar CEP' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
