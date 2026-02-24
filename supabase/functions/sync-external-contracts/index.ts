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

    // Get contracts without vindi/clicksign links
    const { data: contracts, error: fetchErr } = await supabase
      .from("contracts")
      .select("id, contact_id, contract_value, contacts!inner(full_name, email, cpf)")
      .eq("product_id", "4b900185-852d-4f25-8ecc-8d21d7d826d5")
      .eq("status", "active")
      .is("vindi_subscription_id", null);

    if (fetchErr) throw fetchErr;
    if (!contracts?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No unlinked contracts found", total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const contract of contracts) {
      const contact = (contract as any).contacts;
      const email = contact?.email;
      const name = contact?.full_name;
      const result: any = { contract_id: contract.id, name, email, vindi: null, clicksign: null };

      // --- VINDI: search customer by email ---
      if (email) {
        try {
          const searchRes = await fetch(
            `${vindiUrl}/customers?query=email:${encodeURIComponent(email)}`,
            { headers: { Authorization: vindiAuth, "Content-Type": "application/json" } }
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.customers?.length > 0) {
              const customerId = String(searchData.customers[0].id);
              result.vindi_customer_id = customerId;

              // Find active subscriptions for this customer
              const subRes = await fetch(
                `${vindiUrl}/subscriptions?query=customer_id:${customerId} status:active`,
                { headers: { Authorization: vindiAuth, "Content-Type": "application/json" } }
              );
              if (subRes.ok) {
                const subData = await subRes.json();
                if (subData.subscriptions?.length > 0) {
                  result.vindi_subscription_id = String(subData.subscriptions[0].id);
                  result.vindi = "linked";
                } else {
                  result.vindi = "customer_found_no_subscription";
                }
              }
            } else {
              result.vindi = "customer_not_found";
            }
          }
        } catch (e) {
          result.vindi = `error: ${(e as Error).message}`;
        }
      } else {
        result.vindi = "no_email";
      }

      // --- CLICKSIGN: search documents by contact name ---
      try {
        const docSearchRes = await fetch(
          `${clicksignUrl}/documents?access_token=${clicksignApiKey}&q=${encodeURIComponent(name)}`,
          { headers: { "Content-Type": "application/json" } }
        );
        if (docSearchRes.ok) {
          const docData = await docSearchRes.json();
          // Find a matching document (filename contains client name)
          const docs = docData.documents || [];
          const matchingDoc = docs.find((d: any) => 
            d.filename?.toLowerCase().includes(name.toLowerCase().split(" ")[0])
          );
          if (matchingDoc) {
            result.clicksign_document_key = matchingDoc.key;
            result.clicksign_status = matchingDoc.status === "closed" ? "signed" 
              : matchingDoc.status === "running" ? "pending" 
              : matchingDoc.status;
            result.clicksign = "linked";
          } else if (docs.length > 0) {
            result.clicksign = `found_${docs.length}_docs_no_match`;
          } else {
            result.clicksign = "no_documents";
          }
        } else {
          result.clicksign = `search_error_${docSearchRes.status}`;
        }
      } catch (e) {
        result.clicksign = `error: ${(e as Error).message}`;
      }

      // --- Update contract if we found links ---
      const updates: any = {};
      if (result.vindi_customer_id) updates.vindi_customer_id = result.vindi_customer_id;
      if (result.vindi_subscription_id) {
        updates.vindi_subscription_id = result.vindi_subscription_id;
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
        if (updateErr) {
          result.update_error = updateErr.message;
        } else {
          result.updated = true;
        }
      }

      results.push(result);

      // Rate limiting - wait between API calls
      await new Promise((r) => setTimeout(r, 500));
    }

    const vindiLinked = results.filter((r) => r.vindi === "linked").length;
    const clicksignLinked = results.filter((r) => r.clicksign === "linked").length;

    return new Response(
      JSON.stringify({
        success: true,
        total: contracts.length,
        vindi_linked: vindiLinked,
        clicksign_linked: clicksignLinked,
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
