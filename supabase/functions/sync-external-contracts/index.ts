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
    const clicksignUrl = "https://app.clicksign.com/api/v1";
    const vindiAuth = "Basic " + btoa(vindiApiKey + ":");

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "all"; // "vindi" | "clicksign" | "all"
    const batchSize = body.batch_size || 10;
    const offset = body.offset || 0;

    // Pre-load all ClickSign documents if needed
    let allClicksignDocs: any[] = [];
    if (mode === "all" || mode === "clicksign") {
      allClicksignDocs = await loadAllClicksignDocs(clicksignUrl, clicksignApiKey);
      // Deduplicate by document key
      const uniqueDocs = new Map();
      allClicksignDocs.forEach(d => uniqueDocs.set(d.key, d));
      allClicksignDocs = Array.from(uniqueDocs.values());
      console.log(`Loaded ${allClicksignDocs.length} unique ClickSign documents (before dedup: ${uniqueDocs.size})`);
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
        const matchResult = findClicksignMatch(allClicksignDocs, name);

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

// Load ALL documents from ClickSign (paginated)
async function loadAllClicksignDocs(clicksignUrl: string, apiKey: string): Promise<any[]> {
  const seen = new Set<string>();
  const allDocs: any[] = [];
  const baseUrl = `${clicksignUrl}/documents?access_token=${apiKey}&page_size=30`;
  
  // Get first page to know total pages
  const firstRes = await fetch(`${baseUrl}&page=1`, { headers: { "Content-Type": "application/json" } });
  if (!firstRes.ok) return [];
  const firstData = await firstRes.json();
  const firstDocs = firstData.documents || [];
  for (const d of firstDocs) {
    if (!seen.has(d.key)) { seen.add(d.key); allDocs.push(d); }
  }
  
  const totalPages = firstData.page_infos?.total_pages || 1;
  console.log(`ClickSign: ${totalPages} total pages to load`);
  
  if (totalPages <= 1) return allDocs;
  
  // Fetch remaining pages in parallel batches of 5 (conservative to avoid API issues)
  for (let batchStart = 2; batchStart <= totalPages; batchStart += 5) {
    const pages = Array.from({ length: 5 }, (_, i) => batchStart + i)
      .filter(p => p <= totalPages);
    
    const results = await Promise.all(
      pages.map(async (page) => {
        try {
          const res = await fetch(`${baseUrl}&page=${page}`, { headers: { "Content-Type": "application/json" } });
          if (!res.ok) return [];
          const data = await res.json();
          return data.documents || [];
        } catch {
          return [];
        }
      })
    );
    
    for (const docs of results) {
      for (const d of docs) {
        if (!seen.has(d.key)) { seen.add(d.key); allDocs.push(d); }
      }
    }
  }
  
  return allDocs;
}

// Find matching documents for a client name from pre-loaded docs
function findClicksignMatch(
  allDocs: any[], clientName: string
): { key: string; status: string; hasDistrato: boolean } | null {
  const normName = normalizeStr(clientName);
  const nameWords = normName.split(/\s+/).filter(w => w.length >= 2);
  
  if (nameWords.length === 0) return null;
  
  const firstName = nameWords[0];
  const lastName = nameWords[nameWords.length - 1];
  
  // Find all docs whose filename contains the client name
  const matchingDocs = allDocs.filter((d: any) => {
    // Normalize filename: replace em dashes, en dashes, and multiple separators
    const normFile = normalizeStr((d.filename || "").replace(/[–—]/g, "-"));
    
    // Full name match anywhere in filename
    if (normFile.includes(normName)) return true;
    
    // Match by first + last name appearing in the filename
    if (nameWords.length >= 2 && normFile.includes(firstName) && normFile.includes(lastName)) {
      // Extract the "client part" - everything after "financeiro" or after last separator
      const afterFinanceiro = normFile.split("financeiro").pop() || "";
      if (afterFinanceiro.includes(firstName) && afterFinanceiro.includes(lastName)) return true;
      
      // Also check after last " - "
      const parts = normFile.split(" - ");
      const clientPart = parts[parts.length - 1] || "";
      if (clientPart.includes(firstName) && clientPart.includes(lastName)) return true;
    }
    
    return false;
  });
  
  if (matchingDocs.length === 0) return null;
  
  // Check for distrato
  const distratoDoc = matchingDocs.find((d: any) => 
    normalizeStr(d.filename || "").includes("distrato")
  );
  
  // Find the main contract (not distrato)
  const contractDoc = matchingDocs.find((d: any) => {
    const fname = normalizeStr(d.filename || "");
    return !fname.includes("distrato") && (
      fname.includes("planejamento") || fname.includes("contrato") || fname.includes("prestacao")
    );
  });
  
  if (contractDoc) {
    return { key: contractDoc.key, status: contractDoc.status, hasDistrato: !!distratoDoc };
  }
  
  if (distratoDoc) {
    return { key: distratoDoc.key, status: distratoDoc.status, hasDistrato: true };
  }
  
  // Fallback: first matching doc
  return { key: matchingDocs[0].key, status: matchingDocs[0].status, hasDistrato: false };
}
