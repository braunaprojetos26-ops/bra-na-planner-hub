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

async function reinvokeSelf(jobId: string, rdUserId?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  console.log(`[backfill-sources] Re-invoking self for job ${jobId}`);
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/process-rd-backfill-sources`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId, rdUserId }),
    });
    console.log(`[backfill-sources] Re-invoke response: ${res.status}`);
  } catch (err) {
    console.error("Failed to re-invoke self:", err);
  }
}

interface CheckpointData {
  phase: "fetching_deals" | "processing_deals";
  deals_page?: number;
  deal_ids?: string[];
  deal_index?: number;
  updated?: number;
  skipped?: number;
  errors?: number;
  error_details?: Array<{ name: string; error: string }>;
  rd_user_id?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const { jobId, rdUserId } = await req.json();
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

  let checkpoint: CheckpointData = (job.checkpoint_data as CheckpointData) || { phase: "fetching_deals" };

  try {
    // ===== PHASE 1: Fetch ALL deal IDs =====
    if (checkpoint.phase === "fetching_deals") {
      await updateJob(jobId, { status: "fetching_deals" });
      console.log(`[backfill-sources] Job ${jobId}: fetching all deals`);

      let page = checkpoint.deals_page || 1;
      const dealIds: string[] = [];

      // Store rdUserId in checkpoint for re-invocations
      const filterUserId = rdUserId || (checkpoint as any).rd_user_id;

      while (page <= 50) {
        if (isNearTimeout(startTime)) {
          checkpoint = { phase: "fetching_deals", deals_page: page, deal_ids: dealIds, rd_user_id: filterUserId };
          await updateJob(jobId, { checkpoint_data: checkpoint as unknown as Record<string, unknown>, deals_found: dealIds.length });
          await reinvokeSelf(jobId, filterUserId);
          return new Response(JSON.stringify({ ok: true, checkpoint: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let dealUrl = `${BASE}/deals?token=${TOKEN}&limit=200&page=${page}`;
        if (filterUserId) {
          dealUrl += `&user_id=${filterUserId}`;
        }
        const res = await rateLimitedFetch(dealUrl);
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
      console.log(`[backfill-sources] Found ${dealIds.length} total deals`);

      checkpoint = {
        phase: "processing_deals",
        deal_ids: dealIds,
        deal_index: 0,
        updated: 0,
        skipped: 0,
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
      let updated = checkpoint.updated || 0;
      let skipped = checkpoint.skipped || 0;
      let errors = checkpoint.errors || 0;
      const errorDetails: Array<{ name: string; error: string }> = checkpoint.error_details || [];

      while (dealIndex < dealIds.length) {
        if (isNearTimeout(startTime)) {
          checkpoint = {
            phase: "processing_deals",
            deal_ids: dealIds,
            deal_index: dealIndex,
            updated, skipped, errors,
            error_details: errorDetails.slice(0, 100),
          };
          await updateJob(jobId, {
            checkpoint_data: checkpoint as unknown as Record<string, unknown>,
            contacts_imported: updated,
            contacts_skipped: skipped,
            contacts_errors: errors,
          });
          await reinvokeSelf(jobId, (checkpoint as any).rd_user_id);
          return new Response(JSON.stringify({ ok: true, checkpoint: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const dealId = dealIds[dealIndex];

        try {
          // Fetch deal details to get deal_source
          const dealRes = await rateLimitedFetch(`${BASE}/deals/${dealId}?token=${TOKEN}`);
          if (!dealRes.ok) {
            skipped++;
            dealIndex++;
            continue;
          }

          const deal = await dealRes.json() as Record<string, unknown>;
          const dealSource = deal.deal_source as { _id?: string; name?: string } | null;
          const sourceName = dealSource?.name;

          if (!sourceName) {
            skipped++;
            dealIndex++;
            continue;
          }

          // Get contacts linked to this deal
          const contactsRes = await rateLimitedFetch(`${BASE}/deals/${dealId}/contacts?token=${TOKEN}`);
          if (!contactsRes.ok) {
            skipped++;
            dealIndex++;
            continue;
          }

          const contactsData = await contactsRes.json();
          const rdContacts = contactsData?.contacts || (Array.isArray(contactsData) ? contactsData : []);

          for (const rdContact of rdContacts as Array<Record<string, unknown>>) {
            const phones = (rdContact.phones as Array<{ phone: string }>) || [];
            const emails = (rdContact.emails as Array<{ email: string }>) || [];
            const name = (rdContact.name as string) || "";

            // Try to find local contact by phone first, then email
            let localContactId: string | null = null;

            for (const p of phones) {
              if (!p.phone) continue;
              const normalized = normalizePhone(p.phone);
              if (!normalized || normalized.length < 8) continue;

              const { data: found } = await supabase
                .from("contacts")
                .select("id, source")
                .or(`phone.eq.${normalized},phone.eq.${p.phone}`)
                .limit(1);

              if (found && found.length > 0) {
                localContactId = found[0].id;
                // Only update if source is 'rd_crm' or null
                const currentSource = found[0].source;
                if (currentSource && currentSource !== "rd_crm") {
                  localContactId = null; // Don't overwrite meaningful sources
                }
                break;
              }
            }

            if (!localContactId) {
              for (const e of emails) {
                if (!e.email) continue;
                const { data: found } = await supabase
                  .from("contacts")
                  .select("id, source")
                  .eq("email", e.email)
                  .limit(1);

                if (found && found.length > 0) {
                  localContactId = found[0].id;
                  const currentSource = found[0].source;
                  if (currentSource && currentSource !== "rd_crm") {
                    localContactId = null;
                  }
                  break;
                }
              }
            }

            if (localContactId) {
              const { error: updateError } = await supabase
                .from("contacts")
                .update({ source: sourceName })
                .eq("id", localContactId)
                .in("source", ["rd_crm"]);

              // Also try updating null sources
              await supabase
                .from("contacts")
                .update({ source: sourceName })
                .eq("id", localContactId)
                .is("source", null);

              if (updateError) {
                errors++;
                errorDetails.push({ name: name || dealId, error: updateError.message });
              } else {
                updated++;
              }
            } else {
              skipped++;
            }
          }
        } catch (e) {
          errors++;
          errorDetails.push({ name: dealId, error: (e as Error).message });
        }

        dealIndex++;

        if ((updated + skipped + errors) % 10 === 0) {
          await updateJob(jobId, {
            contacts_imported: updated,
            contacts_skipped: skipped,
            contacts_errors: errors,
          });
        }
      }

      await updateJob(jobId, {
        status: "done",
        contacts_imported: updated,
        contacts_skipped: skipped,
        contacts_errors: errors,
        error_details: errorDetails.slice(0, 200),
        checkpoint_data: null,
      });

      console.log(`[backfill-sources] Job ${jobId} done: ${updated} updated, ${skipped} skipped, ${errors} errors`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[backfill-sources] Error:", error);
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
