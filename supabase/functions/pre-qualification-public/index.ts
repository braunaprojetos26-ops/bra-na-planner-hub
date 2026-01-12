import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    
    // GET: Fetch response by token (for public form display)
    if (req.method === "GET") {
      const token = url.searchParams.get("token");
      
      if (!token || token.length < 8) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch the response with related data
      const { data: responseData, error: responseError } = await supabase
        .from("pre_qualification_responses")
        .select(`
          id,
          token,
          submitted_at,
          responses,
          contact_id,
          meeting_id
        `)
        .eq("token", token)
        .maybeSingle();

      if (responseError) {
        console.error("Error fetching response:", responseError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!responseData) {
        return new Response(
          JSON.stringify({ error: "Token not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch contact name (limited data for public display)
      let contact = null;
      if (responseData.contact_id) {
        const { data: contactData } = await supabase
          .from("contacts")
          .select("id, full_name")
          .eq("id", responseData.contact_id)
          .single();
        contact = contactData;
      }

      // Fetch meeting info
      let meeting = null;
      if (responseData.meeting_id) {
        const { data: meetingData } = await supabase
          .from("meetings")
          .select("id, scheduled_at, meeting_type")
          .eq("id", responseData.meeting_id)
          .single();
        meeting = meetingData;
      }

      return new Response(
        JSON.stringify({
          ...responseData,
          contact,
          meeting,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Submit responses
    if (req.method === "POST") {
      const body = await req.json();
      const { token, responses } = body;

      if (!token || token.length < 8) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!responses || typeof responses !== "object") {
        return new Response(
          JSON.stringify({ error: "Invalid responses format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // First check if the response exists and hasn't been submitted
      const { data: existingResponse, error: checkError } = await supabase
        .from("pre_qualification_responses")
        .select("id, submitted_at")
        .eq("token", token)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking response:", checkError);
        return new Response(
          JSON.stringify({ error: "Failed to validate token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!existingResponse) {
        return new Response(
          JSON.stringify({ error: "Token not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existingResponse.submitted_at) {
        return new Response(
          JSON.stringify({ error: "Response already submitted" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update the response
      const { data, error } = await supabase
        .from("pre_qualification_responses")
        .update({
          responses,
          submitted_at: new Date().toISOString(),
        })
        .eq("token", token)
        .is("submitted_at", null)
        .select()
        .single();

      if (error) {
        console.error("Error submitting response:", error);
        return new Response(
          JSON.stringify({ error: "Failed to submit response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
