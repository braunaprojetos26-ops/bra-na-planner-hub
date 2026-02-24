import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RD_CRM_BASE_URL = "https://crm.rdstation.com/api/v1";
const RATE_LIMIT_DELAY = 600;
const MAX_EXECUTION_MS = 120_000; // 120s safety margin (timeout is 150s)

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

function isNearTimeout(startTime: number): boolean {
  return Date.now() - startTime > MAX_EXECUTION_MS;
}

async function reinvokeSelf(jobId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  console.log(`[process-rd-import] Re-invoking self for job ${jobId}`);
  fetch(`${supabaseUrl}/functions/v1/process-rd-import`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobId }),
  }).catch((err) => {
    console.error("Failed to re-invoke self:", err);
  });
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

interface CheckpointData {
  phase: "fetching_deals" | "fetching_contacts" | "fetching_details" | "importing";
  // For fetching_deals: page we left off at + accumulated deals
  deals_page?: number;
  all_deals?: Array<Record<string, unknown>>;
  user_deals?: Array<Record<string, unknown>>;
  // For fetching_contacts: index of deal we're processing
  deal_index?: number;
  contact_map?: Record<string, Record<string, unknown>>;
  // For fetching_details: index of contact we're fetching
  contact_index?: number;
  unique_contacts?: Array<Record<string, unknown>>;
  full_contacts?: Array<Record<string, unknown>>;
  // For importing: index of contact being imported
  import_index?: number;
  imported?: number;
  skipped?: number;
  errors?: number;
  error_details?: Array<{ name: string; error: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
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
  let checkpoint: CheckpointData = (job.checkpoint_data as CheckpointData) || { phase: "fetching_deals" };

  try {
    // ===== PHASE 1: Fetch deals =====
    if (checkpoint.phase === "fetching_deals") {
      await updateJob(jobId, { status: "fetching_deals" });
      console.log(`[process-rd-import] Job ${jobId}: fetching deals for user ${rdUserId}`);

      const allDeals: Array<Record<string, unknown>> = checkpoint.all_deals || [];
      let page = checkpoint.deals_page || 1;

      while (page <= 50) {
        if (isNearTimeout(startTime)) {
          // Save checkpoint and re-invoke
          checkpoint = { phase: "fetching_deals", deals_page: page, all_deals: allDeals };
          await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
          await reinvokeSelf(jobId);
          return new Response(JSON.stringify({ ok: true, checkpoint: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const res = await rateLimitedFetch(`${BASE}/deals?token=${TOKEN}&limit=200&page=${page}`);
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

      // Advance to next phase
      checkpoint = {
        phase: "fetching_contacts",
        user_deals: userDeals,
        deal_index: 0,
        contact_map: {},
      };
      await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
    }

    // ===== PHASE 2: Fetch contacts from deals =====
    if (checkpoint.phase === "fetching_contacts" && importType === "contacts") {
      await updateJob(jobId, { status: "fetching_contacts" });
      const userDeals = checkpoint.user_deals || [];
      const contactMap: Record<string, Record<string, unknown>> = checkpoint.contact_map || {};
      let dealIndex = checkpoint.deal_index || 0;

      while (dealIndex < userDeals.length) {
        if (isNearTimeout(startTime)) {
          checkpoint = { phase: "fetching_contacts", user_deals: userDeals, deal_index: dealIndex, contact_map: contactMap };
          await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
          await reinvokeSelf(jobId);
          return new Response(JSON.stringify({ ok: true, checkpoint: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const deal = userDeals[dealIndex];
        const dealId = (deal._id || deal.id) as string;
        if (dealId) {
          const res = await rateLimitedFetch(`${BASE}/deals/${dealId}/contacts?token=${TOKEN}`);
          if (res.ok) {
            const data = await res.json();
            const contacts = data?.contacts || (Array.isArray(data) ? data : []);
            for (const c of contacts as Array<Record<string, unknown>>) {
              const cId = (c._id || c.id) as string;
              if (cId && !contactMap[cId]) {
                contactMap[cId] = c;
              }
            }
          }
        }
        dealIndex++;
      }

      const uniqueContacts = Object.values(contactMap);
      await updateJob(jobId, { contacts_found: uniqueContacts.length });
      console.log(`[process-rd-import] Found ${uniqueContacts.length} unique contacts`);

      checkpoint = {
        phase: "fetching_details",
        unique_contacts: uniqueContacts,
        contact_index: 0,
        full_contacts: [],
      };
      await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
    }

    // ===== PHASE 3: Fetch full contact details =====
    if (checkpoint.phase === "fetching_details" && importType === "contacts") {
      const uniqueContacts = checkpoint.unique_contacts || [];
      const fullContacts: Array<Record<string, unknown>> = checkpoint.full_contacts || [];
      let contactIndex = checkpoint.contact_index || 0;

      while (contactIndex < uniqueContacts.length) {
        if (isNearTimeout(startTime)) {
          checkpoint = { phase: "fetching_details", unique_contacts: uniqueContacts, contact_index: contactIndex, full_contacts: fullContacts };
          await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
          await reinvokeSelf(jobId);
          return new Response(JSON.stringify({ ok: true, checkpoint: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const contact = uniqueContacts[contactIndex];
        const cId = (contact._id || contact.id) as string;
        const existingCf = contact.contact_custom_fields as unknown[] | undefined;

        if (existingCf && existingCf.length > 0) {
          fullContacts.push(contact);
        } else {
          try {
            const res = await rateLimitedFetch(`${BASE}/contacts/${cId}?token=${TOKEN}`);
            if (res.ok) {
              fullContacts.push(await res.json() as Record<string, unknown>);
            } else {
              fullContacts.push(contact);
            }
          } catch {
            fullContacts.push(contact);
          }
        }
        contactIndex++;
      }

      checkpoint = {
        phase: "importing",
        full_contacts: fullContacts,
        import_index: 0,
        imported: 0,
        skipped: 0,
        errors: 0,
        error_details: [],
      };
      await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
    }

    // ===== PHASE 4: Import into local DB =====
    if (checkpoint.phase === "importing" && importType === "contacts") {
      await updateJob(jobId, { status: "importing" });
      const fullContacts = checkpoint.full_contacts || [];
      let importIndex = checkpoint.import_index || 0;
      let imported = checkpoint.imported || 0;
      let skipped = checkpoint.skipped || 0;
      let errors = checkpoint.errors || 0;
      const errorDetails: Array<{ name: string; error: string }> = checkpoint.error_details || [];

      while (importIndex < fullContacts.length) {
        if (isNearTimeout(startTime)) {
          checkpoint = { phase: "importing", full_contacts: fullContacts, import_index: importIndex, imported, skipped, errors, error_details: errorDetails };
          await updateJob(jobId, {
            checkpoint_data: checkpoint as unknown as Record<string, unknown>,
            contacts_imported: imported,
            contacts_skipped: skipped,
            contacts_errors: errors,
          });
          await reinvokeSelf(jobId);
          return new Response(JSON.stringify({ ok: true, checkpoint: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const rdContact = fullContacts[importIndex];
        try {
          const name = ((rdContact.name as string) || "").trim();
          const email = (rdContact.emails as Array<{ email: string }>)?.[0]?.email || null;
          const phone = (rdContact.phones as Array<{ phone: string }>)?.[0]?.phone || "";
          const customFields = (rdContact.contact_custom_fields || []) as Array<Record<string, unknown>>;

          if (!name && !phone) {
            skipped++;
            importIndex++;
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
              importIndex++;
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
              importIndex++;
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

          let income: number | null = null;
          if (incomeCf) {
            const cleaned = incomeCf.replace(/[^\d.,]/g, "").replace(",", ".");
            const parsed = parseFloat(cleaned);
            if (!isNaN(parsed)) income = parsed;
          }

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
              email,
              cpf,
              rg,
              rg_issuer: rgIssuer,
              rg_issue_date: parsedRgIssueDate,
              birth_date: birthDate,
              profession,
              marital_status: maritalStatus,
              address: addressCf,
              income,
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

        importIndex++;

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
        checkpoint_data: null,
      });

      console.log(`[process-rd-import] Job ${jobId} done: ${imported} imported, ${skipped} skipped, ${errors} errors`);
    }

    // ===== DEALS IMPORT (no checkpoint needed, simpler) =====
    if (importType === "deals" && checkpoint.phase !== "importing") {
      const userDeals = checkpoint.user_deals || [];
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
          created_by: createdBy,
          status: oppStatus,
          proposal_value: dealValue || null,
          notes: `RD CRM Deal: ${rdDealId} | ${dealName}`,
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
  }

  await updateJob(jobId, {
    status: "done",
    contacts_imported: imported,
    contacts_skipped: skipped,
    contacts_errors: errors,
    error_details: errorDetails.slice(0, 20),
    checkpoint_data: null,
  });

  console.log(`[process-rd-import] Job ${jobId} deals done: ${imported} imported, ${skipped} skipped, ${errors} errors`);
}
