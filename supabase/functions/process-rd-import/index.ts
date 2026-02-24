import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RD_CRM_BASE_URL = "https://crm.rdstation.com/api/v1";
const RATE_LIMIT_DELAY = 600;
const MAX_EXECUTION_MS = 120_000; // 120s safety margin

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
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/process-rd-import`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId }),
    });
    console.log(`[process-rd-import] Re-invoke response: ${res.status}`);
  } catch (err) {
    console.error("Failed to re-invoke self:", err);
  }
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

// LIGHTWEIGHT checkpoint - only stores IDs and indexes, NEVER full objects
interface CheckpointData {
  phase: "fetching_deals" | "fetching_contacts" | "fetching_details" | "importing" | "importing_deals";
  deals_page?: number;
  // Store only deal IDs, not full objects
  user_deal_ids?: string[];
  deal_index?: number;
  // Store only contact IDs found so far
  contact_ids?: string[];
  contact_index?: number;
  // Import progress
  import_index?: number;
  imported?: number;
  skipped?: number;
  errors?: number;
  error_details?: Array<{ name: string; error: string }>;
  contacts_found?: number;
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
    .maybeSingle();

  if (jobError || !job) {
    console.error(`[process-rd-import] Job ${jobId} not found`);
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If already done or errored, skip
  if (job.status === "done" || job.status === "error") {
    return new Response(JSON.stringify({ ok: true, already_done: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rdUserId = job.rd_user_id;
  const ownerUserId = job.owner_user_id;
  const createdBy = job.created_by;
  const importType = job.import_type || "contacts";
  let checkpoint: CheckpointData = (job.checkpoint_data as CheckpointData) || { phase: "fetching_deals" };

  try {
    // ===== PHASE 1: Fetch deals and get IDs =====
    if (checkpoint.phase === "fetching_deals") {
      await updateJob(jobId, { status: "fetching_deals" });
      console.log(`[process-rd-import] Job ${jobId}: fetching deals for user ${rdUserId}`);

      let page = checkpoint.deals_page || 1;
      const userDealIds: string[] = [];

      while (page <= 50) {
        if (isNearTimeout(startTime)) {
          checkpoint = { phase: "fetching_deals", deals_page: page, user_deal_ids: userDealIds };
          await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
          await reinvokeSelf(jobId);
          return new Response(JSON.stringify({ ok: true, checkpoint: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const res = await rateLimitedFetch(`${BASE}/deals?token=${TOKEN}&limit=200&page=${page}&user_id=${rdUserId}`);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Failed to fetch deals page ${page}: ${res.status} ${errText}`);
        }
        const data = await res.json();
        const deals = data?.deals || (Array.isArray(data) ? data : []);
        if (deals.length === 0) break;

        // All deals are already filtered by user_id, store ONLY IDs
        for (const d of deals) {
          const dealId = (d._id || d.id) as string;
          if (dealId) userDealIds.push(dealId);
        }

        if (deals.length < 200) break;
        page++;
      }

      await updateJob(jobId, { deals_found: userDealIds.length });
      console.log(`[process-rd-import] Found ${userDealIds.length} user deals`);

      checkpoint = {
        phase: "fetching_contacts",
        user_deal_ids: userDealIds,
        deal_index: 0,
        contact_ids: [],
      };
      await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
    }

    // ===== PHASE 2: Fetch contact IDs from deals =====
    if (checkpoint.phase === "fetching_contacts" && importType === "contacts") {
      await updateJob(jobId, { status: "fetching_contacts" });
      const dealIds = checkpoint.user_deal_ids || [];
      const contactIds: string[] = [...(checkpoint.contact_ids || [])];
      const contactIdSet = new Set(contactIds);
      let dealIndex = checkpoint.deal_index || 0;

      while (dealIndex < dealIds.length) {
        if (isNearTimeout(startTime)) {
          checkpoint = { phase: "fetching_contacts", user_deal_ids: dealIds, deal_index: dealIndex, contact_ids: [...contactIdSet] };
          await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
          await reinvokeSelf(jobId);
          return new Response(JSON.stringify({ ok: true, checkpoint: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const dealId = dealIds[dealIndex];
        const res = await rateLimitedFetch(`${BASE}/deals/${dealId}/contacts?token=${TOKEN}`);
        if (res.ok) {
          const data = await res.json();
          const contacts = data?.contacts || (Array.isArray(data) ? data : []);
          for (const c of contacts as Array<Record<string, unknown>>) {
            const cId = (c._id || c.id) as string;
            if (cId) contactIdSet.add(cId);
          }
        }
        dealIndex++;
      }

      const uniqueContactIds = [...contactIdSet];
      await updateJob(jobId, { contacts_found: uniqueContactIds.length });
      console.log(`[process-rd-import] Found ${uniqueContactIds.length} unique contacts`);

      checkpoint = {
        phase: "fetching_details",
        contact_ids: uniqueContactIds,
        contact_index: 0,
        imported: 0,
        skipped: 0,
        errors: 0,
        error_details: [],
      };
      await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
    }

    // ===== PHASE 3+4 Combined: Fetch full details & import one by one =====
    if (checkpoint.phase === "fetching_details" && importType === "contacts") {
      await updateJob(jobId, { status: "importing" });
      const contactIds = checkpoint.contact_ids || [];
      let contactIndex = checkpoint.contact_index || 0;
      let imported = checkpoint.imported || 0;
      let skipped = checkpoint.skipped || 0;
      let errors = checkpoint.errors || 0;
      const errorDetails: Array<{ name: string; error: string }> = checkpoint.error_details || [];

      while (contactIndex < contactIds.length) {
        if (isNearTimeout(startTime)) {
          checkpoint = {
            phase: "fetching_details",
            contact_ids: contactIds,
            contact_index: contactIndex,
            imported, skipped, errors,
            error_details: errorDetails.slice(0, 100),
          };
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

        const cId = contactIds[contactIndex];

        try {
          // Fetch full contact
          const res = await rateLimitedFetch(`${BASE}/contacts/${cId}?token=${TOKEN}`);
          if (!res.ok) {
            skipped++;
            contactIndex++;
            continue;
          }

          const rdContact = await res.json() as Record<string, unknown>;
          const name = ((rdContact.name as string) || "").trim();
          const email = (rdContact.emails as Array<{ email: string }>)?.[0]?.email || null;
          const phone = (rdContact.phones as Array<{ phone: string }>)?.[0]?.phone || "";
          const customFields = (rdContact.contact_custom_fields || []) as Array<Record<string, unknown>>;

          if (!name && !phone && !email) {
            skipped++;
            contactIndex++;
            continue;
          }

          const normalizedPhone = phone.replace(/\D/g, "");
          // Skip placeholder phones
          const hasValidPhone = normalizedPhone && normalizedPhone !== "0000000000" && normalizedPhone.length >= 8;

          // Check duplicates by phone
          if (hasValidPhone) {
            const { data: existing } = await supabase
              .from("contacts")
              .select("id")
              .or(`phone.eq.${normalizedPhone},phone.eq.${phone}`)
              .limit(1);
            if (existing && existing.length > 0) {
              skipped++;
              contactIndex++;
              continue;
            }
          }

          if (email) {
            const { data: existingByEmail } = await supabase
              .from("contacts")
              .select("id")
              .eq("email", email)
              .limit(1);
            if (existingByEmail && existingByEmail.length > 0) {
              skipped++;
              contactIndex++;
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
              if (parts.length === 3) birthDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            } else {
              birthDate = rawBirthDate.substring(0, 10);
            }
          }

          let parsedRgIssueDate: string | null = null;
          if (rgIssueDate) {
            if (rgIssueDate.includes("/")) {
              const parts = rgIssueDate.split("/");
              if (parts.length === 3) parsedRgIssueDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
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
          const rdId = cId;
          const noteParts: string[] = [`RD CRM ID: ${rdId}`];
          if (rdContact.title && !professionCf) noteParts.push(`Cargo RD: ${rdContact.title}`);

          // Use email as phone fallback when no valid phone exists
          let phoneToInsert = hasValidPhone ? normalizedPhone : "";
          if (!phoneToInsert && email) {
            // Use email hash as unique phone placeholder to avoid constraint violations
            phoneToInsert = `email:${email}`;
          }
          if (!phoneToInsert) {
            // No phone and no email — skip this contact
            errors++;
            errorDetails.push({ name: name || cId, error: "Sem telefone e sem e-mail — impossível criar contato" });
            contactIndex++;
            continue;
          }

          const { error: insertError } = await supabase
            .from("contacts")
            .insert({
              full_name: name || "Sem nome",
              phone: phoneToInsert,
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
          errorDetails.push({ name: cId, error: (e as Error).message });
        }

        contactIndex++;

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
        error_details: errorDetails,
        checkpoint_data: null,
      });

      console.log(`[process-rd-import] Job ${jobId} done: ${imported} imported, ${skipped} skipped, ${errors} errors`);
    }

    // ===== DEALS IMPORT: init from fetching_contacts phase =====
    if (importType === "deals" && checkpoint.phase === "fetching_contacts") {
      const dealIds = checkpoint.user_deal_ids || [];
      checkpoint = {
        phase: "importing_deals",
        user_deal_ids: dealIds,
        deal_index: 0,
        imported: 0,
        skipped: 0,
        errors: 0,
        error_details: [],
        contacts_found: 0,
      };
      await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
    }

    // ===== DEALS IMPORT: resumable processing =====
    if (importType === "deals" && checkpoint.phase === "importing_deals") {
      await processDealsWithCheckpoint(jobId, checkpoint, ownerUserId, createdBy, supabase, TOKEN, BASE, startTime);
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

function normalize(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function findBestMatch(rdName: string, locals: Array<{ id: string; name: string }>): { id: string; name: string } | null {
  const norm = normalize(rdName);
  // Exact match first
  const exact = locals.find((l) => normalize(l.name) === norm);
  if (exact) return exact;
  // Contains match
  const contains = locals.find((l) => normalize(l.name).includes(norm) || norm.includes(normalize(l.name)));
  if (contains) return contains;
  return null;
}

async function processDealsWithCheckpoint(
  jobId: string,
  checkpoint: CheckpointData,
  ownerUserId: string | null,
  createdBy: string,
  supabase: ReturnType<typeof getServiceRoleClient>,
  TOKEN: string,
  BASE: string,
  startTime: number
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

  const dealIds = checkpoint.user_deal_ids || [];
  let dealIndex = checkpoint.deal_index || 0;
  let imported = checkpoint.imported || 0;
  let skipped = checkpoint.skipped || 0;
  let errors = checkpoint.errors || 0;
  let contactsFound = checkpoint.contacts_found || 0;
  const errorDetails: Array<{ name: string; error: string }> = checkpoint.error_details || [];

  console.log(`[process-rd-import] Deals resuming at index ${dealIndex}/${dealIds.length}`);

  while (dealIndex < dealIds.length) {
    if (isNearTimeout(startTime)) {
      const cp: CheckpointData = {
        phase: "importing_deals",
        user_deal_ids: dealIds,
        deal_index: dealIndex,
        imported, skipped, errors,
        contacts_found: contactsFound,
        error_details: errorDetails.slice(0, 200),
      };
      await updateJob(jobId, {
        checkpoint_data: cp as unknown as Record<string, unknown>,
        contacts_found: contactsFound,
        contacts_imported: imported,
        contacts_skipped: skipped,
        contacts_errors: errors,
      });
      console.log(`[process-rd-import] Deals checkpoint at ${dealIndex}/${dealIds.length}: ${imported}imp ${skipped}skip ${errors}err`);
      await reinvokeSelf(jobId);
      return;
    }

    const dealId = dealIds[dealIndex];

    try {
      const res = await rateLimitedFetch(`${BASE}/deals/${dealId}?token=${TOKEN}`);
      if (!res.ok) { skipped++; dealIndex++; continue; }
      const deal = await res.json() as Record<string, unknown>;

      const dealName = (deal.name as string) || "";
      const dealValue = Number(deal.amount_total || deal.amount || 0);

      const rdPipeline = deal.deal_pipeline as Record<string, unknown> | null;
      const rdStage = deal.deal_stage as Record<string, unknown> | null;
      const rdPipelineName = (rdPipeline?.name as string) || "";
      const rdStageName = (rdStage?.name as string) || "";

      let targetFunnelId = defaultFunnel.id;
      let targetStageId = defaultStage.id;

      if (rdPipelineName) {
        const matchedFunnel = findBestMatch(rdPipelineName, localFunnels);
        if (matchedFunnel) {
          targetFunnelId = matchedFunnel.id;
          const funnelStages = localStages.filter((s) => s.funnel_id === matchedFunnel.id);
          if (rdStageName && funnelStages.length > 0) {
            const matchedStage = findBestMatch(rdStageName, funnelStages);
            targetStageId = matchedStage ? matchedStage.id : funnelStages[0].id;
          } else {
            targetStageId = funnelStages[0]?.id || defaultStage.id;
          }
        }
      }

      let localContactId: string | null = null;

      const contactsRes = await rateLimitedFetch(`${BASE}/deals/${dealId}/contacts?token=${TOKEN}`);
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        const rdContacts = contactsData?.contacts || (Array.isArray(contactsData) ? contactsData : []);

        if (rdContacts.length > 0) {
          contactsFound++;
          const rdContact = rdContacts[0] as Record<string, unknown>;
          const rdContactId = (rdContact._id || rdContact.id) as string;
          const phones = rdContact.phones as Array<{ phone: string }> | undefined;
          const emails = rdContact.emails as Array<{ email: string }> | undefined;
          let contactPhone = phones?.length ? (phones[0].phone || "").replace(/\D/g, "") : "";
          let contactEmail = emails?.length ? (emails[0].email || null) : null;
          let contactName = (rdContact.name as string) || "";

          if (!contactPhone && !contactEmail && rdContactId) {
            try {
              const cRes = await rateLimitedFetch(`${BASE}/contacts/${rdContactId}?token=${TOKEN}`);
              if (cRes.ok) {
                const fullContact = await cRes.json() as Record<string, unknown>;
                const fp = fullContact.phones as Array<{ phone: string }> | undefined;
                const fe = fullContact.emails as Array<{ email: string }> | undefined;
                if (fp?.length) contactPhone = (fp[0].phone || "").replace(/\D/g, "");
                if (fe?.length) contactEmail = fe[0].email || null;
                if (!contactName) contactName = (fullContact.name as string) || "";
              }
            } catch (_e) { /* ignore */ }
          }

          if (contactPhone && contactPhone.length >= 8) {
            const { data: found } = await supabase.from("contacts").select("id").or(`phone.eq.${contactPhone}`).limit(1);
            if (found?.length) localContactId = found[0].id;
          }
          if (!localContactId && contactEmail) {
            const { data: found } = await supabase.from("contacts").select("id").or(`email.eq.${contactEmail},phone.eq.email:${contactEmail}`).limit(1);
            if (found?.length) localContactId = found[0].id;
          }
          if (!localContactId && contactName) {
            const { data: found } = await supabase.from("contacts").select("id").ilike("full_name", contactName).limit(1);
            if (found?.length) localContactId = found[0].id;
          }
        }
      }

      if (!localContactId) {
        errors++;
        errorDetails.push({ name: dealName || dealId, error: "Contato não encontrado no sistema" });
        dealIndex++;
        continue;
      }

      const { data: existingOpp } = await supabase
        .from("opportunities").select("id")
        .eq("contact_id", localContactId)
        .ilike("notes", `%RD CRM Deal: ${dealId}%`)
        .limit(1);
      if (existingOpp?.length) { skipped++; dealIndex++; continue; }

      const rdStatus = (deal.win as string);
      let oppStatus: string = "active";
      if (rdStatus === "won") oppStatus = "converted";
      else if (rdStatus === "lost") oppStatus = "lost";

      const { error: insertError } = await supabase
        .from("opportunities")
        .insert({
          contact_id: localContactId,
          current_funnel_id: targetFunnelId,
          current_stage_id: targetStageId,
          created_by: createdBy,
          status: oppStatus,
          proposal_value: dealValue || null,
          notes: `RD CRM Deal: ${dealId} | ${dealName}`,
        });

      if (insertError) {
        errors++;
        errorDetails.push({ name: dealName, error: insertError.message });
      } else {
        imported++;
      }
    } catch (e) {
      errors++;
      errorDetails.push({ name: dealId, error: (e as Error).message });
    }

    dealIndex++;

    if ((imported + skipped + errors) % 5 === 0) {
      await updateJob(jobId, {
        contacts_found: contactsFound,
        contacts_imported: imported,
        contacts_skipped: skipped,
        contacts_errors: errors,
      });
    }
  }

  await updateJob(jobId, {
    status: "done",
    contacts_found: contactsFound,
    contacts_imported: imported,
    contacts_skipped: skipped,
    contacts_errors: errors,
    error_details: errorDetails,
    checkpoint_data: null,
  });

  console.log(`[process-rd-import] Deals job ${jobId} done: ${imported} imported, ${skipped} skipped, ${errors} errors out of ${dealIds.length} deals`);
}
