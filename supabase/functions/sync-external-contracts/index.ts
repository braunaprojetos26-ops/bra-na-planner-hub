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
    const batchSize = body.batch_size || 10; // process in smaller batches to avoid timeout
    const offset = body.offset || 0;

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
        let docKey = "";
        let docStatus = "";

        // Strategy 1: search by full name in document path
        const nameWords = name.split(" ");
        const firstName = nameWords[0] || "";
        const lastName = nameWords[nameWords.length - 1] || "";

        // Try full name search
        const fullResult = await clicksignSearchDoc(clicksignUrl, clicksignApiKey, name);
        if (fullResult) {
          docKey = fullResult.key;
          docStatus = fullResult.status;
        }

        // Strategy 2: first + last name
        if (!docKey && nameWords.length > 1) {
          const shortName = `${firstName} ${lastName}`;
          const shortResult = await clicksignSearchDoc(clicksignUrl, clicksignApiKey, shortName);
          if (shortResult) {
            docKey = shortResult.key;
            docStatus = shortResult.status;
          }
        }

        // Strategy 3: search by CPF
        if (!docKey && cpf) {
          const cpfResult = await clicksignSearchDoc(clicksignUrl, clicksignApiKey, cpf);
          if (cpfResult) {
            docKey = cpfResult.key;
            docStatus = cpfResult.status;
          }
        }

        if (docKey) {
          result.clicksign_document_key = docKey;
          result.clicksign_status = docStatus === "closed" ? "signed"
            : docStatus === "running" ? "pending"
            : docStatus;
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

async function clicksignSearchDoc(
  clicksignUrl: string, apiKey: string, searchTerm: string
): Promise<{ key: string; status: string } | null> {
  try {
    const res = await fetch(
      `${clicksignUrl}/documents?access_token=${apiKey}&q=${encodeURIComponent(searchTerm)}&page=1&page_size=10`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      const docs = data.documents || [];
      // Find document that contains "Planejamento" or "Contrato" in filename
      const match = docs.find((d: any) =>
        d.filename?.toLowerCase().includes("planejamento") ||
        d.filename?.toLowerCase().includes("contrato")
      );
      if (match) {
        return { key: match.key, status: match.status };
      }
      // Fallback: return first doc if any
      if (docs.length === 1) {
        return { key: docs[0].key, status: docs[0].status };
      }
    }
  } catch (e) {
    console.error("ClickSign search error:", e);
  }
  return null;
}
