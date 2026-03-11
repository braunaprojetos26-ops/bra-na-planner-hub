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
    const contractIds: string[] = body.contract_ids || []; // Sync specific contracts

    // Pre-load all ClickSign envelopes via v3 API
    let allClicksignEnvelopes: any[] = [];
    if (mode === "all" || mode === "clicksign") {
      allClicksignEnvelopes = await loadAllClicksignEnvelopes(clicksignApiKey);
      console.log(`Loaded ${allClicksignEnvelopes.length} ClickSign envelopes via v3 API`);
    }

    // Build query based on mode
    let query = supabase
      .from("contracts")
      .select("id, contact_id, contract_value, owner_id, product_id, installments, installment_value, contracts_product_id_fkey:products!contracts_product_id_fkey(name), contacts!inner(full_name, email, cpf, phone)");

    if (contractIds.length > 0) {
      // When specific IDs provided, skip status/product filters
      query = query.in("id", contractIds);
    } else {
      query = query
        .eq("product_id", "4b900185-852d-4f25-8ecc-8d21d7d826d5")
        .eq("status", "active");

      if (mode === "vindi") {
        query = query.is("vindi_customer_id", null);
      } else if (mode === "clicksign") {
        query = query.is("clicksign_document_key", null);
      } else {
        query = query.or("vindi_customer_id.is.null,clicksign_document_key.is.null");
      }
    }

    const { data: contracts, error: fetchErr } = contractIds.length > 0
      ? await query.order("id")
      : await query.range(offset, offset + batchSize - 1).order("id");

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

        const matchedCustomerId = await vindiFindBestCustomer(vindiUrl, vindiAuth, {
          email,
          cpf,
          name,
          phone,
        });

        if (matchedCustomerId) {
          vindiCustomerId = matchedCustomerId;
        }

        if (vindiCustomerId) {
          result.vindi_customer_id = vindiCustomerId;

          // Search subscriptions (active first, then any)
          vindiSubscriptionId = await vindiFindSubscription(vindiUrl, vindiAuth, vindiCustomerId);
          if (vindiSubscriptionId) {
            result.vindi_subscription_id = vindiSubscriptionId;
            result.vindi = "linked";

            // Fetch first payment date from bills
            const firstPaymentDate = await vindiFindFirstPayment(vindiUrl, vindiAuth, vindiSubscriptionId);
            if (firstPaymentDate) {
              result.first_payment_at = firstPaymentDate;
            }

            // Resolve real payment status immediately
            const liveStatus = await vindiResolveDbStatus(vindiUrl, vindiAuth, vindiSubscriptionId, null);
            if (liveStatus) {
              result.vindi_payment_status = liveStatus;
            }
          } else {
            // Check for bills
            const billId = await vindiFindBill(vindiUrl, vindiAuth, vindiCustomerId);
            if (billId) {
              result.vindi_bill_id = billId;
              result.vindi = "bill_found";

              const liveStatus = await vindiResolveDbStatus(vindiUrl, vindiAuth, null, billId);
              if (liveStatus) {
                result.vindi_payment_status = liveStatus;
              }
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
          result.clicksign_created_at = matchResult.created;
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
      }
      if (result.first_payment_at) {
        updates.first_payment_at = result.first_payment_at;
      }
      if (result.vindi_bill_id) {
        updates.vindi_bill_id = result.vindi_bill_id;
      }
      if (result.vindi_payment_status) {
        updates.vindi_status = result.vindi_payment_status;
      } else if (result.vindi_subscription_id || result.vindi_bill_id) {
        updates.vindi_status = "active";
      }
      if (result.clicksign_document_key) {
        updates.clicksign_document_key = result.clicksign_document_key;
        updates.clicksign_status = result.clicksign_status || "signed";
        if (result.clicksign_created_at) {
          updates.reported_at = result.clicksign_created_at;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateErr } = await supabase
          .from("contracts")
          .update(updates)
          .eq("id", contract.id);
        result.updated = !updateErr;
        if (updateErr) result.update_error = updateErr.message;
      }

      // ============ AUTO-CREATE CLIENT PLAN ON FIRST PAYMENT ============
      const isPaid = result.vindi_payment_status === "paid" || result.first_payment_at;
      const productName = ((contract as any).contracts_product_id_fkey?.name || "").toLowerCase();
      const isPlanejamento = productName.includes("planejamento");

      if (isPaid && isPlanejamento) {
        // Check if client_plan already exists for this contract or contact
        const { data: existingPlan } = await supabase
          .from("client_plans")
          .select("id")
          .or(`contract_id.eq.${contract.id},contact_id.eq.${contract.contact_id}`)
          .eq("status", "active")
          .maybeSingle();

        if (!existingPlan) {
          const planCreated = await autoCreateClientPlan(
            supabase,
            contract.id,
            contract.contact_id,
            (contract as any).owner_id,
            Number(contract.contract_value),
            result.first_payment_at || new Date().toISOString()
          );
          result.client_plan_created = planCreated;
          console.log(`Auto-created client plan for contract ${contract.id}: ${planCreated}`);
        } else {
          result.client_plan_exists = existingPlan.id;
        }
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

type VindiCustomerLookupInput = {
  email?: string | null;
  cpf?: string | null;
  name?: string | null;
  phone?: string | null;
};

type VindiCustomer = {
  id: string | number;
  name?: string;
  email?: string;
  registry_code?: string;
  phone?: string;
  phone_number?: string;
  phones?: Array<{ number?: string; phone_number?: string }>;
};

function normalizeDigits(value?: string | null): string {
  return (value || "").replace(/\D/g, "");
}

function normalizeEmail(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

function getCustomerPhone(customer: VindiCustomer): string {
  return normalizeDigits(
    customer.phone ||
      customer.phone_number ||
      customer.phones?.[0]?.number ||
      customer.phones?.[0]?.phone_number ||
      ""
  );
}

function isExactCustomerMatch(customer: VindiCustomer, input: Required<VindiCustomerLookupInput>): boolean {
  const customerEmail = normalizeEmail(customer.email);
  const customerCpf = normalizeDigits(customer.registry_code);
  const customerName = normalizeStr(customer.name || "");
  const customerPhone = getCustomerPhone(customer);

  if (input.email && customerEmail === input.email) return true;
  if (input.cpf && customerCpf === input.cpf) return true;
  if (input.name && customerName === normalizeStr(input.name)) return true;
  if (input.phone && customerPhone) {
    const a = customerPhone.slice(-10);
    const b = input.phone.slice(-10);
    if (a && b && (a === b || customerPhone.endsWith(input.phone) || input.phone.endsWith(customerPhone))) {
      return true;
    }
  }

  return false;
}

async function vindiSearchCustomers(
  vindiUrl: string,
  auth: string,
  query: string
): Promise<VindiCustomer[]> {
  try {
    const res = await fetch(
      `${vindiUrl}/customers?query=${encodeURIComponent(query)}&sort_by=created_at&sort_order=desc&per_page=50`,
      { headers: { Authorization: auth, "Content-Type": "application/json" } }
    );

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return (data.customers || []) as VindiCustomer[];
  } catch (e) {
    console.error("Vindi search error:", e);
    return [];
  }
}

async function vindiFindBestCustomer(
  vindiUrl: string,
  auth: string,
  input: VindiCustomerLookupInput
): Promise<string | null> {
  const cleanEmail = normalizeEmail(input.email);
  const cleanCpf = normalizeDigits(input.cpf);
  const cleanName = (input.name || "").trim();
  const cleanPhone = normalizeDigits(input.phone);

  const queries: string[] = [];

  if (cleanEmail) {
    queries.push(`email:${cleanEmail}`, `email:"${cleanEmail}"`, cleanEmail);
  }

  if (cleanCpf.length >= 11) {
    queries.push(`registry_code:${cleanCpf}`, `registry_code:"${cleanCpf}"`, cleanCpf);
  }

  if (cleanName) {
    queries.push(`name:${cleanName}`, `name:"${cleanName}"`, cleanName);
  }

  if (cleanPhone.length >= 10) {
    queries.push(`phone_number:${cleanPhone}`, cleanPhone);
  }

  const uniqueQueries = Array.from(new Set(queries));
  const seenCustomers = new Set<string>();
  let fallbackCustomerId: string | null = null;

  for (const query of uniqueQueries) {
    const customers = await vindiSearchCustomers(vindiUrl, auth, query);

    for (const customer of customers) {
      const customerId = String(customer.id || "");
      if (!customerId || seenCustomers.has(customerId)) continue;
      seenCustomers.add(customerId);

      if (!fallbackCustomerId) {
        fallbackCustomerId = customerId;
      }

      if (
        isExactCustomerMatch(customer, {
          email: cleanEmail,
          cpf: cleanCpf,
          name: cleanName,
          phone: cleanPhone,
        })
      ) {
        return customerId;
      }
    }
  }

  return fallbackCustomerId;
}

async function vindiFindSubscription(
  vindiUrl: string, auth: string, customerId: string
): Promise<string | null> {
  try {
    // Try active subscriptions first, sorted by most recent
    const res = await fetch(
      `${vindiUrl}/subscriptions?query=customer_id:${customerId} status:active&sort_by=created_at&sort_order=desc`,
      { headers: { Authorization: auth, "Content-Type": "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.subscriptions?.length > 0) {
        return String(data.subscriptions[0].id);
      }
    }
    // Try any subscription, most recent first
    const res2 = await fetch(
      `${vindiUrl}/subscriptions?query=customer_id:${customerId}&sort_by=created_at&sort_order=desc`,
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

async function vindiFindFirstPayment(
  vindiUrl: string, auth: string, subscriptionId: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${vindiUrl}/bills?query=subscription_id:${subscriptionId} status:paid&sort_by=created_at&sort_order=asc&per_page=1`,
      { headers: { Authorization: auth, "Content-Type": "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.bills?.length > 0) {
        const bill = data.bills[0];
        const charge = bill.charges?.[0];
        return charge?.paid_at || bill.billing_at || bill.due_at || bill.created_at || null;
      }
    }
  } catch (e) {
    console.error("Vindi first payment search error:", e);
  }
  return null;
}

async function vindiResolveDbStatus(
  vindiUrl: string,
  auth: string,
  subscriptionId: string | null,
  billId: string | null
): Promise<"paid" | "pending" | "overdue" | "cancelled" | null> {
  try {
    if (subscriptionId) {
      const subRes = await fetch(`${vindiUrl}/subscriptions/${subscriptionId}`, {
        headers: { Authorization: auth, "Content-Type": "application/json" },
      });

      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData?.subscription?.status === "canceled") {
          return "cancelled";
        }
      }

      const billsRes = await fetch(
        `${vindiUrl}/bills?query=subscription_id:${subscriptionId}&sort_by=created_at&sort_order=desc&per_page=50`,
        { headers: { Authorization: auth, "Content-Type": "application/json" } }
      );

      if (billsRes.ok) {
        const billsData = await billsRes.json();
        const bills = billsData?.bills || [];

        if (bills.length === 0) return "pending";

        const now = new Date();
        const hasOverdue = bills.some((b: any) => {
          if (b.status !== "pending") return false;
          const due = new Date(b.due_at || b.billing_at || b.created_at);
          return due < now;
        });

        if (hasOverdue) return "overdue";

        const hasPending = bills.some((b: any) => b.status === "pending");
        if (hasPending) return "pending";

        return "paid";
      }
    }

    if (billId) {
      const billRes = await fetch(`${vindiUrl}/bills/${billId}`, {
        headers: { Authorization: auth, "Content-Type": "application/json" },
      });

      if (billRes.ok) {
        const billData = await billRes.json();
        const bill = billData?.bill;
        if (!bill) return null;

        if (bill.status === "paid") return "paid";
        if (bill.status === "canceled") return "cancelled";
        if (bill.status === "pending") {
          const due = new Date(bill.due_at || bill.billing_at || bill.created_at);
          return due < new Date() ? "overdue" : "pending";
        }
      }
    }
  } catch (e) {
    console.error("Vindi status resolve error:", e);
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
    created: attrs.created_at || attrs.created || null,
    modified: attrs.updated_at || attrs.modified || null,
  };
}

// Find matching envelopes for a client name from pre-loaded v3 envelopes
function findClicksignMatch(
  allEnvelopes: any[], clientName: string
): { key: string; status: string; hasDistrato: boolean; created: string | null } | null {
  const normName = normalizeStr(clientName);
  const nameWords = normName.split(/\s+/).filter(w => w.length >= 2);
  
  if (nameWords.length === 0) return null;
  
  const firstName = nameWords[0];
  const lastName = nameWords[nameWords.length - 1];
  
  const matchingEnvelopes = allEnvelopes.filter((e: any) => {
    const normEnvName = normalizeStr(e.name || "");
    if (normEnvName.includes(normName)) return true;
    if (nameWords.length >= 2 && normEnvName.includes(firstName) && normEnvName.includes(lastName)) {
      return true;
    }
    return false;
  });
  
  if (matchingEnvelopes.length === 0) return null;
  
  const distratoEnv = matchingEnvelopes.find((e: any) => 
    normalizeStr(e.name || "").includes("distrato")
  );
  
  const contractEnv = matchingEnvelopes.find((e: any) => {
    const eName = normalizeStr(e.name || "");
    return !eName.includes("distrato") && (
      eName.includes("planejamento") || eName.includes("contrato") || 
      eName.includes("prestacao") || eName.includes("envelope de")
    );
  });
  
  if (contractEnv) {
    return { key: contractEnv.id, status: contractEnv.status, hasDistrato: !!distratoEnv, created: contractEnv.created };
  }
  
  if (distratoEnv) {
    return { key: distratoEnv.id, status: distratoEnv.status, hasDistrato: true, created: distratoEnv.created };
  }
  
  return { key: matchingEnvelopes[0].id, status: matchingEnvelopes[0].status, hasDistrato: false, created: matchingEnvelopes[0].created };
}

// ============ AUTO-CREATE CLIENT PLAN ============
const DEFAULT_MEETING_THEMES = [
  'Gestão de Riscos',
  'Planejamento Macro',
  'Acompanhamento',
  'Independência Financeira',
  'Investimentos',
  'Renovação',
  'Fechamento',
  'Aquisição de Bens',
  'Milhas e Cartão de Crédito',
  'Separação PF e PJ',
  'Prunus',
  'Acompanhamento',
];

async function autoCreateClientPlan(
  supabase: any,
  contractId: string,
  contactId: string,
  ownerId: string,
  contractValue: number,
  firstPaymentDate: string
): Promise<boolean> {
  try {
    const totalMeetings = 12;
    const startDate = new Date(firstPaymentDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 12);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // Create the plan
    const { data: plan, error: planError } = await supabase
      .from("client_plans")
      .insert({
        contact_id: contactId,
        owner_id: ownerId,
        contract_value: contractValue,
        total_meetings: totalMeetings,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        status: "active",
        created_by: ownerId,
        contract_id: contractId,
      })
      .select("id")
      .single();

    if (planError) {
      console.error("Error creating client plan:", planError.message);
      return false;
    }

    // Create meetings - one per month
    const meetings = [];
    for (let i = 0; i < totalMeetings; i++) {
      const meetingDate = new Date(startDate);
      meetingDate.setMonth(meetingDate.getMonth() + i);
      meetings.push({
        plan_id: plan.id,
        meeting_number: i + 1,
        theme: DEFAULT_MEETING_THEMES[i] || "Acompanhamento",
        scheduled_date: formatDate(meetingDate),
      });
    }

    const { error: meetingsError } = await supabase
      .from("client_plan_meetings")
      .insert(meetings);

    if (meetingsError) {
      console.error("Error creating plan meetings:", meetingsError.message);
    }

    // Ensure contact has client_code
    const { data: contact } = await supabase
      .from("contacts")
      .select("client_code")
      .eq("id", contactId)
      .single();

    if (!contact?.client_code) {
      await supabase
        .from("contacts")
        .update({ client_code: `C${Date.now().toString().slice(-6)}` })
        .eq("id", contactId);
    }

    return true;
  } catch (e) {
    console.error("Auto-create client plan error:", e);
    return false;
  }
}
