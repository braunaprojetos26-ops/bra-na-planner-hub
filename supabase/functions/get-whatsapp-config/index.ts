import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Fetching WhatsApp selectors configuration...')
    
    // Cria cliente Supabase usando variáveis de ambiente
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Busca a configuração no banco
    const { data, error } = await supabase
      .from('app_config')
      .select('value, updated_at')
      .eq('key', 'whatsapp_selectors')
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    if (!data) {
      console.error('Configuration not found')
      throw new Error('Configuration not found')
    }

    console.log('Configuration fetched successfully, updated_at:', data.updated_at)

    // Retorna o JSON com cache headers para otimização
    return new Response(JSON.stringify(data.value), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        // Cache por 5 minutos no browser, 1 hora em CDNs (stale-while-revalidate)
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        // ETag baseado na data de atualização para cache invalidation
        'ETag': `"${new Date(data.updated_at).getTime()}"`,
      },
      status: 200,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in get-whatsapp-config:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
