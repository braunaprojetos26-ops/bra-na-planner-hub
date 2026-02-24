import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RD_BASE_URL = "https://api.rd.services";

function getApiKey(): string {
  const apiKey = Deno.env.get("RD_STATION_API_KEY");
  if (!apiKey) throw new Error("RD_STATION_API_KEY not configured");
  console.log("API Key length:", apiKey.length, "starts with:", apiKey.substring(0, 8));
  return apiKey;
}

// RD Station Marketing API with Private Token uses api_key as query param for conversions
async function rdConversion(payload: Record<string, unknown>) {
  const apiKey = getApiKey();
  const res = await fetch(`${RD_BASE_URL}/platform/conversions?api_key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("RD Station conversion error:", res.status, data);
    throw new Error(data?.errors?.[0]?.error_message || JSON.stringify(data) || `RD Station API error: ${res.status}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...payload } = await req.json();

    let result: unknown;

    switch (action) {
      case "test_connection": {
        // Test by sending a minimal conversion with a test identifier
        // RD Station API Key only supports /platform/conversions
        // We validate the key by making a simple conversion call
        const testPayload = {
          event_type: "CONVERSION",
          event_family: "CDP",
          payload: {
            conversion_identifier: "crm-connection-test",
            email: "test-connection@rdstation-test.com",
          },
        };
        result = await rdConversion(testPayload);
        break;
      }

      case "send_conversion": {
        // Send a conversion event to RD Station (creates or updates lead)
        const { email, name, phone, conversion_identifier, tags, custom_fields, cf_source, cf_campaign } = payload;
        if (!email) throw new Error("Email é obrigatório para conversão");

        const conversionPayload: Record<string, unknown> = {
          event_type: "CONVERSION",
          event_family: "CDP",
          payload: {
            conversion_identifier: conversion_identifier || "crm-lead",
            email,
            name: name || undefined,
            mobile_phone: phone || undefined,
            tags: tags || undefined,
            traffic_source: cf_source || undefined,
            traffic_campaign: cf_campaign || undefined,
            ...(custom_fields || {}),
          },
        };

        // Remove undefined values from payload
        const cleanPayload = conversionPayload.payload as Record<string, unknown>;
        for (const key in cleanPayload) {
          if (cleanPayload[key] === undefined) delete cleanPayload[key];
        }

        result = await rdConversion(conversionPayload);
        break;
      }

      case "register_event": {
        // Register a conversion event (meeting scheduled, contract signed, etc.)
        const { email: evEmail, conversion_identifier: evId, event_data } = payload;
        if (!evEmail) throw new Error("Email é obrigatório");

        const eventPayload = {
          event_type: "CONVERSION",
          event_family: "CDP",
          payload: {
            conversion_identifier: evId || "crm-event",
            email: evEmail,
            ...(event_data || {}),
          },
        };

        result = await rdConversion(eventPayload);
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("RD Station function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
