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
    // Obter secrets do ambiente
    const MS_CLIENT_ID = Deno.env.get("MS_CLIENT_ID");
    const MS_CLIENT_SECRET = Deno.env.get("MS_CLIENT_SECRET");
    const MS_TENANT_ID = Deno.env.get("MS_TENANT_ID");
    const MS_REDIRECT_URI = Deno.env.get("MS_REDIRECT_URI");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    // Validar secrets obrigatórios
    if (!MS_CLIENT_ID || !MS_CLIENT_SECRET || !MS_TENANT_ID || !MS_REDIRECT_URI) {
      console.error("Missing Microsoft OAuth secrets");
      return new Response(
        renderErrorPage("Configuração incompleta. Contate o administrador."),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Extrair code da query string
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    // Verificar se a Microsoft retornou erro
    if (error) {
      console.error("Microsoft OAuth error:", error, errorDescription);
      return new Response(
        renderErrorPage(`Erro de autenticação: ${errorDescription || error}`),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Validar presença do code
    if (!code) {
      console.error("Missing authorization code");
      return new Response(
        renderErrorPage("Código de autorização não encontrado."),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Verificar autenticação do usuário
    const authHeader = req.headers.get("Authorization");
    
    // O state pode conter o token do usuário para validação
    const state = url.searchParams.get("state");
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Autenticação via header
      const token = authHeader.replace("Bearer ", "");
      const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (!authError && user) {
        userId = user.id;
      }
    } else if (state) {
      // Tentar extrair user_id do state (formato: user_id:token)
      try {
        const [stateUserId, stateToken] = state.split(":");
        if (stateUserId && stateToken) {
          const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: `Bearer ${stateToken}` } },
          });
          const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
          if (!authError && user && user.id === stateUserId) {
            userId = user.id;
          }
        }
      } catch (e) {
        console.error("Error parsing state:", e);
      }
    }

    if (!userId) {
      console.error("User not authenticated");
      return new Response(
        renderErrorPage("Usuário não autenticado. Faça login e tente novamente."),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    console.log("Processing OAuth callback for user:", userId);

    // Trocar o code por tokens com a Microsoft
    const tokenEndpoint = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;
    
    const tokenParams = new URLSearchParams({
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      code: code,
      redirect_uri: MS_REDIRECT_URI,
      grant_type: "authorization_code",
      scope: "offline_access https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read",
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Microsoft token exchange failed:", errorData.error, errorData.error_description);
      return new Response(
        renderErrorPage(`Erro ao obter tokens: ${errorData.error_description || errorData.error}`),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const tokenData = await tokenResponse.json();

    // Extrair tokens (sem logar valores sensíveis)
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in; // em segundos

    if (!accessToken || !refreshToken) {
      console.error("Missing tokens in Microsoft response");
      return new Response(
        renderErrorPage("Resposta inválida da Microsoft. Tente novamente."),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Calcular expires_at
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    console.log("Tokens received, saving to database for user:", userId);

    // Salvar no banco usando service role
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Upsert - atualizar se existir, inserir se não
    const { error: dbError } = await supabaseAdmin
      .from("outlook_connections")
      .upsert(
        {
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (dbError) {
      console.error("Database error saving tokens:", dbError.message);
      return new Response(
        renderErrorPage("Erro ao salvar conexão. Tente novamente."),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    console.log("Outlook connection saved successfully for user:", userId);

    // Retornar página de sucesso
    return new Response(
      renderSuccessPage(),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );

  } catch (error) {
    console.error("Unexpected error in outlook-oauth-callback:", error);
    return new Response(
      renderErrorPage("Erro inesperado. Tente novamente."),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }
});

// Renderizar página HTML de sucesso
function renderSuccessPage(): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Outlook Conectado</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #00d4aa 0%, #00a884 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .icon svg {
      width: 40px;
      height: 40px;
      fill: white;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }
    p {
      color: #a0aec0;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    </div>
    <h1>Outlook conectado com sucesso!</h1>
    <p>Sua conta do Microsoft 365 foi vinculada ao CRM. Você já pode fechar esta janela e voltar ao sistema.</p>
    <a href="javascript:window.close();" class="btn" onclick="window.close(); return false;">Fechar janela</a>
  </div>
</body>
</html>
  `.trim();
}

// Renderizar página HTML de erro
function renderErrorPage(message: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erro na Conexão</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .icon svg {
      width: 40px;
      height: 40px;
      fill: white;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }
    p {
      color: #a0aec0;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .error-message {
      background: rgba(245, 101, 101, 0.1);
      border: 1px solid rgba(245, 101, 101, 0.3);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      color: #fc8181;
      font-size: 0.9rem;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </div>
    <h1>Erro na conexão</h1>
    <div class="error-message">${escapeHtml(message)}</div>
    <p>Feche esta janela e tente novamente.</p>
    <a href="javascript:window.close();" class="btn" onclick="window.close(); return false;">Fechar janela</a>
  </div>
</body>
</html>
  `.trim();
}

// Escapar HTML para prevenir XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
