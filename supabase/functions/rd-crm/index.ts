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

async function fetchAllPages(endpoint: string, extraParams: Record<string, string> = {}, maxPages = 50) {
  const allItems: unknown[] = [];
  let page = 1;
  const limit = "200";

  while (page <= maxPages) {
    const data = await rdCrmGet(endpoint, { ...extraParams, page: String(page), limit });

    let items: unknown[];
    if (Array.isArray(data)) {
      items = data;
    } else if (data?.contacts) {
      items = data.contacts;
    } else if (data?.deals) {
      items = data.deals;
    } else if (Array.isArray(data?.data)) {
      items = data.data;
    } else {
      items = [];
    }

    if (items.length === 0) break;
    allItems.push(...items);

    if (items.length < 200) break;
    page++;
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

      case "list_users": {
        const users = await rdCrmGet("/users");
        const mapped = (Array.isArray(users) ? users : []).map((u: Record<string, unknown>) => ({
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

      case "import_contacts": {
        const rdUserId = payload.rd_user_id || null;
        const ownerUserId = payload.owner_user_id || null;

        // Build extra params for filtering by user
        const extraParams: Record<string, string> = {};
        if (rdUserId) {
          extraParams.user_id = rdUserId;
        }

        const contacts = await fetchAllPages("/contacts", extraParams) as Array<Record<string, unknown>>;

        let imported = 0;
        let skipped = 0;
        let errors = 0;
        const errorDetails: Array<{ name: string; error: string }> = [];

        for (const rdContact of contacts) {
          try {
            const name = (rdContact.name as string) || "";
            const email = (rdContact.emails as Array<{ email: string }>)?.[0]?.email || null;
            const phone = (rdContact.phones as Array<{ phone: string }>)?.[0]?.phone || "";

            if (!name && !phone) {
              skipped++;
              continue;
            }

            const normalizedPhone = phone.replace(/\D/g, "");

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

            const { error: insertError } = await supabase
              .from("contacts")
              .insert({
                full_name: name || "Sem nome",
                phone: normalizedPhone || "0000000000",
                email: email,
                source: "rd_crm",
                source_detail: `RD CRM ID: ${rdContact._id || rdContact.id || ""}`,
                notes: rdContact.title ? `Cargo: ${rdContact.title}` : null,
                created_by: userId,
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
              error: e.message,
            });
          }
        }

        result = {
          total_fetched: contacts.length,
          imported,
          skipped,
          errors,
          error_details: errorDetails.slice(0, 20),
        };
        break;
      }

      case "import_deals": {
        const rdUserId = payload.rd_user_id || null;
        const ownerUserId = payload.owner_user_id || null;

        const extraParams: Record<string, string> = {};
        if (rdUserId) {
          extraParams.user_id = rdUserId;
        }

        const deals = await fetchAllPages("/deals", extraParams) as Array<Record<string, unknown>>;

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
          throw new Error("Nenhum funil ou etapa cadastrado no sistema. Cadastre primeiro.");
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
              const contactName = (rdContact.name as string) || "";
              const contactPhone = ((rdContact.phones as Array<{ phone: string }>)?.[0]?.phone || "").replace(/\D/g, "");
              const contactEmail = (rdContact.emails as Array<{ email: string }>)?.[0]?.email || null;

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
                created_by: ownerUserId || userId,
              });

            if (insertError) {
              errors++;
              errorDetails.push({ name: dealName, error: insertError.message });
            } else {
              imported++;

              await supabase.from("opportunity_history").insert({
                opportunity_id: (await supabase
                  .from("opportunities")
                  .select("id")
                  .eq("contact_id", localContactId)
                  .ilike("notes", `%RD CRM Deal: ${rdDealId}%`)
                  .single()).data?.id || "",
                action: "created",
                changed_by: userId,
                notes: "Importado do RD Station CRM",
              });
            }
          } catch (e) {
            errors++;
            errorDetails.push({
              name: (deal.name as string) || "unknown",
              error: e.message,
            });
          }
        }

        result = {
          total_fetched: deals.length,
          imported,
          skipped,
          errors,
          error_details: errorDetails.slice(0, 20),
        };
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
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
