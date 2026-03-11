import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RD_CRM_BASE_URL = "https://crm.rdstation.com/api/v1";
const RATE_LIMIT_DELAY = 600;
const MAX_EXECUTION_MS = 120_000;

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

function isNearTimeout(startTime: number): boolean {
  return Date.now() - startTime > MAX_EXECUTION_MS;
}

async function updateJob(jobId: string, updates: Record<string, unknown>) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from("import_jobs")
    .update(updates)
    .eq("id", jobId);
  if (error) console.error(`Failed to update job ${jobId}:`, error.message);
}

async function reinvokeSelf(jobId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  console.log(`[unified-import] Re-invoking self for job ${jobId}`);
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/process-rd-unified-import`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId }),
    });
    console.log(`[unified-import] Re-invoke response: ${res.status}`);
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

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalize(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function findBestMatch(rdName: string, locals: Array<{ id: string; name: string }>): { id: string; name: string } | null {
  const norm = normalize(rdName);
  const exact = locals.find((l) => normalize(l.name) === norm);
  if (exact) return exact;
  const contains = locals.find((l) => normalize(l.name).includes(norm) || norm.includes(normalize(l.name)));
  if (contains) return contains;
  return null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// LIGHTWEIGHT checkpoint - only IDs and indexes
interface CheckpointData {
  phase: "fetching_deals" | "processing_deals";
  deals_page?: number;
  deal_ids?: string[];
  deal_index?: number;
  contacts_created?: number;
  contacts_skipped?: number;
  opportunities_created?: number;
  contracts_created?: number;
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
    .maybeSingle();

  if (jobError || !job) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (job.status === "done" || job.status === "error") {
    return new Response(JSON.stringify({ ok: true, already_done: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rdUserId = job.rd_user_id;
  const ownerUserId = job.owner_user_id;
  const createdBy = job.created_by;
  let checkpoint: CheckpointData = (job.checkpoint_data as CheckpointData) || { phase: "fetching_deals" };

  // Load local funnels, stages, product mappings upfront
  const { data: localFunnels } = await supabase
    .from("funnels")
    .select("id, name")
    .eq("is_active", true)
    .order("order_position");

  const { data: localStages } = await supabase
    .from("funnel_stages")
    .select("id, name, funnel_id, order_position")
    .order("order_position");

  const { data: mappings } = await supabase
    .from("rd_product_mappings")
    .select("rd_product_name, local_product_id");

  const productMap = new Map<string, string>();
  for (const m of (mappings || [])) {
    productMap.set(m.rd_product_name.toLowerCase().trim(), m.local_product_id);
  }

  const defaultFunnel = localFunnels?.[0];
  const defaultStage = localStages?.find((s) => s.funnel_id === defaultFunnel?.id) || localStages?.[0];

  if (!defaultFunnel || !defaultStage) {
    await updateJob(jobId, { status: "error", error_message: "Nenhum funil ou etapa cadastrado no sistema." });
    return new Response(JSON.stringify({ error: "No funnels configured" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ===== PHASE 1: Fetch ALL deal IDs =====
    if (checkpoint.phase === "fetching_deals") {
      await updateJob(jobId, { status: "fetching_deals" });
      console.log(`[unified-import] Job ${jobId}: fetching deals for user ${rdUserId}`);

      let page = checkpoint.deals_page || 1;
      const dealIds: string[] = checkpoint.deal_ids || [];

      while (page <= 200) {
        if (isNearTimeout(startTime)) {
          checkpoint = { phase: "fetching_deals", deals_page: page, deal_ids: dealIds };
          await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown>, deals_found: dealIds.length });
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

        for (const d of deals) {
          const dealId = (d._id || d.id) as string;
          if (dealId) dealIds.push(dealId);
        }

        if (deals.length < 200) break;
        page++;
      }

      await updateJob(jobId, { deals_found: dealIds.length });
      console.log(`[unified-import] Found ${dealIds.length} deals`);

      checkpoint = {
        phase: "processing_deals",
        deal_ids: dealIds,
        deal_index: 0,
        contacts_created: 0,
        contacts_skipped: 0,
        opportunities_created: 0,
        contracts_created: 0,
        errors: 0,
        error_details: [],
      };
      await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown> });
    }

    // ===== PHASE 2: Process each deal =====
    if (checkpoint.phase === "processing_deals") {
      await updateJob(jobId, { status: "importing" });
      const dealIds = checkpoint.deal_ids || [];
      let dealIndex = checkpoint.deal_index || 0;
      let contactsCreated = checkpoint.contacts_created || 0;
      let contactsSkipped = checkpoint.contacts_skipped || 0;
      let opportunitiesCreated = checkpoint.opportunities_created || 0;
      let contractsCreated = checkpoint.contracts_created || 0;
      let errors = checkpoint.errors || 0;
      const errorDetails: Array<{ name: string; error: string }> = checkpoint.error_details || [];

      while (dealIndex < dealIds.length) {
        if (isNearTimeout(startTime)) {
          checkpoint = {
            phase: "processing_deals",
            deal_ids: dealIds,
            deal_index: dealIndex,
            contacts_created: contactsCreated,
            contacts_skipped: contactsSkipped,
            opportunities_created: opportunitiesCreated,
            contracts_created: contractsCreated,
            errors,
            error_details: errorDetails.slice(0, 100),
          };
          await updateJob(jobId, {
            checkpoint_data: checkpoint as unknown as Record<string, unknown>,
            contacts_found: dealIds.length,
            contacts_imported: contactsCreated,
            contacts_skipped: contactsSkipped,
            contacts_errors: errors,
          });
          await reinvokeSelf(jobId);
          return new Response(JSON.stringify({ ok: true, checkpoint: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const dealId = dealIds[dealIndex];

        try {
          // 1. Fetch deal details
          const dealRes = await rateLimitedFetch(`${BASE}/deals/${dealId}?token=${TOKEN}`);
          if (!dealRes.ok) { dealIndex++; continue; }
          const deal = await dealRes.json() as Record<string, unknown>;

          const dealName = (deal.name as string) || "";
          const dealValue = Number(deal.amount_total || deal.amount || 0);
          const dealSource = deal.deal_source as { name?: string } | null;
          const sourceName = dealSource?.name || null;
          const campaign = deal.campaign as { name?: string } | null;
          const campaignName = campaign?.name || null;
          const rdStatus = deal.win as string;
          const rdPipeline = deal.deal_pipeline as Record<string, unknown> | null;
          const rdStage = deal.deal_stage as Record<string, unknown> | null;
          const rdPipelineName = (rdPipeline?.name as string) || "";
          const rdStageName = (rdStage?.name as string) || "";

          // 2. Map funnel/stage
          let targetFunnelId = defaultFunnel.id;
          let targetStageId = defaultStage.id;

          if (rdPipelineName && localFunnels) {
            const matchedFunnel = findBestMatch(rdPipelineName, localFunnels);
            if (matchedFunnel) {
              targetFunnelId = matchedFunnel.id;
              const funnelStages = (localStages || []).filter((s) => s.funnel_id === matchedFunnel.id);
              if (rdStageName && funnelStages.length > 0) {
                const matchedStage = findBestMatch(rdStageName, funnelStages);
                targetStageId = matchedStage ? matchedStage.id : funnelStages[0].id;
              } else {
                targetStageId = funnelStages[0]?.id || defaultStage.id;
              }
            }
          }

          // 3. Fetch contacts linked to this deal
          const contactsRes = await rateLimitedFetch(`${BASE}/deals/${dealId}/contacts?token=${TOKEN}`);
          if (!contactsRes.ok) { dealIndex++; continue; }
          const contactsData = await contactsRes.json();
          const rdContacts = contactsData?.contacts || (Array.isArray(contactsData) ? contactsData : []);

          if (rdContacts.length === 0) { dealIndex++; continue; }

          // Take first contact
          const rdContact = rdContacts[0] as Record<string, unknown>;
          const rdContactId = (rdContact._id || rdContact.id) as string;
          let phones = (rdContact.phones as Array<{ phone: string }>) || [];
          let emails = (rdContact.emails as Array<{ email: string }>) || [];
          let contactName = (rdContact.name as string) || "";
          let customFields: Array<Record<string, unknown>> = [];

          // 4. Fetch full contact details for custom fields
          if (rdContactId) {
            try {
              const cRes = await rateLimitedFetch(`${BASE}/contacts/${rdContactId}?token=${TOKEN}`);
              if (cRes.ok) {
                const fullContact = await cRes.json() as Record<string, unknown>;
                phones = (fullContact.phones as Array<{ phone: string }>) || phones;
                emails = (fullContact.emails as Array<{ email: string }>) || emails;
                contactName = (fullContact.name as string) || contactName;
                customFields = (fullContact.contact_custom_fields || []) as Array<Record<string, unknown>>;
              }
            } catch (_e) { /* ignore */ }
          }

          const phone = phones[0]?.phone || "";
          const email = emails[0]?.email || null;
          const normalizedPhone = normalizePhone(phone);
          const hasValidPhone = normalizedPhone && normalizedPhone !== "0000000000" && normalizedPhone.length >= 8;

          // 5. Check if contact exists
          let localContactId: string | null = null;
          let contactIsNew = false;

          if (hasValidPhone) {
            const { data: found } = await supabase
              .from("contacts")
              .select("id")
              .or(`phone.eq.${normalizedPhone},phone.eq.${phone}`)
              .limit(1);
            if (found?.length) localContactId = found[0].id;
          }
          if (!localContactId && email) {
            const { data: found } = await supabase
              .from("contacts")
              .select("id")
              .or(`email.eq.${email},phone.eq.email:${email}`)
              .limit(1);
            if (found?.length) localContactId = found[0].id;
          }

          // 6. Create contact if not exists
          if (!localContactId) {
            if (!contactName && !hasValidPhone && !email) {
              errors++;
              errorDetails.push({ name: dealName || dealId, error: "Contato sem nome, telefone ou e-mail" });
              dealIndex++;
              continue;
            }

            // Extract custom fields
            const cpf = getCustomFieldValue(customFields, CF_IDS.cpf);
            const rg = getCustomFieldValue(customFields, CF_IDS.rg);
            const rgIssuer = getCustomFieldValue(customFields, CF_IDS.rg_issuer);
            const rgIssueDateRaw = getCustomFieldValue(customFields, CF_IDS.rg_issue_date);
            const birthDateCf = getCustomFieldValue(customFields, CF_IDS.birth_date);
            const professionCf = getCustomFieldValue(customFields, CF_IDS.profession);
            const maritalStatusCf = getCustomFieldValue(customFields, CF_IDS.marital_status);
            const addressCf = getCustomFieldValue(customFields, CF_IDS.address);
            const incomeCf = getCustomFieldValue(customFields, CF_IDS.income);

            let birthDate: string | null = null;
            const rawBirthDate = birthDateCf || null;
            if (rawBirthDate) {
              if (rawBirthDate.includes("/")) {
                const parts = rawBirthDate.split("/");
                if (parts.length === 3) birthDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
              } else {
                birthDate = rawBirthDate.substring(0, 10);
              }
            }

            let parsedRgIssueDate: string | null = null;
            if (rgIssueDateRaw) {
              if (rgIssueDateRaw.includes("/")) {
                const parts = rgIssueDateRaw.split("/");
                if (parts.length === 3) parsedRgIssueDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
              } else {
                parsedRgIssueDate = rgIssueDateRaw.substring(0, 10);
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

            const profession = professionCf || null;

            let phoneToInsert = hasValidPhone ? normalizedPhone : "";
            if (!phoneToInsert && email) {
              phoneToInsert = `email:${email}`;
            }
            if (!phoneToInsert) {
              errors++;
              errorDetails.push({ name: contactName || dealId, error: "Sem telefone e sem e-mail" });
              dealIndex++;
              continue;
            }

            const { data: inserted, error: insertError } = await supabase
              .from("contacts")
              .insert({
                full_name: contactName || "Sem nome",
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
                source: sourceName || "rd_crm",
                campaign: campaignName || null,
                source_detail: `RD CRM ID: ${rdContactId}`,
                notes: `RD CRM ID: ${rdContactId}`,
                created_by: createdBy,
                owner_id: ownerUserId || null,
              })
              .select("id")
              .single();

            if (insertError) {
              // Might be duplicate phone/email - try to find existing
              if (insertError.message.includes("contacts_phone_key") || insertError.message.includes("contacts_email_key")) {
                contactsSkipped++;
                // Try to find the existing one for opportunity creation
                if (hasValidPhone) {
                  const { data: f } = await supabase.from("contacts").select("id").or(`phone.eq.${normalizedPhone},phone.eq.${phone}`).limit(1);
                  if (f?.length) localContactId = f[0].id;
                }
                if (!localContactId && email) {
                  const { data: f } = await supabase.from("contacts").select("id").or(`email.eq.${email},phone.eq.email:${email}`).limit(1);
                  if (f?.length) localContactId = f[0].id;
                }
              } else {
                errors++;
                errorDetails.push({ name: contactName || dealId, error: insertError.message });
                dealIndex++;
                continue;
              }
            } else {
              localContactId = inserted!.id;
              contactsCreated++;
              contactIsNew = true;
            }
          } else {
            contactsSkipped++;
            // Update source/campaign if empty
            const updates: Record<string, string> = {};
            if (sourceName) updates.source = sourceName;
            if (campaignName) updates.campaign = campaignName;
            if (Object.keys(updates).length > 0) {
              // Only update if fields are currently empty
              await supabase
                .from("contacts")
                .update(updates)
                .eq("id", localContactId)
                .or("source.is.null,source.eq.rd_crm");
            }
          }

          if (!localContactId) {
            dealIndex++;
            continue;
          }

          // 7. Create opportunity
          const { data: existingOpp } = await supabase
            .from("opportunities")
            .select("id")
            .eq("contact_id", localContactId)
            .ilike("notes", `%RD CRM Deal: ${dealId}%`)
            .limit(1);

          if (!existingOpp?.length) {
            let oppStatus: string = "active";
            if (rdStatus === "won") oppStatus = "won";
            else if (rdStatus === "lost") oppStatus = "lost";

            const { error: oppError } = await supabase
              .from("opportunities")
              .insert({
                contact_id: localContactId,
                current_funnel_id: targetFunnelId,
                current_stage_id: targetStageId,
                created_by: createdBy,
                status: oppStatus,
                proposal_value: dealValue || null,
                converted_at: oppStatus === "won" ? new Date().toISOString() : null,
                notes: `RD CRM Deal: ${dealId} | ${dealName}`,
              });

            if (oppError) {
              errors++;
              errorDetails.push({ name: dealName || dealId, error: `Oportunidade: ${oppError.message}` });
            } else {
              opportunitiesCreated++;
            }
          }

          // 8. For won deals with products, create contracts
          if (rdStatus === "won" && productMap.size > 0) {
            try {
              const productsRes = await rateLimitedFetch(`${BASE}/deals/${dealId}/deal_products?token=${TOKEN}`);
              if (productsRes.ok) {
                const productsData = await productsRes.json();
                const dealProducts = Array.isArray(productsData) ? productsData : (productsData?.deal_products || []);

                for (const dp of dealProducts as Array<Record<string, unknown>>) {
                  const rdProductName = (dp.name as string) || "";
                  const rdPrice = Number(dp.price) || 0;
                  if (!rdProductName || rdPrice <= 0) continue;

                  const localProductId = productMap.get(rdProductName.toLowerCase().trim());
                  if (!localProductId) continue;

                  // Check duplicate
                  const { data: existing } = await supabase
                    .from("contracts")
                    .select("id, contract_value")
                    .eq("contact_id", localContactId)
                    .eq("product_id", localProductId)
                    .in("status", ["active", "pending"]);

                  const isDuplicate = (existing || []).some((c: { contract_value: number }) => {
                    const diff = Math.abs(c.contract_value - rdPrice);
                    return diff <= rdPrice * 0.01;
                  });
                  if (isDuplicate) continue;

                  // Get product PB info
                  const { data: productInfo } = await supabase
                    .from("products")
                    .select("pb_calculation_type, pb_value")
                    .eq("id", localProductId)
                    .single();

                  let calculatedPbs = 0;
                  if (productInfo) {
                    if (productInfo.pb_calculation_type === "percentage") {
                      calculatedPbs = (rdPrice * productInfo.pb_value) / 100;
                    } else {
                      calculatedPbs = productInfo.pb_value || 0;
                    }
                  }

                  const { error: contractError } = await supabase
                    .from("contracts")
                    .insert({
                      contact_id: localContactId,
                      product_id: localProductId,
                      owner_id: ownerUserId || createdBy,
                      contract_value: rdPrice,
                      calculated_pbs: calculatedPbs,
                      status: "active",
                      reported_at: new Date().toISOString(),
                      notes: `Importado do RD CRM - Negociação: ${dealName}`,
                    });

                  if (!contractError) {
                    contractsCreated++;
                  } else {
                    errorDetails.push({ name: `${contactName}: ${rdProductName}`, error: contractError.message });
                  }
                }
              }
            } catch (_e) {
              // Non-fatal: products are optional
            }
          }
        } catch (e) {
          errors++;
          errorDetails.push({ name: dealId, error: (e as Error).message });
        }

        dealIndex++;

        // Periodic progress update
        if (dealIndex % 5 === 0) {
          await updateJob(jobId, {
            contacts_found: dealIds.length,
            contacts_imported: contactsCreated,
            contacts_skipped: contactsSkipped,
            contacts_errors: errors,
          });
        }
      }

      // Store final counts in error_details as JSON for UI to parse
      const finalDetails = [
        ...errorDetails.slice(0, 190),
        { name: "__stats__", error: JSON.stringify({ opportunities_created: opportunitiesCreated, contracts_created: contractsCreated }) },
      ];

      await updateJob(jobId, {
        status: "done",
        contacts_found: dealIds.length,
        contacts_imported: contactsCreated,
        contacts_skipped: contactsSkipped,
        contacts_errors: errors,
        error_details: finalDetails,
        checkpoint_data: null,
      });

      console.log(`[unified-import] Job ${jobId} done: ${contactsCreated} contacts, ${opportunitiesCreated} opportunities, ${contractsCreated} contracts, ${contactsSkipped} skipped, ${errors} errors`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[unified-import] Error:", error);
    await updateJob(jobId, {
      status: "error",
      error_message: (error as Error).message,
      checkpoint_data: null,
    });
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
