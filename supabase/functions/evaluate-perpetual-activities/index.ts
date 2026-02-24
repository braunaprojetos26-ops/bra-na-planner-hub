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

    // Get all active perpetual activities
    const { data: activities, error: actErr } = await supabase
      .from("critical_activities")
      .select("*")
      .eq("is_perpetual", true)
      .eq("is_active", true);

    if (actErr) throw actErr;

    const results: Record<string, number> = {};

    for (const activity of activities || []) {
      let tasksCreated = 0;

      if (activity.rule_type === "inadimplente") {
        tasksCreated = await handleInadimplente(supabase, activity);
      } else if (activity.rule_type === "health_score_critico") {
        tasksCreated = await handleHealthScoreCritico(supabase, activity);
      } else if (activity.rule_type === "contrato_vencendo") {
        tasksCreated = await handleContratoVencendo(supabase, activity);
      } else if (activity.rule_type === "manual_recurrence") {
        tasksCreated = await handleManualRecurrence(supabase, activity);
      }

      // Update last_run_at
      await supabase
        .from("critical_activities")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", activity.id);

      results[activity.title] = tasksCreated;
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error evaluating perpetual activities:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleInadimplente(supabase: any, activity: any) {
  let tasksCreated = 0;

  // Find contracts with vindi_status indicating overdue
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, contact_id, owner_id, product_id, vindi_status")
    .eq("status", "active")
    .not("vindi_subscription_id", "is", null);

  if (!contracts?.length) return 0;

  // Get contacts info
  const contactIds = [...new Set(contracts.map((c: any) => c.contact_id))];
  const { data: contacts_info } = await supabase
    .from("contacts")
    .select("id, full_name, owner_id")
    .in("id", contactIds);

  const contactMap = new Map(
    (contacts_info || []).map((c: any) => [c.id, c])
  );

  for (const contract of contracts) {
    // Check vindi_status for overdue indicators
    const status = (contract.vindi_status || "").toLowerCase();
    if (!status.includes("overdue") && !status.includes("canceled") && status !== "past_due") {
      continue;
    }

    const contact: any = contactMap.get(contract.contact_id);
    if (!contact) continue;

    const userId = contact.owner_id || contract.owner_id;
    if (!userId) continue;

    // Check if trigger already exists and is not resolved
    const { data: existing } = await supabase
      .from("perpetual_activity_triggers")
      .select("id, resolved_at")
      .eq("activity_id", activity.id)
      .eq("user_id", userId)
      .eq("contact_id", contract.contact_id)
      .maybeSingle();

    if (existing && !existing.resolved_at) continue;

    // Create task
    const { data: task } = await supabase
      .from("tasks")
      .insert({
        created_by: activity.created_by,
        assigned_to: userId,
        title: `[Atividade Crítica] ${activity.title} - ${contact.full_name}`,
        description: activity.description || `Cliente ${contact.full_name} está inadimplente.`,
        task_type: "other",
        scheduled_at: new Date().toISOString(),
        status: "pending",
      })
      .select("id")
      .single();

    // Create/update trigger record
    if (existing) {
      await supabase
        .from("perpetual_activity_triggers")
        .update({
          resolved_at: null,
          triggered_at: new Date().toISOString(),
          task_id: task?.id || null,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("perpetual_activity_triggers").insert({
        activity_id: activity.id,
        user_id: userId,
        contact_id: contract.contact_id,
        task_id: task?.id || null,
      });
    }

    tasksCreated++;
  }

  return tasksCreated;
}

async function handleHealthScoreCritico(supabase: any, activity: any) {
  let tasksCreated = 0;
  const threshold = activity.rule_config?.threshold || 40;

  // Get latest health scores below threshold
  const { data: scores } = await supabase
    .from("health_score_snapshots")
    .select("contact_id, owner_id, total_score, snapshot_date")
    .lt("total_score", threshold)
    .order("snapshot_date", { ascending: false });

  if (!scores?.length) return 0;

  // Deduplicate by contact (keep latest)
  const seenContacts = new Set<string>();
  const uniqueScores = [];
  for (const s of scores) {
    if (!seenContacts.has(s.contact_id)) {
      seenContacts.add(s.contact_id);
      uniqueScores.push(s);
    }
  }

  // Get contact names
  const contactIds = uniqueScores.map((s) => s.contact_id);
  const { data: contacts_info } = await supabase
    .from("contacts")
    .select("id, full_name, owner_id")
    .in("id", contactIds);

  const contactMap = new Map(
    (contacts_info || []).map((c: any) => [c.id, c])
  );

  for (const score of uniqueScores) {
    const contact: any = contactMap.get(score.contact_id);
    if (!contact) continue;

    const userId = contact.owner_id || score.owner_id;
    if (!userId) continue;

    const { data: existing } = await supabase
      .from("perpetual_activity_triggers")
      .select("id, resolved_at")
      .eq("activity_id", activity.id)
      .eq("user_id", userId)
      .eq("contact_id", score.contact_id)
      .maybeSingle();

    if (existing && !existing.resolved_at) continue;

    const { data: task } = await supabase
      .from("tasks")
      .insert({
        created_by: activity.created_by,
        assigned_to: userId,
        title: `[Atividade Crítica] ${activity.title} - ${contact.full_name}`,
        description:
          activity.description ||
          `Health Score de ${contact.full_name} está em ${score.total_score} (abaixo de ${threshold}).`,
        task_type: "other",
        scheduled_at: new Date().toISOString(),
        status: "pending",
      })
      .select("id")
      .single();

    if (existing) {
      await supabase
        .from("perpetual_activity_triggers")
        .update({
          resolved_at: null,
          triggered_at: new Date().toISOString(),
          task_id: task?.id || null,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("perpetual_activity_triggers").insert({
        activity_id: activity.id,
        user_id: userId,
        contact_id: score.contact_id,
        task_id: task?.id || null,
      });
    }

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

  // Find active contracts expiring within the window
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, contact_id, owner_id, end_date, product_id, products:product_id(category_id)")
    .eq("status", "active")
    .not("end_date", "is", null)
    .lte("end_date", futureDate.toISOString())
    .gte("end_date", new Date().toISOString());

  if (!contracts?.length) return 0;

  // Filter by category
  const filtered = contracts.filter(
    (c: any) => c.products?.category_id === categoryId
  );

  const contactIds = [...new Set(filtered.map((c: any) => c.contact_id))];
  const { data: contacts_info } = await supabase
    .from("contacts")
    .select("id, full_name, owner_id")
    .in("id", contactIds);

  const contactMap = new Map(
    (contacts_info || []).map((c: any) => [c.id, c])
  );

  for (const contract of filtered) {
    const contact: any = contactMap.get(contract.contact_id);
    if (!contact) continue;

    const userId = contact.owner_id || contract.owner_id;
    if (!userId) continue;

    const { data: existing } = await supabase
      .from("perpetual_activity_triggers")
      .select("id, resolved_at")
      .eq("activity_id", activity.id)
      .eq("user_id", userId)
      .eq("contact_id", contract.contact_id)
      .maybeSingle();

    if (existing && !existing.resolved_at) continue;

    const endDate = new Date(contract.end_date).toLocaleDateString("pt-BR");
    const { data: task } = await supabase
      .from("tasks")
      .insert({
        created_by: activity.created_by,
        assigned_to: userId,
        title: `[Atividade Crítica] ${activity.title} - ${contact.full_name}`,
        description:
          activity.description ||
          `Contrato de ${contact.full_name} vence em ${endDate}. Iniciar processo de renovação.`,
        task_type: "other",
        scheduled_at: new Date().toISOString(),
        status: "pending",
      })
      .select("id")
      .single();

    if (existing) {
      await supabase
        .from("perpetual_activity_triggers")
        .update({
          resolved_at: null,
          triggered_at: new Date().toISOString(),
          task_id: task?.id || null,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("perpetual_activity_triggers").insert({
        activity_id: activity.id,
        user_id: userId,
        contact_id: contract.contact_id,
        task_id: task?.id || null,
      });
    }

    tasksCreated++;
  }

  return tasksCreated;
}

async function handleManualRecurrence(supabase: any, activity: any) {
  // For manual recurrence, distribute to all target users (like original)
  // but only if enough time has passed since last run
  const interval = activity.recurrence_interval;
  const lastRun = activity.last_run_at
    ? new Date(activity.last_run_at)
    : null;

  if (lastRun) {
    const now = new Date();
    const diffMs = now.getTime() - lastRun.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (interval === "daily" && diffDays < 1) return 0;
    if (interval === "weekly" && diffDays < 7) return 0;
    if (interval === "monthly" && diffDays < 28) return 0;
  }

  // Use the existing distribute function
  const { data: count, error } = await supabase.rpc(
    "distribute_critical_activity",
    { p_activity_id: activity.id }
  );

  if (error) {
    console.error("Error distributing recurrence:", error);
    return 0;
  }

  return count || 0;
}
