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

    const { funnel_id, stage_id } = await req.json();
    if (!funnel_id || !stage_id) {
      return new Response(
        JSON.stringify({ success: false, error: "funnel_id and stage_id required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const PRODUCT_ID = "4b900185-852d-4f25-8ecc-8d21d7d826d5"; // Planejamento Financeiro Completo

    // Fetch active opportunities in the given funnel/stage
    const { data: opportunities, error: fetchError } = await supabase
      .from("opportunities")
      .select("id, contact_id, created_by, proposal_value")
      .eq("current_funnel_id", funnel_id)
      .eq("current_stage_id", stage_id)
      .eq("status", "active");

    if (fetchError) throw fetchError;
    if (!opportunities?.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No active opportunities found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { id: string; contact: string; value: number; status: string; error?: string }[] = [];
    const now = new Date().toISOString();

    for (const opp of opportunities) {
      try {
        const contractValue = opp.proposal_value || 0;
        const calculatedPBs = contractValue / 100;

        // 1. Create contract
        const { error: contractError } = await supabase
          .from("contracts")
          .insert({
            contact_id: opp.contact_id,
            opportunity_id: opp.id,
            product_id: PRODUCT_ID,
            owner_id: opp.created_by,
            contract_value: contractValue,
            calculated_pbs: calculatedPBs,
            payment_type: "mensal",
            status: "active",
            custom_data: {},
          });

        if (contractError) throw contractError;

        // 2. Mark opportunity as won
        const { error: updateError } = await supabase
          .from("opportunities")
          .update({ status: "won", converted_at: now })
          .eq("id", opp.id);

        if (updateError) throw updateError;

        // 3. Record history
        const { error: historyError } = await supabase
          .from("opportunity_history")
          .insert({
            opportunity_id: opp.id,
            action: "won",
            to_stage_id: stage_id,
            changed_by: opp.created_by,
            notes: "Marcado como venda em lote (bulk-mark-won)",
          });

        if (historyError) console.error("History error:", historyError);

        results.push({ id: opp.id, contact: opp.contact_id, value: contractValue, status: "ok" });
      } catch (e) {
        results.push({ id: opp.id, contact: opp.contact_id, value: opp.proposal_value, status: "error", error: (e as Error).message });
      }
    }

    const successCount = results.filter((r) => r.status === "ok").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return new Response(
      JSON.stringify({ success: true, total: opportunities.length, processed: successCount, errors: errorCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
