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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { activity_id } = await req.json();
    if (!activity_id) throw new Error("activity_id is required");

    const { data: activity, error } = await supabase
      .from("critical_activities")
      .select("*")
      .eq("id", activity_id)
      .single();
    if (error) throw error;

    let tasksCreated = 0;

    if (activity.rule_type === "inadimplente") {
      tasksCreated = await handleInadimplente(supabase, activity);
    } else if (activity.rule_type === "health_score_critico") {
      tasksCreated = await handleHealthScoreCritico(supabase, activity);
    } else if (activity.rule_type === "contrato_vencendo") {
      tasksCreated = await handleContratoVencendo(supabase, activity);
    } else if (activity.rule_type === "client_characteristic") {
      tasksCreated = await handleClientCharacteristic(supabase, activity);
    }

    // Update last_run_at
    await supabase
      .from("critical_activities")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", activity.id);

    return new Response(
      JSON.stringify({ success: true, tasks_created: tasksCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error evaluating single activity:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleClientCharacteristic(supabase: any, activity: any) {
  let tasksCreated = 0;
  const config = activity.rule_config || {};
  const filterType = config.filter_type;
  const operator = config.operator || "equals";
  const value = config.value;

  if (!filterType || !value) return 0;

  // Get matching owner_ids based on filter
  let ownerContactPairs: { owner_id: string; contact_id: string; contact_name: string }[] = [];

  if (filterType === "product") {
    // Get products in category
    const { data: products } = await supabase
      .from("products")
      .select("id")
      .eq("category_id", value);
    const productIds = (products || []).map((p: any) => p.id);

    if (operator === "has") {
      if (productIds.length === 0) return 0;
      const { data: contracts } = await supabase
        .from("contracts")
        .select("contact_id, owner_id")
        .eq("status", "active")
        .in("product_id", productIds);

      const contactIds = [...new Set((contracts || []).map((c: any) => c.contact_id))];
      if (contactIds.length === 0) return 0;

      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, full_name, owner_id")
        .in("id", contactIds)
        .not("owner_id", "is", null);

      ownerContactPairs = (contacts || []).map((c: any) => ({
        owner_id: c.owner_id,
        contact_id: c.id,
        contact_name: c.full_name,
      }));
    } else if (operator === "not_has") {
      // Get all contacts that have an active contract
      const { data: allContacts } = await supabase
        .from("contacts")
        .select("id, full_name, owner_id")
        .not("owner_id", "is", null);

      if (!allContacts?.length) return 0;

      // Get contacts WITH the product
      let contactsWithProduct = new Set<string>();
      if (productIds.length > 0) {
        const { data: contracts } = await supabase
          .from("contracts")
          .select("contact_id")
          .eq("status", "active")
          .in("product_id", productIds);
        contactsWithProduct = new Set((contracts || []).map((c: any) => c.contact_id));
      }

      ownerContactPairs = allContacts
        .filter((c: any) => !contactsWithProduct.has(c.id))
        .map((c: any) => ({
          owner_id: c.owner_id,
          contact_id: c.id,
          contact_name: c.full_name,
        }));
    }
  } else if (filterType === "marital_status") {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, full_name, owner_id")
      .eq("marital_status", value)
      .not("owner_id", "is", null);

    ownerContactPairs = (contacts || []).map((c: any) => ({
      owner_id: c.owner_id,
      contact_id: c.id,
      contact_name: c.full_name,
    }));
  } else if (filterType === "gender") {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, full_name, owner_id")
      .eq("gender", value)
      .not("owner_id", "is", null);

    ownerContactPairs = (contacts || []).map((c: any) => ({
      owner_id: c.owner_id,
      contact_id: c.id,
      contact_name: c.full_name,
    }));
  } else if (filterType === "goal_type") {
    // Search in contact_data_collections for goals matching
    const { data: collections } = await supabase
      .from("contact_data_collections")
      .select("contact_id, data_collection");

    if (!collections?.length) return 0;

    const matchingContactIds: string[] = [];
    for (const col of collections) {
      const data = col.data_collection;
      if (!data) continue;
      // Search for goals/objectives in the JSON
      const json = typeof data === "string" ? JSON.parse(data) : data;
      const hasGoal = searchGoalInCollection(json, value);
      if (hasGoal) matchingContactIds.push(col.contact_id);
    }

    if (matchingContactIds.length === 0) return 0;

    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, full_name, owner_id")
      .in("id", matchingContactIds)
      .not("owner_id", "is", null);

    ownerContactPairs = (contacts || []).map((c: any) => ({
      owner_id: c.owner_id,
      contact_id: c.id,
      contact_name: c.full_name,
    }));
  }

  // Create tasks for each owner-contact pair
  // Group by owner to avoid duplicate assignments
  const ownerGroups = new Map<string, typeof ownerContactPairs>();
  for (const pair of ownerContactPairs) {
    if (!ownerGroups.has(pair.owner_id)) ownerGroups.set(pair.owner_id, []);
    ownerGroups.get(pair.owner_id)!.push(pair);
  }

  for (const [ownerId, contacts] of ownerGroups) {
    const contactNames = contacts.map(c => c.contact_name).slice(0, 5);
    const suffix = contacts.length > 5 ? ` (+${contacts.length - 5} outros)` : '';
    const nameList = contactNames.join(", ") + suffix;

    await supabase.from("tasks").insert({
      created_by: activity.created_by,
      assigned_to: ownerId,
      title: `[Atividade Crítica] ${activity.title}`,
      description: activity.description || `Clientes: ${nameList}`,
      task_type: "other",
      scheduled_at: activity.deadline || new Date().toISOString(),
      status: "pending",
    });

    await supabase.from("critical_activity_assignments").upsert({
      activity_id: activity.id,
      user_id: ownerId,
      status: "pending",
    }, { onConflict: "activity_id,user_id", ignoreDuplicates: true });

    tasksCreated++;
  }

  return tasksCreated;
}

function searchGoalInCollection(data: any, goalType: string): boolean {
  if (!data) return false;
  const str = JSON.stringify(data).toLowerCase();
  const searchTerm = goalType.toLowerCase().replace(/_/g, " ");
  
  // Map common goal types to search terms
  const goalMap: Record<string, string[]> = {
    aposentadoria: ["aposentadoria", "aposentar"],
    compra_imovel: ["imóvel", "imovel", "casa própria", "casa propria", "compra de imóvel"],
    educacao_filhos: ["educação", "educacao", "filhos", "faculdade"],
    viagem: ["viagem", "viajar"],
    reserva_emergencia: ["reserva", "emergência", "emergencia"],
    independencia_financeira: ["independência financeira", "independencia financeira"],
    compra_veiculo: ["veículo", "veiculo", "carro"],
    outros: ["outros", "outro"],
  };

  const terms = goalMap[goalType] || [searchTerm];
  return terms.some(term => str.includes(term));
}

// Reuse handlers from evaluate-perpetual-activities
async function handleInadimplente(supabase: any, activity: any) {
  let tasksCreated = 0;
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, contact_id, owner_id, vindi_status")
    .eq("status", "active")
    .not("vindi_subscription_id", "is", null);

  if (!contracts?.length) return 0;

  const contactIds = [...new Set(contracts.map((c: any) => c.contact_id))];
  const { data: contacts_info } = await supabase
    .from("contacts")
    .select("id, full_name, owner_id")
    .in("id", contactIds);

  const contactMap = new Map((contacts_info || []).map((c: any) => [c.id, c]));

  for (const contract of contracts) {
    const status = (contract.vindi_status || "").toLowerCase();
    if (!status.includes("overdue") && !status.includes("canceled") && status !== "past_due") continue;

    const contact: any = contactMap.get(contract.contact_id);
    if (!contact) continue;
    const userId = contact.owner_id || contract.owner_id;
    if (!userId) continue;

    await supabase.from("tasks").insert({
      created_by: activity.created_by,
      assigned_to: userId,
      title: `[Atividade Crítica] ${activity.title} - ${contact.full_name}`,
      description: activity.description || `Cliente ${contact.full_name} está inadimplente.`,
      task_type: "other",
      scheduled_at: activity.deadline || new Date().toISOString(),
      status: "pending",
    });

    await supabase.from("critical_activity_assignments").upsert({
      activity_id: activity.id,
      user_id: userId,
      status: "pending",
    }, { onConflict: "activity_id,user_id", ignoreDuplicates: true });

    tasksCreated++;
  }
  return tasksCreated;
}

async function handleHealthScoreCritico(supabase: any, activity: any) {
  let tasksCreated = 0;
  const threshold = activity.rule_config?.threshold || 40;

  const { data: scores } = await supabase
    .from("health_score_snapshots")
    .select("contact_id, owner_id, total_score")
    .lt("total_score", threshold)
    .order("snapshot_date", { ascending: false });

  if (!scores?.length) return 0;

  const seenContacts = new Set<string>();
  const uniqueScores = [];
  for (const s of scores) {
    if (!seenContacts.has(s.contact_id)) {
      seenContacts.add(s.contact_id);
      uniqueScores.push(s);
    }
  }

  const contactIds = uniqueScores.map(s => s.contact_id);
  const { data: contacts_info } = await supabase
    .from("contacts")
    .select("id, full_name, owner_id")
    .in("id", contactIds);

  const contactMap = new Map((contacts_info || []).map((c: any) => [c.id, c]));

  for (const score of uniqueScores) {
    const contact: any = contactMap.get(score.contact_id);
    if (!contact) continue;
    const userId = contact.owner_id || score.owner_id;
    if (!userId) continue;

    await supabase.from("tasks").insert({
      created_by: activity.created_by,
      assigned_to: userId,
      title: `[Atividade Crítica] ${activity.title} - ${contact.full_name}`,
      description: activity.description || `Health Score de ${contact.full_name} está em ${score.total_score}.`,
      task_type: "other",
      scheduled_at: activity.deadline || new Date().toISOString(),
      status: "pending",
    });

    await supabase.from("critical_activity_assignments").upsert({
      activity_id: activity.id,
      user_id: userId,
      status: "pending",
    }, { onConflict: "activity_id,user_id", ignoreDuplicates: true });

    tasksCreated++;
  }
  return tasksCreated;
}

async function handleContratoVencendo(supabase: any, activity: any) {
  let tasksCreated = 0;
  const daysBeforeExpiry = activity.rule_config?.days_before || 30;
  const categoryId = activity.rule_config?.category_id || "d770d864-4679-4a6d-9620-6844db224dc3";

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysBeforeExpiry);

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, contact_id, owner_id, end_date, product_id, products:product_id(category_id)")
    .eq("status", "active")
    .not("end_date", "is", null)
    .lte("end_date", futureDate.toISOString())
    .gte("end_date", new Date().toISOString());

  if (!contracts?.length) return 0;

  const filtered = contracts.filter((c: any) => c.products?.category_id === categoryId);
  const contactIds = [...new Set(filtered.map((c: any) => c.contact_id))];
  const { data: contacts_info } = await supabase
    .from("contacts")
    .select("id, full_name, owner_id")
    .in("id", contactIds);

  const contactMap = new Map((contacts_info || []).map((c: any) => [c.id, c]));

  for (const contract of filtered) {
    const contact: any = contactMap.get(contract.contact_id);
    if (!contact) continue;
    const userId = contact.owner_id || contract.owner_id;
    if (!userId) continue;

    const endDate = new Date(contract.end_date).toLocaleDateString("pt-BR");
    await supabase.from("tasks").insert({
      created_by: activity.created_by,
      assigned_to: userId,
      title: `[Atividade Crítica] ${activity.title} - ${contact.full_name}`,
      description: activity.description || `Contrato vence em ${endDate}.`,
      task_type: "other",
      scheduled_at: activity.deadline || new Date().toISOString(),
      status: "pending",
    });

    await supabase.from("critical_activity_assignments").upsert({
      activity_id: activity.id,
      user_id: userId,
      status: "pending",
    }, { onConflict: "activity_id,user_id", ignoreDuplicates: true });

    tasksCreated++;
  }
  return tasksCreated;
}
