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

    // Get ALL planejamento contracts still with import date
    const { data: contracts, error: fetchErr } = await supabase
      .from("contracts")
      .select("id, clicksign_document_key, reported_at, contact_id, contacts!inner(full_name)")
      .eq("product_id", "4b900185-852d-4f25-8ecc-8d21d7d826d5")
      .gte("reported_at", "2026-02-24T00:00:00")
      .lte("reported_at", "2026-02-25T00:00:00")
      .order("id");

    if (fetchErr) throw fetchErr;
    if (!contracts?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No contracts to update", total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${contracts.length} contracts with import date`);

    // Load all ClickSign envelopes
    const allEnvelopes = await loadAllClicksignEnvelopes(clicksignApiKey);
    console.log(`Loaded ${allEnvelopes.length} ClickSign envelopes`);

    // Build lookup by id
    const envelopeById = new Map<string, any>();
    for (const env of allEnvelopes) {
      envelopeById.set(env.id, env);
    }

    const results: any[] = [];
    let updated = 0;

    for (const contract of contracts) {
      const contactName = (contract as any).contacts?.full_name || "";
      let createdDate: string | null = null;
      let matchMethod = "";

      // Strategy 1: Match by existing clicksign_document_key
      if (contract.clicksign_document_key) {
        const envelope = envelopeById.get(contract.clicksign_document_key);
        if (envelope?.created) {
          createdDate = envelope.created;
          matchMethod = "key_match";
        }
      }

      // Strategy 2: Search by contact name in envelope names
      if (!createdDate && contactName) {
        const match = findClicksignMatch(allEnvelopes, contactName);
        if (match?.created) {
          createdDate = match.created;
          matchMethod = "name_match";
          // Also update clicksign_document_key if missing
          if (!contract.clicksign_document_key) {
            await supabase
              .from("contracts")
              .update({ clicksign_document_key: match.key })
              .eq("id", contract.id);
          }
        }
      }

      if (createdDate) {
        const { error: updateErr } = await supabase
          .from("contracts")
          .update({ reported_at: createdDate })
          .eq("id", contract.id);

        if (!updateErr) {
          updated++;
          results.push({
            contract_id: contract.id,
            name: contactName,
            old_date: contract.reported_at,
            new_date: createdDate,
            match_method: matchMethod,
            status: "updated",
          });
        } else {
          results.push({ contract_id: contract.id, name: contactName, status: "error", error: updateErr.message });
        }
      } else {
        results.push({ contract_id: contract.id, name: contactName, status: "not_found" });
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

// ============ HELPERS ============

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findClicksignMatch(
  allEnvelopes: any[], clientName: string
): { key: string; status: string; created: string | null } | null {
  const normName = normalizeStr(clientName);
  const nameWords = normName.split(/\s+/).filter(w => w.length >= 2);
  if (nameWords.length === 0) return null;

  const firstName = nameWords[0];
  const lastName = nameWords[nameWords.length - 1];

  const matching = allEnvelopes.filter((e: any) => {
    const n = normalizeStr(e.name || "");
    if (n.includes(normName)) return true;
    if (nameWords.length >= 2 && n.includes(firstName) && n.includes(lastName)) return true;
    return false;
  });

  if (matching.length === 0) return null;

  // Prefer contract envelope (not distrato)
  const contractEnv = matching.find((e: any) => {
    const n = normalizeStr(e.name || "");
    return !n.includes("distrato") && (
      n.includes("planejamento") || n.includes("contrato") ||
      n.includes("prestacao") || n.includes("envelope de")
    );
  });

  const best = contractEnv || matching[0];
  return { key: best.id, status: best.status, created: best.created };
}

async function loadAllClicksignEnvelopes(apiKey: string): Promise<any[]> {
  const baseUrl = "https://app.clicksign.com/api/v3/envelopes";
  const headers = { "Authorization": apiKey, "Accept": "application/json" };
  const pageSize = 50;

  const firstRes = await fetch(`${baseUrl}?page[number]=1&page[size]=${pageSize}`, { headers });
  if (!firstRes.ok) {
    console.error("ClickSign v3 error:", firstRes.status);
    return [];
  }
  const firstData = await firstRes.json();
  const totalRecords = firstData.meta?.record_count || 0;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const allEnvelopes: any[] = (firstData.data || []).map(mapEnvelope);
  console.log(`ClickSign: ${totalRecords} envelopes, ${totalPages} pages`);

  if (totalPages <= 1) return allEnvelopes;

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
    created: attrs.created_at || attrs.created || null,
  };
}
