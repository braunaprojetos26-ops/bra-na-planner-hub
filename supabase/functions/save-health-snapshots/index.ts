import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthScoreData {
  contact_id: string;
  owner_id: string | null;
  snapshot_date: string;
  total_score: number;
  category: string;
  nps_score: number;
  nps_value: number | null;
  meetings_score: number;
  days_since_last_meeting: number | null;
  payment_score: number;
  payment_days_late: number;
  cross_sell_score: number;
  extra_products_count: number;
  referrals_score: number;
  has_referrals: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`[save-health-snapshots] Starting snapshot generation for ${today}`);

    // Check if snapshots already exist for today
    const { count: existingCount } = await supabase
      .from('health_score_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('snapshot_date', today);

    if (existingCount && existingCount > 0) {
      console.log(`[save-health-snapshots] Snapshots already exist for ${today}, skipping`);
      return new Response(
        JSON.stringify({ message: 'Snapshots already exist for today', date: today }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active client plans (these are our "clients" for health score)
    const { data: clientPlans, error: plansError } = await supabase
      .from('client_plans')
      .select(`
        id,
        contact_id,
        owner_id,
        contacts!inner(id, full_name)
      `)
      .eq('status', 'active');

    if (plansError) {
      console.error('[save-health-snapshots] Error fetching client plans:', plansError);
      throw plansError;
    }

    if (!clientPlans || clientPlans.length === 0) {
      console.log('[save-health-snapshots] No active client plans found');
      return new Response(
        JSON.stringify({ message: 'No active client plans found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[save-health-snapshots] Processing ${clientPlans.length} clients`);

    const contactIds = clientPlans.map(cp => cp.contact_id);

    // Fetch all required data in parallel
    const [npsResult, meetingsResult, contractsResult, referralsResult] = await Promise.all([
      // Latest NPS for each contact
      supabase
        .from('nps_responses')
        .select('contact_id, nps_value, response_date')
        .in('contact_id', contactIds)
        .order('response_date', { ascending: false }),
      
      // Latest completed meeting for each contact
      supabase
        .from('meetings')
        .select('contact_id, scheduled_at')
        .in('contact_id', contactIds)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false }),
      
      // Active contracts for cross-sell counting
      supabase
        .from('contracts')
        .select('contact_id, product_id')
        .in('contact_id', contactIds)
        .eq('status', 'active'),
      
      // Referrals (contacts that referred others)
      supabase
        .from('contacts')
        .select('referred_by')
        .not('referred_by', 'is', null)
    ]);

    // Build lookup maps
    const npsMap = new Map<string, { value: number; date: string }>();
    npsResult.data?.forEach(nps => {
      if (!npsMap.has(nps.contact_id)) {
        npsMap.set(nps.contact_id, { value: nps.nps_value, date: nps.response_date });
      }
    });

    const meetingsMap = new Map<string, Date>();
    meetingsResult.data?.forEach(meeting => {
      if (!meetingsMap.has(meeting.contact_id)) {
        meetingsMap.set(meeting.contact_id, new Date(meeting.scheduled_at));
      }
    });

    const contractsCountMap = new Map<string, number>();
    contractsResult.data?.forEach(contract => {
      contractsCountMap.set(
        contract.contact_id, 
        (contractsCountMap.get(contract.contact_id) || 0) + 1
      );
    });

    const referrersSet = new Set(
      referralsResult.data?.map(r => r.referred_by).filter(Boolean) || []
    );

    // Calculate health scores
    const snapshots: HealthScoreData[] = [];
    const now = new Date();

    for (const plan of clientPlans) {
      const contactId = plan.contact_id;

      // NPS Score (25 points max)
      const npsData = npsMap.get(contactId);
      let npsScore = 0;
      let npsValue: number | null = null;
      
      if (npsData) {
        npsValue = npsData.value;
        if (npsValue >= 9) npsScore = 25;
        else if (npsValue >= 7) npsScore = 15;
        else if (npsValue >= 5) npsScore = 5;
        else npsScore = 0;
      }

      // Meetings Score (25 points max)
      const lastMeeting = meetingsMap.get(contactId);
      let meetingsScore = 0;
      let daysSinceLastMeeting: number | null = null;

      if (lastMeeting) {
        daysSinceLastMeeting = Math.floor((now.getTime() - lastMeeting.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastMeeting <= 30) meetingsScore = 25;
        else if (daysSinceLastMeeting <= 60) meetingsScore = 20;
        else if (daysSinceLastMeeting <= 90) meetingsScore = 15;
        else if (daysSinceLastMeeting <= 180) meetingsScore = 10;
        else if (daysSinceLastMeeting <= 365) meetingsScore = 5;
        else meetingsScore = 0;
      }

      // Payment Score (20 points max) - simplified, assuming on time
      const paymentScore = 20;
      const paymentDaysLate = 0;

      // Cross-sell Score (15 points max)
      const contractsCount = contractsCountMap.get(contactId) || 0;
      const extraProductsCount = Math.max(0, contractsCount - 1);
      let crossSellScore = 0;
      if (extraProductsCount >= 3) crossSellScore = 15;
      else if (extraProductsCount === 2) crossSellScore = 10;
      else if (extraProductsCount === 1) crossSellScore = 5;

      // Referrals Score (15 points max)
      const hasReferrals = referrersSet.has(contactId);
      const referralsScore = hasReferrals ? 15 : 0;

      // Total Score
      const totalScore = npsScore + meetingsScore + paymentScore + crossSellScore + referralsScore;

      // Category
      let category: string;
      if (totalScore >= 75) category = 'otimo';
      else if (totalScore >= 50) category = 'estavel';
      else if (totalScore >= 30) category = 'atencao';
      else category = 'critico';

      snapshots.push({
        contact_id: contactId,
        owner_id: plan.owner_id,
        snapshot_date: today,
        total_score: totalScore,
        category,
        nps_score: npsScore,
        nps_value: npsValue,
        meetings_score: meetingsScore,
        days_since_last_meeting: daysSinceLastMeeting,
        payment_score: paymentScore,
        payment_days_late: paymentDaysLate,
        cross_sell_score: crossSellScore,
        extra_products_count: extraProductsCount,
        referrals_score: referralsScore,
        has_referrals: hasReferrals,
      });
    }

    // Insert snapshots in batches of 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < snapshots.length; i += batchSize) {
      const batch = snapshots.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('health_score_snapshots')
        .insert(batch);

      if (insertError) {
        console.error(`[save-health-snapshots] Error inserting batch ${i / batchSize}:`, insertError);
        throw insertError;
      }

      insertedCount += batch.length;
    }

    console.log(`[save-health-snapshots] Successfully saved ${insertedCount} snapshots for ${today}`);

    return new Response(
      JSON.stringify({ 
        message: 'Snapshots saved successfully', 
        date: today,
        count: insertedCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[save-health-snapshots] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
