import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting renewal opportunities check...');

    // Get the renewal funnel
    const { data: renewalFunnel, error: funnelError } = await supabase
      .from('funnels')
      .select('id')
      .eq('name', 'RENOVAÇÃO - PLANEJAMENTO')
      .eq('is_active', true)
      .single();

    if (funnelError || !renewalFunnel) {
      console.error('Renewal funnel not found:', funnelError);
      return new Response(
        JSON.stringify({ error: 'Renewal funnel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get first stage of the renewal funnel
    const { data: firstStage, error: stageError } = await supabase
      .from('funnel_stages')
      .select('id')
      .eq('funnel_id', renewalFunnel.id)
      .order('order_position', { ascending: true })
      .limit(1)
      .single();

    if (stageError || !firstStage) {
      console.error('First stage not found:', stageError);
      return new Response(
        JSON.stringify({ error: 'First stage not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate date 30 days from now (11 months after start = 1 month before end)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const targetDate = thirtyDaysFromNow.toISOString().split('T')[0];

    // First, get the product ID for "Planejamento Financeiro Completo"
    const { data: planningProduct, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('name', 'Planejamento Financeiro Completo')
      .eq('is_active', true)
      .maybeSingle();

    if (productError) {
      console.error('Error fetching product:', productError);
      return new Response(
        JSON.stringify({ error: 'Error fetching product' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!planningProduct) {
      console.log('Product "Planejamento Financeiro Completo" not found or inactive');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Product not found',
          opportunitiesCreated: 0,
          notificationsCreated: 0,
          plansChecked: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found product ID: ${planningProduct.id}`);

    // Get active client plans ending in approximately 30 days
    // Only for contracts with the "Planejamento Financeiro Completo" product
    const { data: plansEndingSoon, error: plansError } = await supabase
      .from('client_plans')
      .select(`
        id,
        contact_id,
        owner_id,
        end_date,
        contacts!inner(full_name, owner_id),
        contracts!inner(product_id)
      `)
      .eq('status', 'active')
      .eq('contracts.product_id', planningProduct.id)
      .lte('end_date', targetDate)
      .gte('end_date', new Date().toISOString().split('T')[0]);

    if (plansError) {
      console.error('Error fetching plans:', plansError);
      return new Response(
        JSON.stringify({ error: 'Error fetching plans' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${plansEndingSoon?.length || 0} plans ending soon`);

    let opportunitiesCreated = 0;
    let notificationsCreated = 0;

    for (const plan of plansEndingSoon || []) {
      // Check if renewal opportunity already exists for this plan
      const { data: existingRenewal } = await supabase
        .from('renewal_opportunities_created')
        .select('id')
        .eq('client_plan_id', plan.id)
        .single();

      if (existingRenewal) {
        console.log(`Renewal already exists for plan ${plan.id}`);
        continue;
      }

      // Check if there's already an active opportunity in renewal funnel for this contact
      const { data: existingOpportunity } = await supabase
        .from('opportunities')
        .select('id')
        .eq('contact_id', plan.contact_id)
        .eq('current_funnel_id', renewalFunnel.id)
        .eq('status', 'active')
        .single();

      if (existingOpportunity) {
        console.log(`Active renewal opportunity already exists for contact ${plan.contact_id}`);
        continue;
      }

      const ownerId = plan.owner_id;

      // Create the renewal opportunity
      const { data: newOpportunity, error: oppError } = await supabase
        .from('opportunities')
        .insert({
          contact_id: plan.contact_id,
          current_funnel_id: renewalFunnel.id,
          current_stage_id: firstStage.id,
          created_by: ownerId,
          status: 'active',
          notes: `Oportunidade de renovação criada automaticamente. Contrato termina em ${plan.end_date}.`,
        })
        .select('id')
        .single();

      if (oppError) {
        console.error(`Error creating opportunity for plan ${plan.id}:`, oppError);
        continue;
      }

      console.log(`Created opportunity ${newOpportunity.id} for plan ${plan.id}`);
      opportunitiesCreated++;

      // Track that we created this renewal
      await supabase
        .from('renewal_opportunities_created')
        .insert({
          client_plan_id: plan.id,
          opportunity_id: newOpportunity.id,
        });

      // Create notification for the owner
      const contactName = (plan.contacts as any)?.full_name || 'Cliente';
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: ownerId,
          title: 'Oportunidade de Renovação',
          message: `O contrato de ${contactName} está próximo do vencimento. Uma oportunidade de renovação foi criada.`,
          type: 'renewal',
          link: `/pipeline/${newOpportunity.id}`,
        });

      if (notifError) {
        console.error(`Error creating notification:`, notifError);
      } else {
        notificationsCreated++;
      }
    }

    console.log(`Completed. Created ${opportunitiesCreated} opportunities and ${notificationsCreated} notifications.`);

    return new Response(
      JSON.stringify({
        success: true,
        opportunitiesCreated,
        notificationsCreated,
        plansChecked: plansEndingSoon?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in check-renewal-opportunities:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
