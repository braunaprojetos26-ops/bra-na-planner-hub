import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Returns payment status for contracts with Vindi subscriptions
// Status: "em_dia" | "atrasado" | "aguardando" | "cancelado"
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

    const body = await req.json().catch(() => ({}));
    const contractIds: string[] = body.contract_ids || [];

    if (!contractIds.length) {
      return new Response(
        JSON.stringify({ success: true, statuses: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch contracts with vindi subscription IDs
    const { data: contracts, error } = await supabase
      .from("contracts")
      .select("id, vindi_subscription_id, vindi_bill_id")
      .in("id", contractIds)
      .or("vindi_subscription_id.not.is.null,vindi_bill_id.not.is.null");

    if (error) throw error;

    const statuses: Record<string, { status: string; details?: string }> = {};

    // Process in parallel batches of 5
    const batchSize = 5;
    for (let i = 0; i < (contracts || []).length; i += batchSize) {
      const batch = contracts!.slice(i, i + batchSize);
      
      const results = await Promise.all(
        batch.map(async (contract) => {
          try {
            const result = await getContractPaymentStatus(
              vindiUrl, vindiAuth, contract.vindi_subscription_id, contract.vindi_bill_id
            );
            return { id: contract.id, ...result };
          } catch (e) {
            console.error(`Error checking contract ${contract.id}:`, e);
            return { id: contract.id, status: "unknown", details: "Erro ao consultar" };
          }
        })
      );

      for (const r of results) {
        statuses[r.id] = { status: r.status, details: r.details };
      }
    }

    // Update vindi_status in DB for contracts that changed
    for (const [contractId, statusInfo] of Object.entries(statuses)) {
      const dbStatus = statusInfo.status === "em_dia" ? "paid" 
        : statusInfo.status === "atrasado" ? "overdue"
        : statusInfo.status === "aguardando" ? "pending"
        : statusInfo.status === "cancelado" ? "cancelled"
        : "active";

      await supabase
        .from("contracts")
        .update({ vindi_status: dbStatus })
        .eq("id", contractId);
    }

    return new Response(
      JSON.stringify({ success: true, statuses }),
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

async function getContractPaymentStatus(
  vindiUrl: string,
  auth: string,
  subscriptionId: string | null,
  billId: string | null,
): Promise<{ status: string; details?: string }> {
  // Check subscription status first
  if (subscriptionId) {
    // Get subscription details
    const subRes = await fetch(`${vindiUrl}/subscriptions/${subscriptionId}`, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
    });

    if (subRes.ok) {
      const subData = await subRes.json();
      const sub = subData.subscription;

      if (sub.status === "canceled") {
        return { status: "cancelado", details: "Assinatura cancelada" };
      }
    }

    // Get bills for the subscription
    const billsRes = await fetch(
      `${vindiUrl}/bills?query=subscription_id:${subscriptionId}&sort_by=created_at&sort_order=desc&per_page=50`,
      { headers: { Authorization: auth, "Content-Type": "application/json" } }
    );

    if (billsRes.ok) {
      const billsData = await billsRes.json();
      const bills = billsData.bills || [];

      if (bills.length === 0) {
        return { status: "aguardando", details: "Sem faturas geradas" };
      }

      // Check for overdue bills
      const now = new Date();
      const overdueBills = bills.filter((b: any) => {
        if (b.status === "pending") {
          const dueDate = new Date(b.due_at);
          return dueDate < now;
        }
        return false;
      });

      if (overdueBills.length > 0) {
        const oldestOverdue = overdueBills[overdueBills.length - 1];
        const daysLate = Math.floor((now.getTime() - new Date(oldestOverdue.due_at).getTime()) / (1000 * 60 * 60 * 24));
        return { 
          status: "atrasado", 
          details: `${overdueBills.length} fatura(s) atrasada(s) - ${daysLate} dias` 
        };
      }

      // Check if there are pending bills not yet due
      const pendingBills = bills.filter((b: any) => b.status === "pending");
      if (pendingBills.length > 0) {
        return { status: "aguardando", details: "Aguardando pagamento" };
      }

      // All bills paid
      return { status: "em_dia", details: "Pagamento em dia" };
    }
  }

  // Fallback: single bill check
  if (billId) {
    const billRes = await fetch(`${vindiUrl}/bills/${billId}`, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
    });

    if (billRes.ok) {
      const billData = await billRes.json();
      const bill = billData.bill;

      if (bill.status === "paid") {
        return { status: "em_dia", details: "Pagamento em dia" };
      }
      if (bill.status === "pending") {
        const dueDate = new Date(bill.due_at);
        if (dueDate < new Date()) {
          const daysLate = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          return { status: "atrasado", details: `Atrasado há ${daysLate} dias` };
        }
        return { status: "aguardando", details: "Aguardando pagamento" };
      }
      if (bill.status === "canceled") {
        return { status: "cancelado", details: "Fatura cancelada" };
      }
    }
  }

  return { status: "unknown", details: "Sem informação" };
}
