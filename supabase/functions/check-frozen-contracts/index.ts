import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Checks active contracts with Vindi subscriptions for 3+ overdue bills
// and freezes them automatically. Also unfreezes if overdue count drops below 3.
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
    const vindiUrl = "https://app.vindi.com.br/api/v1";
    const vindiAuth = "Basic " + btoa(vindiApiKey + ":");

    // Fetch all active and frozen contracts with Vindi subscriptions
    const { data: contracts, error } = await supabase
      .from("contracts")
      .select("id, vindi_subscription_id, status, owner_id, contact_id, contract_value")
      .in("status", ["active", "frozen"])
      .not("vindi_subscription_id", "is", null);

    if (error) throw error;
    if (!contracts?.length) {
      return new Response(
        JSON.stringify({ success: true, frozen: 0, unfrozen: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const frozenIds: string[] = [];
    const unfrozenIds: string[] = [];

    // Process in batches of 5
    const batchSize = 5;
    for (let i = 0; i < contracts.length; i += batchSize) {
      const batch = contracts.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (contract) => {
          try {
            const overdueCount = await getOverdueBillsCount(
              vindiUrl,
              vindiAuth,
              contract.vindi_subscription_id!
            );
            return { contract, overdueCount };
          } catch (e) {
            console.error(`Error checking contract ${contract.id}:`, e);
            return { contract, overdueCount: -1 }; // skip on error
          }
        })
      );

      for (const { contract, overdueCount } of results) {
        if (overdueCount < 0) continue; // error, skip

        if (overdueCount >= 3 && contract.status === "active") {
          // Freeze this contract
          const { error: updateErr } = await supabase
            .from("contracts")
            .update({ status: "frozen" })
            .eq("id", contract.id);

          if (!updateErr) {
            frozenIds.push(contract.id);
            console.log(
              `Frozen contract ${contract.id} (${overdueCount} overdue bills)`
            );

            // Notify the owner
            await supabase.from("notifications").insert({
              user_id: contract.owner_id,
              title: "Contrato congelado",
              message: `Um contrato foi congelado automaticamente por ter ${overdueCount} parcelas atrasadas.`,
              type: "contract_frozen",
              link: `/contracts`,
            });
          }
        } else if (overdueCount < 3 && contract.status === "frozen") {
          // Unfreeze - overdue count dropped below threshold
          const { error: updateErr } = await supabase
            .from("contracts")
            .update({ status: "active" })
            .eq("id", contract.id);

          if (!updateErr) {
            unfrozenIds.push(contract.id);
            console.log(
              `Unfrozen contract ${contract.id} (${overdueCount} overdue bills)`
            );

            await supabase.from("notifications").insert({
              user_id: contract.owner_id,
              title: "Contrato descongelado",
              message: `Um contrato foi descongelado automaticamente após regularização de parcelas.`,
              type: "contract_unfrozen",
              link: `/contracts`,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        frozen: frozenIds.length,
        unfrozen: unfrozenIds.length,
        frozenIds,
        unfrozenIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in check-frozen-contracts:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getOverdueBillsCount(
  vindiUrl: string,
  vindiAuth: string,
  subscriptionId: string
): Promise<number> {
  const now = new Date().toISOString().split("T")[0];

  // Fetch pending bills for this subscription that are past due
  const url = `${vindiUrl}/bills?query=subscription_id:${subscriptionId} status:pending&sort_by=due_at&sort_order=asc&per_page=50`;

  const response = await fetch(url, {
    headers: {
      Authorization: vindiAuth,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Vindi API error: ${response.status}`);
  }

  const data = await response.json();
  const bills = data.bills || [];

  // Count bills where due_at < today
  let overdueCount = 0;
  for (const bill of bills) {
    const dueDate = bill.due_at?.split("T")[0];
    if (dueDate && dueDate < now) {
      overdueCount++;
    }
  }

  return overdueCount;
}
