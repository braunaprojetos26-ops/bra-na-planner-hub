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

    const vindiApiKey = Deno.env.get("VINDI_API_KEY")!;
    const clicksignApiKey = Deno.env.get("CLICKSIGN_API_KEY")!;
    const vindiUrl = "https://app.vindi.com.br/api/v1";
    const vindiAuth = "Basic " + btoa(vindiApiKey + ":");

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "all"; // "vindi" | "clicksign" | "all"
    const batchSize = body.batch_size || 10;
    const offset = body.offset || 0;

    // Pre-load all ClickSign envelopes via v3 API
    let allClicksignEnvelopes: any[] = [];
    if (mode === "all" || mode === "clicksign") {
      allClicksignEnvelopes = await loadAllClicksignEnvelopes(clicksignApiKey);
      console.log(`Loaded ${allClicksignEnvelopes.length} ClickSign envelopes via v3 API`);
    }

    // Build query based on mode
    let query = supabase
      .from("contracts")
      .select("id, contact_id, contract_value, contacts!inner(full_name, email, cpf, phone)")
      .eq("product_id", "4b900185-852d-4f25-8ecc-8d21d7d826d5")
      .eq("status", "active");

    if (mode === "vindi") {
      query = query.is("vindi_customer_id", null);
    } else if (mode === "clicksign") {
      query = query.is("clicksign_document_key", null);
    } else {
      // "all" - get contracts missing either
      query = query.or("vindi_customer_id.is.null,clicksign_document_key.is.null");
    }

    const { data: contracts, error: fetchErr } = await query
      .range(offset, offset + batchSize - 1)
      .order("id");

    if (fetchErr) throw fetchErr;
    if (!contracts?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No more contracts to process", total: 0, done: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const contract of contracts) {
      const contact = (contract as any).contacts;
      const email = contact?.email;
      const cpf = contact?.cpf?.replace(/\D/g, "");
      const phone = contact?.phone?.replace(/\D/g, "");
      const name = contact?.full_name || "";
      const result: any = { contract_id: contract.id, name, email, cpf };

      // ============ VINDI ============
      if (mode === "all" || mode === "vindi") {
        let vindiCustomerId = "";
        let vindiSubscriptionId = "";

        // Strategy 1: search by email
        if (email) {
          const found = await vindiSearchCustomer(vindiUrl, vindiAuth, `email:${email}`);
          if (found) vindiCustomerId = found;
        }

        // Strategy 2: search by CPF (registry_code)
        if (!vindiCustomerId && cpf && cpf.length >= 11) {
          const found = await vindiSearchCustomer(vindiUrl, vindiAuth, `registry_code:${cpf}`);
          if (found) vindiCustomerId = found;
        }

        // Strategy 3: search by name
        if (!vindiCustomerId && name) {
          const found = await vindiSearchCustomer(vindiUrl, vindiAuth, `name:${name}`);
          if (found) vindiCustomerId = found;
        }

        // Strategy 4: search by phone
        if (!vindiCustomerId && phone && phone.length >= 10) {
          const found = await vindiSearchCustomer(vindiUrl, vindiAuth, `phone_number:${phone}`);
          if (found) vindiCustomerId = found;
        }

        if (vindiCustomerId) {
          result.vindi_customer_id = vindiCustomerId;

          // Search subscriptions (active first, then any)
          vindiSubscriptionId = await vindiFindSubscription(vindiUrl, vindiAuth, vindiCustomerId);
          if (vindiSubscriptionId) {
            result.vindi_subscription_id = vindiSubscriptionId;
            result.vindi = "linked";
          } else {
            // Check for bills
            const billId = await vindiFindBill(vindiUrl, vindiAuth, vindiCustomerId);
            if (billId) {
              result.vindi_bill_id = billId;
              result.vindi = "bill_found";
            } else {
              result.vindi = "customer_only";
            }
          }
        } else {
          result.vindi = "not_found";
        }
      }

    // ============ CLICKSIGN ============
      if (mode === "all" || mode === "clicksign") {
        const matchResult = findClicksignMatch(allClicksignEnvelopes, name);

        if (matchResult) {
          result.clicksign_document_key = matchResult.key;
          result.clicksign_has_distrato = matchResult.hasDistrato;
          if (matchResult.hasDistrato) {
            result.clicksign_status = "cancelled";
          } else if (matchResult.status === "closed") {
            result.clicksign_status = "signed";
          } else if (matchResult.status === "running") {
            result.clicksign_status = "pending";
          } else if (matchResult.status === "canceled") {
            result.clicksign_status = "cancelled";
          } else {
            result.clicksign_status = matchResult.status;
          }
          result.clicksign = "linked";
        } else {
          result.clicksign = "not_found";
        }
      }

      // ============ UPDATE CONTRACT ============
      const updates: any = {};
      if (result.vindi_customer_id) updates.vindi_customer_id = result.vindi_customer_id;
      if (result.vindi_subscription_id) {
        updates.vindi_subscription_id = result.vindi_subscription_id;
        updates.vindi_status = "active";
      }
      if (result.vindi_bill_id) {
        updates.vindi_bill_id = result.vindi_bill_id;
        updates.vindi_status = "active";
      }
      if (result.clicksign_document_key) {
        updates.clicksign_document_key = result.clicksign_document_key;
        updates.clicksign_status = result.clicksign_status || "signed";
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateErr } = await supabase
          .from("contracts")
          .update(updates)
          .eq("id", contract.id);
        result.updated = !updateErr;
        if (updateErr) result.update_error = updateErr.message;
      }

      results.push(result);
      await new Promise((r) => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: contracts.length,
        offset,
        next_offset: offset + contracts.length,
        done: contracts.length < batchSize,
        results,
      }),
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

// ============ HELPER FUNCTIONS ============

async function vindiSearchCustomer(
  vindiUrl: string, auth: string, query: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${vindiUrl}/customers?query=${encodeURIComponent(query)}`,
      { headers: { Authorization: auth, "Content-Type": "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.customers?.length > 0) {
        return String(data.customers[0].id);
      }
    }
  } catch (e) {
    console.error("Vindi search error:", e);
  }
  return null;
}

async function vindiFindSubscription(
  vindiUrl: string, auth: string, customerId: string
): Promise<string | null> {
  try {
    // Try active subscriptions first
    const res = await fetch(
      `${vindiUrl}/subscriptions?query=customer_id:${customerId} status:active`,
      { headers: { Authorization: auth, "Content-Type": "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.subscriptions?.length > 0) {
        return String(data.subscriptions[0].id);
      }
    }
    // Try any subscription
    const res2 = await fetch(
      `${vindiUrl}/subscriptions?query=customer_id:${customerId}`,
      { headers: { Authorization: auth, "Content-Type": "application/json" } }
    );
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.subscriptions?.length > 0) {
        return String(data2.subscriptions[0].id);
      }
    }
  } catch (e) {
    console.error("Vindi subscription search error:", e);
  }
  return null;
}

async function vindiFindBill(
  vindiUrl: string, auth: string, customerId: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${vindiUrl}/bills?query=customer_id:${customerId}`,
      { headers: { Authorization: auth, "Content-Type": "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.bills?.length > 0) {
        return String(data.bills[0].id);
      }
    }
  } catch (e) {
    console.error("Vindi bill search error:", e);
  }
  return null;
}

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Load ALL envelopes from ClickSign API v3 (stable pagination)
async function loadAllClicksignEnvelopes(apiKey: string): Promise<any[]> {
  const baseUrl = "https://app.clicksign.com/api/v3/envelopes";
  const headers = { "Authorization": apiKey, "Accept": "application/json" };
  const pageSize = 50; // Max allowed by v3

  // Get first page to know total
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

  // Fetch remaining pages in parallel batches of 5
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

  // Deduplicate by id
  const unique = new Map<string, any>();
  allEnvelopes.forEach(e => unique.set(e.id, e));
  return Array.from(unique.values());
}

// Map v3 envelope to a simplified object
function mapEnvelope(envelope: any): any {
  const attrs = envelope.attributes || {};
  return {
    id: envelope.id,
    name: attrs.name || "",
    status: attrs.status || "",
    created: attrs.created,
    modified: attrs.modified,
  };
}

// Find matching envelopes for a client name from pre-loaded v3 envelopes
function findClicksignMatch(
  allEnvelopes: any[], clientName: string
): { key: string; status: string; hasDistrato: boolean } | null {
  const normName = normalizeStr(clientName);
  const nameWords = normName.split(/\s+/).filter(w => w.length >= 2);
  
  if (nameWords.length === 0) return null;
  
  const firstName = nameWords[0];
  const lastName = nameWords[nameWords.length - 1];
  
  // Find all envelopes whose name contains the client name
  const matchingEnvelopes = allEnvelopes.filter((e: any) => {
    const normEnvName = normalizeStr(e.name || "");
    
    // Full name match
    if (normEnvName.includes(normName)) return true;
    
    // Match by first + last name (handles cases like "Ingrid Pelajo" vs "Ingrid de Freitas Pelajo")
    if (nameWords.length >= 2 && normEnvName.includes(firstName) && normEnvName.includes(lastName)) {
      return true;
    }
    
    return false;
  });
  
  if (matchingEnvelopes.length === 0) return null;
  
  // Check for distrato
  const distratoEnv = matchingEnvelopes.find((e: any) => 
    normalizeStr(e.name || "").includes("distrato")
  );
  
  // Find the main contract envelope (not distrato)
  const contractEnv = matchingEnvelopes.find((e: any) => {
    const eName = normalizeStr(e.name || "");
    return !eName.includes("distrato") && (
      eName.includes("planejamento") || eName.includes("contrato") || 
      eName.includes("prestacao") || eName.includes("envelope de")
    );
  });
  
  if (contractEnv) {
    return { key: contractEnv.id, status: contractEnv.status, hasDistrato: !!distratoEnv };
  }
  
  if (distratoEnv) {
    return { key: distratoEnv.id, status: distratoEnv.status, hasDistrato: true };
  }
  
  // Fallback: first matching envelope
  return { key: matchingEnvelopes[0].id, status: matchingEnvelopes[0].status, hasDistrato: false };
}
