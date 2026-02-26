import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[check-sla-breaches] Starting SLA breach check...');

    // Get all active funnel stages with SLA configured
    const { data: stages, error: stagesError } = await supabase
      .from('funnel_stages')
      .select('id, name, sla_hours, funnel_id, funnels!inner(name)')
      .not('sla_hours', 'is', null)
      .gt('sla_hours', 0);

    if (stagesError) {
      console.error('[check-sla-breaches] Error fetching stages:', stagesError);
      throw stagesError;
    }

    if (!stages || stages.length === 0) {
      console.log('[check-sla-breaches] No stages with SLA configured.');
      return new Response(JSON.stringify({ message: 'No SLA stages found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stageIds = stages.map(s => s.id);
    const stageMap = new Map(stages.map(s => [s.id, s]));

    // Get all in-progress opportunities in SLA-configured stages
    const { data: opportunities, error: oppsError } = await supabase
      .from('opportunities')
      .select('id, contact_id, current_stage_id, stage_entered_at, contacts!inner(full_name, owner_id)')
      .eq('status', 'active')
      .in('current_stage_id', stageIds);

    if (oppsError) {
      console.error('[check-sla-breaches] Error fetching opportunities:', oppsError);
      throw oppsError;
    }

    if (!opportunities || opportunities.length === 0) {
      console.log('[check-sla-breaches] No opportunities in SLA stages.');
      return new Response(JSON.stringify({ message: 'No opportunities to check' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    let notificationsCreated = 0;

    for (const opp of opportunities) {
      const stage = stageMap.get(opp.current_stage_id);
      if (!stage || !stage.sla_hours) continue;

      const enteredAt = new Date(opp.stage_entered_at);
      const hoursInStage = (now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60);

      if (hoursInStage <= stage.sla_hours) continue;

      // SLA breached - check if we already sent a notification today
      const ownerId = (opp.contacts as any)?.owner_id;
      if (!ownerId) continue;

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', ownerId)
        .eq('type', 'sla_breach')
        .eq('link', `/pipeline/${opp.id}`)
        .gte('created_at', todayStart.toISOString())
        .limit(1);

      if (existingNotif && existingNotif.length > 0) continue;

      const contactName = (opp.contacts as any)?.full_name || 'Contato';
      const funnelName = (stage as any).funnels?.name || 'Funil';
      const hoursOverdue = Math.round(hoursInStage - stage.sla_hours);

      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: ownerId,
          type: 'sla_breach',
          title: `SLA estourado: ${contactName}`,
          message: `${contactName} está há ${Math.round(hoursInStage)}h na etapa "${stage.name}" do funil "${funnelName}" (SLA: ${stage.sla_hours}h, excedido em ${hoursOverdue}h).`,
          link: `/pipeline/${opp.id}`,
          is_read: false,
        });

      if (insertError) {
        console.error(`[check-sla-breaches] Error inserting notification for opp ${opp.id}:`, insertError);
      } else {
        notificationsCreated++;
      }
    }

    console.log(`[check-sla-breaches] Done. Created ${notificationsCreated} notifications.`);

    return new Response(
      JSON.stringify({ message: `Created ${notificationsCreated} SLA breach notifications` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[check-sla-breaches] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
