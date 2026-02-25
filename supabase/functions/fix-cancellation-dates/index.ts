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

    const body = await req.json().catch(() => ({}));
    const contractIds: string[] = body.contract_ids || [];

    if (!contractIds.length) {
      return new Response(
        JSON.stringify({ success: false, error: "No contract_ids" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: cancellations, error } = await supabase
      .from("contract_cancellations")
      .select(`
        id,
        contract_id,
        cancelled_at,
        contract:contracts!inner(
          id,
          clicksign_document_key,
          contact:contacts!inner(full_name)
        )
      `)
      .in("contract_id", contractIds);

    if (error) throw error;

    const updates: any[] = [];
    const allEnvelopes = await loadAllClicksignEnvelopes(clicksignApiKey);
    console.log(`Loaded ${allEnvelopes.length} envelopes`);

    for (const cc of cancellations || []) {
      const contract = cc.contract as any;
      const clientName = contract?.contact?.full_name;
      const envelopeKey = contract?.clicksign_document_key;

      console.log(`Processing: ${clientName} (envelope: ${envelopeKey})`);

      // Strategy 1: Find distrato envelope by client name
      if (clientName) {
        const distratoEnv = findDistrato(allEnvelopes, clientName);
        if (distratoEnv) {
          const date = distratoEnv.created || distratoEnv.modified;
          console.log(`  Found distrato: "${distratoEnv.name}" created=${distratoEnv.created} modified=${distratoEnv.modified}`);
          if (date) {
            await supabase
              .from("contract_cancellations")
              .update({ cancelled_at: date })
              .eq("id", cc.id);
            updates.push({ client: clientName, date, source: "distrato_envelope", envelope: distratoEnv.name });
            continue;
          }
        }
      }

      // Strategy 2: If linked envelope is closed/cancelled, use its modified date
      if (envelopeKey) {
        const env = allEnvelopes.find((e: any) => e.id === envelopeKey);
        if (env) {
          const date = env.modified || env.created;
          console.log(`  Using linked envelope: "${env.name}" modified=${env.modified} created=${env.created}`);
          if (date) {
            await supabase
              .from("contract_cancellations")
              .update({ cancelled_at: date })
              .eq("id", cc.id);
            updates.push({ client: clientName, date, source: "linked_envelope", envelope: env.name });
            continue;
          }
        }
      }

      console.log(`  No date found for ${clientName}`);
      updates.push({ client: clientName, date: null, source: "not_found" });
    }

    return new Response(
      JSON.stringify({ success: true, updated: updates.filter(u => u.date).length, details: updates }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findDistrato(allEnvelopes: any[], clientName: string) {
  const normName = normalizeStr(clientName);
  const nameWords = normName.split(/\s+/).filter((w: string) => w.length >= 2);
  if (nameWords.length === 0) return null;

  const firstName = nameWords[0];
  const lastName = nameWords[nameWords.length - 1];

  const matches = allEnvelopes.filter((e: any) => {
    const eName = normalizeStr(e.name || "");
    if (!eName.includes("distrato")) return false;
    if (eName.includes(normName)) return true;
    if (nameWords.length >= 2 && eName.includes(firstName) && eName.includes(lastName)) return true;
    return false;
  });

  return matches.length > 0
    ? matches.sort((a: any, b: any) => (b.created || "").localeCompare(a.created || ""))[0]
    : null;
}

async function loadAllClicksignEnvelopes(apiKey: string): Promise<any[]> {
  const baseUrl = "https://app.clicksign.com/api/v3/envelopes";
  const headers = { "Authorization": apiKey, "Accept": "application/json" };
  const pageSize = 50;

  const firstRes = await fetch(`${baseUrl}?page[number]=1&page[size]=${pageSize}`, { headers });
  if (!firstRes.ok) return [];
  const firstData = await firstRes.json();
  const totalRecords = firstData.meta?.record_count || 0;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const allEnvelopes: any[] = (firstData.data || []).map(mapEnvelope);

  for (let batchStart = 2; batchStart <= totalPages; batchStart += 5) {
    const pages = Array.from({ length: 5 }, (_, i) => batchStart + i).filter(p => p <= totalPages);
    const results = await Promise.all(
      pages.map(async (page) => {
        try {
          const res = await fetch(`${baseUrl}?page[number]=${page}&page[size]=${pageSize}`, { headers });
          if (!res.ok) return [];
          const data = await res.json();
          return (data.data || []).map(mapEnvelope);
        } catch { return []; }
      })
    );
    for (const envelopes of results) allEnvelopes.push(...envelopes);
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
    created: attrs.created || attrs.created_at || null,
    modified: attrs.modified || attrs.updated_at || null,
  };
}
