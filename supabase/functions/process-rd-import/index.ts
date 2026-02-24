import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RD_CRM_BASE_URL = "https://crm.rdstation.com/api/v1";
const RATE_LIMIT_DELAY = 600; // 600ms between calls = ~100 req/min (safe margin under 120/min limit)

function getToken(): string {
  const token = Deno.env.get("RD_CRM_API_TOKEN");
  if (!token) throw new Error("RD_CRM_API_TOKEN not configured");
  return token;
}

function getServiceRoleClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitedFetch(url: string): Promise<Response> {
  await sleep(RATE_LIMIT_DELAY);
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (res.status === 429) {
    console.log(`Rate limited, waiting 10s before retry...`);
    await sleep(10_000);
    return fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  }
  return res;
}

async function updateJob(jobId: string, updates: Record<string, unknown>) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from("import_jobs")
    .update(updates)
    .eq("id", jobId);
  if (error) console.error(`Failed to update job ${jobId}:`, error.message);
}

// Custom field IDs from RD CRM
const CF_IDS = {
  cpf: "63db017f8623e3000bee5ad5",
  rg: "63db01ac19c479000cf0fb85",
  rg_issuer: "63db02f20392d2000ca550db",
  rg_issue_date: "63db01c0fdb6440017de2107",
  birth_date: "63db01cea2e76c001109e659",
  profession: "63db01e1ebbe8a001e73944d",
  marital_status: "63db023aed02ef0017030f24",
  address: "63db024be8396e000fbc4049",
  income: "63db025c0b4a460010e0dd00",
};

function getCustomFieldValue(customFields: Array<Record<string, unknown>>, fieldId: string): string | null {
  const field = customFields?.find((f) => f.custom_field_id === fieldId);
  if (!field || !field.value) return null;
  const val = field.value;
  if (Array.isArray(val)) return val[0] as string || null;
  return String(val).trim() || null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { jobId } = await req.json();
  if (!jobId) {
    return new Response(JSON.stringify({ error: "jobId required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = getServiceRoleClient();
  const TOKEN = getToken();
  const BASE = RD_CRM_BASE_URL;

  // Load job details
  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rdUserId = job.rd_user_id;
  const ownerUserId = job.owner_user_id;
  const createdBy = job.created_by;
  const importType = job.import_type || "contacts";

  try {
    // ===== PHASE 1: Fetch deals =====
    await updateJob(jobId, { status: "fetching_deals" });
    console.log(`[process-rd-import] Job ${jobId}: fetching deals for user ${rdUserId}`);

    const allDeals: Array<Record<string, unknown>> = [];
    let page = 1;

    while (page <= 50) {
      const res = await rateLimitedFetch(
        `${BASE}/deals?token=${TOKEN}&limit=200&page=${page}`
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to fetch deals page ${page}: ${res.status} ${errText}`);
      }
      const data = await res.json();
      const deals = data?.deals || (Array.isArray(data) ? data : []);
      if (deals.length === 0) break;
      allDeals.push(...deals);
      if (deals.length < 200) break;
      page++;
    }

    // Filter by user
    const userDeals = allDeals.filter((d) => {
      const dealUser = d.user as Record<string, unknown> | undefined;
      return (dealUser?._id || dealUser?.id) === rdUserId;
    });

    await updateJob(jobId, { deals_found: userDeals.length });
    console.log(`[process-rd-import] Found ${userDeals.length} deals (of ${allDeals.length} total)`);

    if (importType === "contacts") {
      await processContacts(jobId, userDeals, ownerUserId, createdBy, supabase, TOKEN, BASE);
    } else {
      await processDeals(jobId, userDeals, ownerUserId, createdBy, supabase);
    }
  } catch (err) {
    console.error(`[process-rd-import] Job ${jobId} error:`, (err as Error).message);
    await updateJob(jobId, {
      status: "error",
      error_message: (err as Error).message,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function processContacts(
  jobId: string,
  userDeals: Array<Record<string, unknown>>,
  ownerUserId: string | null,
  createdBy: string,
  supabase: ReturnType<typeof getServiceRoleClient>,
  TOKEN: string,
  BASE: string
) {
  // ===== PHASE 2: Fetch contacts from deals (sequential, respecting rate limit) =====
  await updateJob(jobId, { status: "fetching_contacts" });

  const contactMap = new Map<string, Record<string, unknown>>();

  for (const deal of userDeals) {
    const dealId = (deal._id || deal.id) as string;
    if (!dealId) continue;

    const res = await rateLimitedFetch(`${BASE}/deals/${dealId}/contacts?token=${TOKEN}`);
    if (!res.ok) {
      console.warn(`Failed to get contacts for deal ${dealId}: ${res.status}`);
      continue;
    }
    const data = await res.json();
    const contacts = data?.contacts || (Array.isArray(data) ? data : []);
    for (const c of contacts as Array<Record<string, unknown>>) {
      const cId = (c._id || c.id) as string;
      if (cId && !contactMap.has(cId)) {
        contactMap.set(cId, c);
      }
    }
  }

  const uniqueContacts = [...contactMap.values()];
  await updateJob(jobId, { contacts_found: uniqueContacts.length });
  console.log(`[process-rd-import] Found ${uniqueContacts.length} unique contacts`);

  // ===== PHASE 3: Fetch full contact details (sequential, 600ms delay) =====
  const fullContacts: Array<Record<string, unknown>> = [];

  for (const contact of uniqueContacts) {
    const cId = (contact._id || contact.id) as string;
    // Check if already has custom fields
    const existingCf = contact.contact_custom_fields as unknown[] | undefined;
    if (existingCf && existingCf.length > 0) {
      fullContacts.push(contact);
      continue;
    }
    // Fetch full data
    try {
      const res = await rateLimitedFetch(`${BASE}/contacts/${cId}?token=${TOKEN}`);
      if (res.ok) {
        const full = await res.json();
        fullContacts.push(full as Record<string, unknown>);
      } else {
        fullContacts.push(contact); // Use partial data
      }
    } catch {
      fullContacts.push(contact);
    }
  }

  // ===== PHASE 4: Import into local DB =====
  await updateJob(jobId, { status: "importing" });

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: Array<{ name: string; error: string }> = [];

  for (const rdContact of fullContacts) {
    try {
      const name = ((rdContact.name as string) || "").trim();
      const email = (rdContact.emails as Array<{ email: string }>)?.[0]?.email || null;
      const phone = (rdContact.phones as Array<{ phone: string }>)?.[0]?.phone || "";
      const customFields = (rdContact.contact_custom_fields || []) as Array<Record<string, unknown>>;

      if (!name && !phone) {
        skipped++;
        continue;
      }

      const normalizedPhone = phone.replace(/\D/g, "");

      // Check duplicates by phone
      if (normalizedPhone) {
        const { data: existing } = await supabase
          .from("contacts")
          .select("id")
          .or(`phone.eq.${normalizedPhone},phone.eq.${phone}`)
          .limit(1);
        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }
      }

      // Check duplicates by email
      if (email) {
        const { data: existingByEmail } = await supabase
          .from("contacts")
          .select("id")
          .eq("email", email)
          .limit(1);
        if (existingByEmail && existingByEmail.length > 0) {
          skipped++;
          continue;
        }
      }

      // Extract custom fields
      const cpf = getCustomFieldValue(customFields, CF_IDS.cpf);
      const rg = getCustomFieldValue(customFields, CF_IDS.rg);
      const rgIssuer = getCustomFieldValue(customFields, CF_IDS.rg_issuer);
      const rgIssueDate = getCustomFieldValue(customFields, CF_IDS.rg_issue_date);
      const birthDateCf = getCustomFieldValue(customFields, CF_IDS.birth_date);
      const professionCf = getCustomFieldValue(customFields, CF_IDS.profession);
      const maritalStatusCf = getCustomFieldValue(customFields, CF_IDS.marital_status);
      const addressCf = getCustomFieldValue(customFields, CF_IDS.address);
      const incomeCf = getCustomFieldValue(customFields, CF_IDS.income);

      // Parse birth date
      let birthDate: string | null = null;
      const rawBirthDate = birthDateCf || (rdContact.birthday as string) || null;
      if (rawBirthDate) {
        if (rawBirthDate.includes("/")) {
          const parts = rawBirthDate.split("/");
          if (parts.length === 3) {
            birthDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        } else {
          birthDate = rawBirthDate.substring(0, 10);
        }
      }

      // Parse RG issue date
      let parsedRgIssueDate: string | null = null;
      if (rgIssueDate) {
        if (rgIssueDate.includes("/")) {
          const parts = rgIssueDate.split("/");
          if (parts.length === 3) {
            parsedRgIssueDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        } else {
          parsedRgIssueDate = rgIssueDate.substring(0, 10);
        }
      }

      // Parse income
      let income: number | null = null;
      if (incomeCf) {
        const cleaned = incomeCf.replace(/[^\d.,]/g, "").replace(",", ".");
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) income = parsed;
      }

      // Map marital status
      let maritalStatus: string | null = null;
      if (maritalStatusCf) {
        const lower = maritalStatusCf.toLowerCase();
        if (lower.includes("casado")) maritalStatus = "casado";
        else if (lower.includes("solteiro")) maritalStatus = "solteiro";
        else if (lower.includes("divorciado")) maritalStatus = "divorciado";
        else if (lower.includes("separado")) maritalStatus = "separado";
        else if (lower.includes("viúvo") || lower.includes("viuvo")) maritalStatus = "viuvo";
        else if (lower.includes("união") || lower.includes("uniao")) maritalStatus = "uniao_estavel";
        else maritalStatus = maritalStatusCf;
      }

      const profession = professionCf || (rdContact.title as string) || null;
      const rdId = (rdContact._id || rdContact.id || "") as string;
      const noteParts: string[] = [`RD CRM ID: ${rdId}`];
      if (rdContact.title && !professionCf) {
        noteParts.push(`Cargo RD: ${rdContact.title}`);
      }

      const { error: insertError } = await supabase
        .from("contacts")
        .insert({
          full_name: name || "Sem nome",
          phone: normalizedPhone || "0000000000",
          email: email,
          cpf: cpf,
          rg: rg,
          rg_issuer: rgIssuer,
          rg_issue_date: parsedRgIssueDate,
          birth_date: birthDate,
          profession: profession,
          marital_status: maritalStatus,
          address: addressCf,
          income: income,
          source: "rd_crm",
          source_detail: `RD CRM ID: ${rdId}`,
          notes: noteParts.join(" | "),
          created_by: createdBy,
          owner_id: ownerUserId || null,
        });

      if (insertError) {
        errors++;
        errorDetails.push({ name, error: insertError.message });
      } else {
        imported++;
      }
    } catch (e) {
      errors++;
      errorDetails.push({
        name: (rdContact.name as string) || "unknown",
        error: (e as Error).message,
      });
    }

    // Update progress periodically
    if ((imported + skipped + errors) % 5 === 0) {
      await updateJob(jobId, {
        contacts_imported: imported,
        contacts_skipped: skipped,
        contacts_errors: errors,
      });
    }
  }

  await updateJob(jobId, {
    status: "done",
    contacts_imported: imported,
    contacts_skipped: skipped,
    contacts_errors: errors,
    error_details: errorDetails.slice(0, 20),
  });

  console.log(`[process-rd-import] Job ${jobId} done: ${imported} imported, ${skipped} skipped, ${errors} errors`);
}

async function processDeals(
  jobId: string,
  deals: Array<Record<string, unknown>>,
  ownerUserId: string | null,
  createdBy: string,
  supabase: ReturnType<typeof getServiceRoleClient>
) {
  await updateJob(jobId, { status: "importing" });

  const { data: localFunnels } = await supabase
    .from("funnels")
    .select("id, name")
    .eq("is_active", true)
    .order("order_position");

  const { data: localStages } = await supabase
    .from("funnel_stages")
    .select("id, name, funnel_id, order_position")
    .order("order_position");

  if (!localFunnels?.length || !localStages?.length) {
    throw new Error("Nenhum funil ou etapa cadastrado no sistema.");
  }

  const defaultFunnel = localFunnels[0];
  const defaultStage = localStages.find((s) => s.funnel_id === defaultFunnel.id) || localStages[0];

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: Array<{ name: string; error: string }> = [];

  for (const deal of deals) {
    try {
      const dealName = (deal.name as string) || "";
      const dealValue = Number(deal.amount_total || deal.amount || 0);
      const rdContactIds = deal.contacts as Array<Record<string, unknown>> || [];

      let localContactId: string | null = null;

      if (rdContactIds.length > 0) {
        const rdContact = rdContactIds[0];
        const contactPhone = ((rdContact.phones as Array<{ phone: string }>)?.[0]?.phone || "").replace(/\D/g, "");
        const contactEmail = (rdContact.emails as Array<{ email: string }>)?.[0]?.email || null;
        const contactName = (rdContact.name as string) || "";

        if (contactPhone) {
          const { data: found } = await supabase
            .from("contacts")
            .select("id")
            .or(`phone.eq.${contactPhone}`)
            .limit(1);
          if (found?.length) localContactId = found[0].id;
        }

        if (!localContactId && contactEmail) {
          const { data: found } = await supabase
            .from("contacts")
            .select("id")
            .eq("email", contactEmail)
            .limit(1);
          if (found?.length) localContactId = found[0].id;
        }

        if (!localContactId && contactName) {
          const { data: found } = await supabase
            .from("contacts")
            .select("id")
            .ilike("full_name", contactName)
            .limit(1);
          if (found?.length) localContactId = found[0].id;
        }
      }

      if (!localContactId) {
        skipped++;
        continue;
      }

      const rdDealId = (deal._id || deal.id || "") as string;
      if (rdDealId) {
        const { data: existingOpp } = await supabase
          .from("opportunities")
          .select("id")
          .eq("contact_id", localContactId)
          .ilike("notes", `%RD CRM Deal: ${rdDealId}%`)
          .limit(1);

        if (existingOpp?.length) {
          skipped++;
          continue;
        }
      }

      const rdStatus = (deal.win as string);
      let oppStatus: string = "active";
      if (rdStatus === "won") oppStatus = "converted";
      else if (rdStatus === "lost") oppStatus = "lost";

      const { error: insertError } = await supabase
        .from("opportunities")
        .insert({
          contact_id: localContactId,
          current_funnel_id: defaultFunnel.id,
          current_stage_id: defaultStage.id,
          proposal_value: dealValue || null,
          notes: `RD CRM Deal: ${rdDealId} | ${dealName}`,
          status: oppStatus,
          created_by: ownerUserId || createdBy,
        });

      if (insertError) {
        errors++;
        errorDetails.push({ name: dealName, error: insertError.message });
      } else {
        imported++;
      }
    } catch (e) {
      errors++;
      errorDetails.push({
        name: (deal.name as string) || "unknown",
        error: (e as Error).message,
      });
    }

    if ((imported + skipped + errors) % 5 === 0) {
      await updateJob(jobId, {
        contacts_imported: imported,
        contacts_skipped: skipped,
        contacts_errors: errors,
      });
    }
  }

  await updateJob(jobId, {
    status: "done",
    contacts_imported: imported,
    contacts_skipped: skipped,
    contacts_errors: errors,
    error_details: errorDetails.slice(0, 20),
  });
}
