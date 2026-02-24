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

      case "import_contacts": {
        const rdUserId = payload.rd_user_id || null;
        const ownerUserId = payload.owner_user_id || null;

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

        // Normalize Brazilian phone: strip country code 55 prefix, keep last 10-11 digits
        function normalizePhone(raw: string): string {
          const digits = raw.replace(/\D/g, "");
          if (!digits) return "";
          // If starts with 55 and has 12-13 digits, strip country code
          if (digits.length >= 12 && digits.startsWith("55")) {
            return digits.substring(2);
          }
          return digits;
        }

        // When filtering by user, we must go through deals (contacts don't have user field)
        if (rdUserId) {
          // Step 1: Fetch all deals for user (deals are fewer, ~hundreds)
          const allDeals = await fetchAllPages("/deals") as Array<Record<string, unknown>>;
          const userDeals = allDeals.filter((d) => {
            const dealUser = d.user as Record<string, unknown> | undefined;
            return (dealUser?._id || dealUser?.id) === rdUserId;
          });

          console.log(`Found ${userDeals.length} deals for user ${rdUserId}`);

          // Step 2: Extract contact identifiers from deals
          const dealContactPhones = new Set<string>();
          const dealContactEmails = new Set<string>();
          const dealContactNames = new Set<string>();

          for (const deal of userDeals) {
            const dealContacts = (deal.contacts || []) as Array<Record<string, unknown>>;
            for (const dc of dealContacts) {
              const phones = (dc.phones || []) as Array<{ phone: string }>;
              for (const p of phones) {
                if (p.phone) {
                  const normalized = normalizePhone(p.phone);
                  if (normalized) dealContactPhones.add(normalized);
                }
              }
              const emails = (dc.emails || []) as Array<{ email: string }>;
              for (const e of emails) {
                if (e.email) dealContactEmails.add(e.email.toLowerCase().trim());
              }
              const name = ((dc.name as string) || "").trim().toLowerCase();
              if (name) dealContactNames.add(name);
            }
          }

          console.log(`Extracted from deals: ${dealContactPhones.size} phones, ${dealContactEmails.size} emails, ${dealContactNames.size} names`);
          console.log(`Sample deal phones: ${JSON.stringify(Array.from(dealContactPhones).slice(0, 5))}`);

          // Step 3: Fetch contacts page by page and match (stop early if all found)
          const matchedContacts: Array<Record<string, unknown>> = [];
          const totalToFind = Math.max(dealContactPhones.size, dealContactEmails.size, dealContactNames.size);
          let page = 1;
          const maxPages = 60;

          while (page <= maxPages) {
            const data = await rdCrmGetWithRetry("/contacts", { page: String(page), limit: "200" });
            const items = ((data as Record<string, unknown>)?.contacts || (Array.isArray(data) ? data : [])) as Array<Record<string, unknown>>;
            if (items.length === 0) break;

            for (const c of items) {
              let matched = false;
              // Match by phone
              const cPhones = (c.phones || []) as Array<{ phone: string }>;
              for (const p of cPhones) {
                if (p.phone) {
                  const normalized = normalizePhone(p.phone);
                  if (normalized && dealContactPhones.has(normalized)) { matched = true; break; }
                }
              }
              if (!matched) {
                // Match by email
                const cEmails = (c.emails || []) as Array<{ email: string }>;
                for (const e of cEmails) {
                  if (e.email && dealContactEmails.has(e.email.toLowerCase().trim())) { matched = true; break; }
                }
              }
              if (!matched) {
                // Match by exact name
                const cName = ((c.name as string) || "").trim().toLowerCase();
                if (cName && dealContactNames.has(cName)) matched = true;
              }
              if (matched) matchedContacts.push(c);
            }

            if (items.length < 200) break;
            // If we found enough, stop early
            if (matchedContacts.length >= totalToFind) break;
            page++;
            await sleep(300);
          }

          console.log(`Matched ${matchedContacts.length} contacts across ${page} pages for user ${rdUserId}`);
          var contactsToImport = matchedContacts;
        } else {
          var contactsToImport = await fetchAllPages("/contacts") as Array<Record<string, unknown>>;
        }

        let imported = 0;
        let skipped = 0;
        let errors = 0;
        const errorDetails: Array<{ name: string; error: string }> = [];

        for (const rdContact of contactsToImport) {
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

            // Parse birth date (could be "02/11/1962" or ISO format)
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

            // Map marital status to our system values
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

            // Use profession from custom field or title
            const profession = professionCf || (rdContact.title as string) || null;

            // Build notes with RD CRM ID
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
          total_fetched: contactsToImport.length,
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

        const allDeals = await fetchAllPages("/deals") as Array<Record<string, unknown>>;
        
        // Filter deals by user on the server side
        let deals = allDeals;
        if (rdUserId) {
          deals = allDeals.filter((d) => {
            const dealUser = d.user as Record<string, unknown> | undefined;
            return (dealUser?._id || dealUser?.id) === rdUserId;
          });
          console.log(`Filtered deals: ${deals.length} of ${allDeals.length} for user ${rdUserId}`);
        }

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
