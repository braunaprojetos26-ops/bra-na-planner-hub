import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

// Cache app token in memory (edge function instance lifetime)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const MS_CLIENT_ID = Deno.env.get("MS_CLIENT_ID");
  const MS_CLIENT_SECRET = Deno.env.get("MS_CLIENT_SECRET");
  const MS_TENANT_ID = Deno.env.get("MS_TENANT_ID");

  if (!MS_CLIENT_ID || !MS_CLIENT_SECRET || !MS_TENANT_ID) {
    throw new Error("Configuração do Microsoft incompleta");
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token request failed:", response.status, errorText);
    throw new Error("Erro ao obter token da Microsoft");
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  console.log("App token obtained successfully");
  return data.access_token;
}

serve(async (req) => {
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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    // Get user's Outlook connection to find their Microsoft email
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: connection, error: connError } = await supabaseAdmin
      .from("outlook_connections")
      .select("microsoft_email")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection?.microsoft_email) {
      return new Response(
        JSON.stringify({ error: "Outlook não conectado. Configure seu email do Microsoft 365 nas configurações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const microsoftEmail = connection.microsoft_email;

    // Get app-level token via client_credentials
    const accessToken = await getAppToken();

    // Parse request body
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create-event": {
        const event = await createCalendarEvent(accessToken, microsoftEmail, body.event);
        return new Response(
          JSON.stringify({ event }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete-event": {
        await deleteCalendarEvent(accessToken, microsoftEmail, body.eventId);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check-availability": {
        const events = await getCalendarEvents(accessToken, microsoftEmail, body.start, body.end);
        return new Response(
          JSON.stringify({ events }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "test-connection": {
        // Test if we can access the user's calendar
        const calendars = await testCalendarAccess(accessToken, microsoftEmail);
        return new Response(
          JSON.stringify({ success: true, calendars }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação não suportada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("Error in outlook-calendar:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao processar requisição" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function testCalendarAccess(accessToken: string, userEmail: string) {
  const response = await fetch(`${GRAPH_API_BASE}/users/${userEmail}/calendars`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Error testing calendar access:", response.status, error);
    throw new Error("Não foi possível acessar o calendário deste email. Verifique se o email está correto.");
  }

  const data = await response.json();
  return data.value?.map((c: any) => ({ id: c.id, name: c.name })) || [];
}

async function createCalendarEvent(accessToken: string, userEmail: string, event: any) {
  const { subject, start, end, attendees, body, location } = event;

  const graphEvent = {
    subject,
    body: body ? {
      contentType: "HTML",
      content: body,
    } : undefined,
    start: {
      dateTime: start,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: end,
      timeZone: "America/Sao_Paulo",
    },
    location: location ? {
      displayName: location,
    } : undefined,
    attendees: attendees?.map((email: string) => ({
      emailAddress: { address: email },
      type: "required",
    })) || [],
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
  };

  const response = await fetch(`${GRAPH_API_BASE}/users/${userEmail}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(graphEvent),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Error creating event:", error);
    throw new Error("Erro ao criar evento no calendário");
  }

  const createdEvent = await response.json();
  console.log("Event created:", createdEvent.id);

  return {
    id: createdEvent.id,
    subject: createdEvent.subject,
    start: createdEvent.start,
    end: createdEvent.end,
    webLink: createdEvent.webLink,
  };
}

async function deleteCalendarEvent(accessToken: string, userEmail: string, eventId: string) {
  const response = await fetch(`${GRAPH_API_BASE}/users/${userEmail}/events/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.error("Error deleting event:", error);
    throw new Error("Erro ao deletar evento do calendário");
  }

  console.log("Event deleted:", eventId);
}

async function getCalendarEvents(accessToken: string, userEmail: string, start: string, end: string) {
  const params = new URLSearchParams({
    startDateTime: start,
    endDateTime: end,
    $select: "id,subject,start,end,isAllDay",
    $orderby: "start/dateTime",
  });

  const response = await fetch(`${GRAPH_API_BASE}/users/${userEmail}/calendarView?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="America/Sao_Paulo"',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Error fetching events:", error);
    throw new Error("Erro ao buscar eventos do calendário");
  }

  const data = await response.json();
  return data.value || [];
}
