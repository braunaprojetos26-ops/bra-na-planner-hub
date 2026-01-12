import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

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

    // Get user's Outlook connection
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: connection, error: connError } = await supabaseAdmin
      .from("outlook_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Outlook não conectado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = connection.access_token;
    const expiresAt = new Date(connection.expires_at);
    
    if (expiresAt <= new Date()) {
      // Token expired, try to refresh
      const refreshed = await refreshToken(connection.refresh_token, supabaseAdmin, user.id);
      if (!refreshed) {
        return new Response(
          JSON.stringify({ error: "Token expirado. Reconecte o Outlook." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      accessToken = refreshed;
    }

    // Parse request body
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create-event": {
        const event = await createCalendarEvent(accessToken, body.event);
        return new Response(
          JSON.stringify({ event }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete-event": {
        await deleteCalendarEvent(accessToken, body.eventId);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check-availability": {
        const events = await getCalendarEvents(accessToken, body.start, body.end);
        return new Response(
          JSON.stringify({ events }),
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
      JSON.stringify({ error: "Erro ao processar requisição" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function refreshToken(refreshToken: string, supabaseAdmin: any, userId: string): Promise<string | null> {
  const MS_CLIENT_ID = Deno.env.get("MS_CLIENT_ID");
  const MS_CLIENT_SECRET = Deno.env.get("MS_CLIENT_SECRET");
  const MS_TENANT_ID = Deno.env.get("MS_TENANT_ID");

  if (!MS_CLIENT_ID || !MS_CLIENT_SECRET || !MS_TENANT_ID) {
    console.error("Missing Microsoft OAuth secrets for refresh");
    return null;
  }

  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "offline_access https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read",
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error("Token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    // Update tokens in database
    await supabaseAdmin
      .from("outlook_connections")
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    console.log("Token refreshed for user:", userId);
    return data.access_token;

  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

async function createCalendarEvent(accessToken: string, event: any) {
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

  const response = await fetch(`${GRAPH_API_BASE}/me/events`, {
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

async function deleteCalendarEvent(accessToken: string, eventId: string) {
  const response = await fetch(`${GRAPH_API_BASE}/me/events/${eventId}`, {
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

async function getCalendarEvents(accessToken: string, start: string, end: string) {
  const params = new URLSearchParams({
    startDateTime: start,
    endDateTime: end,
    $select: "id,subject,start,end,isAllDay",
    $orderby: "start/dateTime",
  });

  const response = await fetch(`${GRAPH_API_BASE}/me/calendarView?${params}`, {
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
