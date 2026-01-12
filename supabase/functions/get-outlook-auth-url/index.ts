import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Microsoft OAuth secrets
    const MS_CLIENT_ID = Deno.env.get("MS_CLIENT_ID");
    const MS_TENANT_ID = Deno.env.get("MS_TENANT_ID");
    const MS_REDIRECT_URI = Deno.env.get("MS_REDIRECT_URI");

    if (!MS_CLIENT_ID || !MS_TENANT_ID || !MS_REDIRECT_URI) {
      console.error("Missing Microsoft OAuth configuration");
      return new Response(
        JSON.stringify({ error: "Configuração do Outlook incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build OAuth authorization URL
    const scopes = [
      "offline_access",
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/User.Read",
    ].join(" ");

    const authUrl = new URL(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize`);
    authUrl.searchParams.set("client_id", MS_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", MS_REDIRECT_URI);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("response_mode", "query");
    authUrl.searchParams.set("prompt", "consent");

    console.log("Generated auth URL for user:", user.id);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-outlook-auth-url:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao gerar URL de autenticação" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
