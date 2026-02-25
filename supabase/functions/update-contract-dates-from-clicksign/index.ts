import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const clicksignApiKey = Deno.env.get("CLICKSIGN_API_KEY")!;

    // Get all contracts that have a clicksign_document_key
    const { data: contracts, error: fetchErr } = await supabase
      .from("contracts")
      .select("id, clicksign_document_key, reported_at")
      .not("clicksign_document_key", "is", null)
      .order("id");

    if (fetchErr) throw fetchErr;
    if (!contracts?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No contracts with ClickSign keys", total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${contracts.length} contracts with ClickSign keys`);

    // Load all ClickSign envelopes
    const allEnvelopes = await loadAllClicksignEnvelopes(clicksignApiKey);
    console.log(`Loaded ${allEnvelopes.length} ClickSign envelopes`);

    // Build lookup map by envelope id
    const envelopeMap = new Map<string, any>();
    for (const env of allEnvelopes) {
      envelopeMap.set(env.id, env);
    }

    const results: any[] = [];
    let updated = 0;

    for (const contract of contracts) {
      const envelope = envelopeMap.get(contract.clicksign_document_key);
      if (envelope?.created) {
        const clicksignDate = envelope.created;
        
        // Update reported_at with ClickSign creation date
        const { error: updateErr } = await supabase
          .from("contracts")
          .update({ reported_at: clicksignDate })
          .eq("id", contract.id);

        if (!updateErr) {
          updated++;
          results.push({
            contract_id: contract.id,
            old_date: contract.reported_at,
            new_date: clicksignDate,
            status: "updated",
          });
        } else {
          results.push({
            contract_id: contract.id,
            status: "error",
            error: updateErr.message,
          });
        }
      } else {
        results.push({
          contract_id: contract.id,
          clicksign_key: contract.clicksign_document_key,
          status: "envelope_not_found",
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: contracts.length, updated, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Load ALL envelopes from ClickSign API v3
async function loadAllClicksignEnvelopes(apiKey: string): Promise<any[]> {
  const baseUrl = "https://app.clicksign.com/api/v3/envelopes";
  const headers = { "Authorization": apiKey, "Accept": "application/json" };
  const pageSize = 50;

  const firstRes = await fetch(`${baseUrl}?page[number]=1&page[size]=${pageSize}`, { headers });
  if (!firstRes.ok) {
    console.error("ClickSign v3 first page error:", firstRes.status);
    return [];
  }
  const firstData = await firstRes.json();
  const totalRecords = firstData.meta?.record_count || 0;
  const totalPages = Math.ceil(totalRecords / pageSize);
  
  const allEnvelopes: any[] = (firstData.data || []).map(mapEnvelope);
  console.log(`ClickSign v3: ${totalRecords} envelopes, ${totalPages} pages`);
  
  if (totalPages <= 1) return allEnvelopes;

  for (let batchStart = 2; batchStart <= totalPages; batchStart += 5) {
    const pages = Array.from({ length: 5 }, (_, i) => batchStart + i)
      .filter(p => p <= totalPages);
    
    const results = await Promise.all(
      pages.map(async (page) => {
        try {
          const res = await fetch(`${baseUrl}?page[number]=${page}&page[size]=${pageSize}`, { headers });
          if (!res.ok) return [];
          const data = await res.json();
          return (data.data || []).map(mapEnvelope);
        } catch {
          return [];
        }
      })
    );
    
    for (const envelopes of results) {
      allEnvelopes.push(...envelopes);
    }
  }

  const unique = new Map<string, any>();
  allEnvelopes.forEach(e => unique.set(e.id, e));
  return Array.from(unique.values());
}

function mapEnvelope(envelope: any): any {
  const attrs = envelope.attributes || {};
  return {
    id: envelope.id,
    name: attrs.name || "",
    status: attrs.status || "",
    created: attrs.created_at || attrs.created || null,
    modified: attrs.updated_at || attrs.modified || null,
  };
}
