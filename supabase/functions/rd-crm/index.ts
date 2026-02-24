import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RD_CRM_BASE_URL = "https://crm.rdstation.com/api/v1";

function getToken(): string {
  const token = Deno.env.get("RD_CRM_API_TOKEN");
  if (!token) throw new Error("RD_CRM_API_TOKEN not configured");
  return token;
}

async function rdCrmGet(endpoint: string, params: Record<string, string> = {}) {
  const token = getToken();
  const url = new URL(`${RD_CRM_BASE_URL}${endpoint}`);
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`RD CRM API error ${res.status}:`, errBody);
    throw new Error(`RD CRM API error: ${res.status}`);
  }

  return await res.json();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rdCrmGetWithRetry(endpoint: string, params: Record<string, string> = {}, retries = 2): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await rdCrmGet(endpoint, params);
    } catch (err) {
      const msg = (err as Error).message || "";
      if ((msg.includes("504") || msg.includes("429")) && attempt < retries) {
        console.log(`Retry ${attempt + 1} for ${endpoint} after error: ${msg}`);
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries reached");
}

async function fetchAllPages(endpoint: string, extraParams: Record<string, string> = {}, maxPages = 50) {
  const allItems: unknown[] = [];
  let page = 1;
  const limit = "100";

  while (page <= maxPages) {
    const data = await rdCrmGetWithRetry(endpoint, { ...extraParams, page: String(page), limit });

    let items: unknown[];
    if (Array.isArray(data)) {
      items = data;
    } else if ((data as Record<string, unknown>)?.contacts) {
      items = (data as Record<string, unknown>).contacts as unknown[];
    } else if ((data as Record<string, unknown>)?.deals) {
      items = (data as Record<string, unknown>).deals as unknown[];
    } else if (Array.isArray((data as Record<string, unknown>)?.data)) {
      items = (data as Record<string, unknown>).data as unknown[];
    } else {
      items = [];
    }

    if (items.length === 0) break;
    allItems.push(...items);

    if (items.length < 100) break;
    page++;

    // Small delay between pages to avoid rate limits
    await sleep(500);
  }

  return allItems;
}

function getServiceRoleClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const jwtToken = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwtToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { action, ...payload } = await req.json();

    let result: unknown;

    switch (action) {
      case "test_connection": {
        const data = await rdCrmGet("/token/check");
        result = data;
        break;
      }

      case "get_contact_sample": {
        // Fetch a contact that has custom fields populated
        const contactsPage = await rdCrmGet("/contacts", { page: "1", limit: "20" });
        const contactsList = contactsPage?.contacts || [];
        // Find one with custom fields
        const withCustom = contactsList.find((c: Record<string, unknown>) => {
          const cf = c.contact_custom_fields as unknown[];
          return cf && cf.length > 0;
        }) || contactsList[0];
        if (withCustom) {
          const fullContact = await rdCrmGet(`/contacts/${withCustom._id}`);
          result = fullContact;
        } else {
          result = contactsList[0] || null;
        }
        break;
      }

      case "list_custom_fields": {
        const cfFor = payload.cf_for || "contact";
        const data = await rdCrmGet("/custom_fields", { "for": cfFor });
        result = data;
        break;
      }

      case "list_users": {
        const data = await rdCrmGet("/users");
        const usersArray = Array.isArray(data) ? data : (data?.users || []);
        const mapped = usersArray.map((u: Record<string, unknown>) => ({
          id: u._id || u.id,
          name: u.name || "",
          email: u.email || "",
        }));
        result = mapped;
        break;
      }

      case "create_system_user": {
        const { email, full_name } = payload;
        if (!email) throw new Error("email é obrigatório");

        const adminClient = getServiceRoleClient();

        // Check if user already exists
        const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const existingUser = existingUsers?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (existingUser) {
          result = { user_id: existingUser.id, already_existed: true };
        } else {
          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: email,
            password: "Brauna@2025",
            email_confirm: true,
            user_metadata: { full_name: full_name || email },
          });

          if (createError) throw new Error(`Erro ao criar usuário: ${createError.message}`);
          result = { user_id: newUser.user!.id, already_existed: false };
        }
        break;
      }

      case "list_contacts": {
        const page = payload.page || "1";
        const limit = payload.limit || "200";
        const data = await rdCrmGet("/contacts", { page, limit });
        result = data;
        break;
      }

      case "list_deals": {
        const page = payload.page || "1";
        const limit = payload.limit || "200";
        const data = await rdCrmGet("/deals", { page, limit });
        result = data;
        break;
      }

      case "list_deal_pipelines": {
        const data = await rdCrmGet("/deal_pipelines");
        result = data;
        break;
      }

      case "list_deal_stages": {
        const pipelineId = payload.pipeline_id;
        if (!pipelineId) throw new Error("pipeline_id é obrigatório");
        const data = await rdCrmGet(`/deal_stages`, { deal_pipeline_id: pipelineId });
        result = data;
        break;
      }

      case "start_import": {
        const rdUserId = payload.rd_user_id;
        const importType = payload.import_type || "contacts";
        const ownerUserId = payload.owner_user_id || null;

        if (!rdUserId) throw new Error("rd_user_id é obrigatório");

        // Create job record
        const { data: job, error: jobError } = await supabase
          .from("import_jobs")
          .insert({
            created_by: userId,
            rd_user_id: rdUserId,
            import_type: importType,
            owner_user_id: ownerUserId,
            status: "pending",
          })
          .select()
          .single();

        if (jobError) throw new Error(`Erro ao criar job: ${jobError.message}`);

        // Fire-and-forget: trigger the worker function
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        fetch(`${supabaseUrl}/functions/v1/process-rd-import`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId: job.id }),
        }).catch((err) => {
          console.error("Failed to trigger process-rd-import:", err);
        });

        result = { job_id: job.id };
        break;
      }

      case "get_import_status": {
        const jobId = payload.job_id;
        if (!jobId) throw new Error("job_id é obrigatório");

        const { data: job, error: jobError } = await supabase
          .from("import_jobs")
          .select("id, status, deals_found, contacts_found, contacts_imported, contacts_skipped, contacts_errors, error_details, error_message, created_at, updated_at")
          .eq("id", jobId)
          .maybeSingle();

        if (jobError) throw new Error(`Erro ao buscar job: ${jobError.message}`);
        if (!job) throw new Error("Job não encontrado");
        result = job;
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("RD CRM function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
