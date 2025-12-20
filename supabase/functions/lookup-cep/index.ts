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
    
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    
    console.log('ViaCEP response:', data);

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
