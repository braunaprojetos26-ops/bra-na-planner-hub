const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clicksignApiKey = Deno.env.get("CLICKSIGN_API_KEY")!;
  const clicksignUrl = "https://app.clicksign.com/api/v1";
  const body = await req.json();
  const page = body.page || 1;

  const url = `${clicksignUrl}/documents?access_token=${clicksignApiKey}&page=${page}&page_size=30`;
  
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  const data = await res.json();
  
  return new Response(
    JSON.stringify({ 
      docs_count: (data.documents || []).length,
      page_infos: data.page_infos,
      first_doc: (data.documents || [])[0]?.filename,
      last_doc: (data.documents || []).slice(-1)[0]?.filename,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
