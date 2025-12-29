import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthScoreResult {
  contactId: string;
  contactName: string;
  ownerId: string | null;
  ownerName: string | null;
  totalScore: number;
  category: 'otimo' | 'estavel' | 'atencao' | 'critico';
  breakdown: {
    nps: { score: number; value: number | null; status: string };
    referrals: { score: number; hasReferrals: boolean; count: number };
    payment: { score: number; daysLate: number; status: string };
    crossSell: { score: number; extraProductsCount: number };
    meetings: { score: number; daysSinceLastMeeting: number | null };
  };
}

// Calculate NPS score based on value
function calculateNpsScore(npsValue: number | null): { score: number; status: string } {
  if (npsValue === null) {
    return { score: 10, status: 'not_responded' };
  }
  if (npsValue >= 9) {
    return { score: 20, status: 'promoter' };
  }
  if (npsValue >= 7) {
    return { score: 10, status: 'neutral' };
  }
  return { score: -10, status: 'detractor' };
}

// Calculate payment score based on days late
function calculatePaymentScore(daysLate: number): { score: number; status: string } {
  if (daysLate === 0) {
    return { score: 40, status: 'on_time' };
  }
  if (daysLate <= 15) {
    return { score: 30, status: 'late_15' };
  }
  if (daysLate <= 30) {
    return { score: 20, status: 'late_30' };
  }
  if (daysLate <= 60) {
    return { score: 10, status: 'late_60' };
  }
  if (daysLate <= 90) {
    return { score: 5, status: 'late_90' };
  }
  return { score: 0, status: 'late_90_plus' };
}

// Calculate meetings score based on days since last meeting
function calculateMeetingsScore(daysSinceLastMeeting: number | null): number {
  if (daysSinceLastMeeting === null) {
    return 0; // No meetings recorded
  }
  if (daysSinceLastMeeting < 30) {
    return 10;
  }
  if (daysSinceLastMeeting <= 60) {
    return 5;
  }
  return 0;
}

// Calculate cross-sell score based on extra products count
function calculateCrossSellScore(extraProductsCount: number): number {
  return Math.min(extraProductsCount * 5, 15); // Max 15 points (3 products)
}

// Determine category based on total score
function getCategory(totalScore: number): 'otimo' | 'estavel' | 'atencao' | 'critico' {
  if (totalScore >= 75) return 'otimo';
  if (totalScore >= 50) return 'estavel';
  if (totalScore >= 30) return 'atencao';
  return 'critico';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contactIds, ownerId } = await req.json();

    console.log('Calculating health score for:', { contactIds, ownerId });

    // Build query based on parameters
    let query = supabase
      .from('contacts')
      .select(`
        id,
        full_name,
        owner_id,
        client_code
      `)
      .not('client_code', 'is', null); // Only clients (with client_code)

    if (contactIds && contactIds.length > 0) {
      query = query.in('id', contactIds);
    } else if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    const { data: contacts, error: contactsError } = await query;

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      throw contactsError;
    }

    if (!contacts || contacts.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contactIdList = contacts.map(c => c.id);

    // Fetch all related data in parallel
    const [
      npsResponses,
      referrals,
      contracts,
      meetings,
      profiles
    ] = await Promise.all([
      // Latest NPS for each contact
      supabase
        .from('nps_responses')
        .select('contact_id, nps_value, response_date')
        .in('contact_id', contactIdList)
        .order('response_date', { ascending: false }),
      
      // Referrals (contacts that have referred_by pointing to our contacts)
      supabase
        .from('contacts')
        .select('referred_by')
        .in('referred_by', contactIdList),
      
      // Active contracts for each contact
      supabase
        .from('contracts')
        .select('contact_id, product_id, vindi_status, created_at')
        .in('contact_id', contactIdList)
        .eq('status', 'active'),
      
      // Completed meetings for each contact
      supabase
        .from('meetings')
        .select('contact_id, scheduled_at, status')
        .in('contact_id', contactIdList)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false }),
      
      // Owner profiles
      supabase
        .from('profiles')
        .select('user_id, full_name')
    ]);

    // Create lookup maps
    const npsMap = new Map<string, number | null>();
    if (npsResponses.data) {
      for (const nps of npsResponses.data) {
        if (!npsMap.has(nps.contact_id)) {
          npsMap.set(nps.contact_id, nps.nps_value);
        }
      }
    }

    const referralCountMap = new Map<string, number>();
    if (referrals.data) {
      for (const ref of referrals.data) {
        if (ref.referred_by) {
          referralCountMap.set(
            ref.referred_by,
            (referralCountMap.get(ref.referred_by) || 0) + 1
          );
        }
      }
    }

    const contractsMap = new Map<string, { productIds: Set<string>; daysLate: number }>();
    if (contracts.data) {
      for (const contract of contracts.data) {
        const existing = contractsMap.get(contract.contact_id) || { productIds: new Set(), daysLate: 0 };
        existing.productIds.add(contract.product_id);
        
        // Check payment status - simplified logic
        // In real implementation, this would check Vindi API for actual payment status
        if (contract.vindi_status === 'pending' || contract.vindi_status === 'overdue') {
          // Estimate days late based on vindi_status
          const daysLate = contract.vindi_status === 'overdue' ? 30 : 0;
          existing.daysLate = Math.max(existing.daysLate, daysLate);
        }
        
        contractsMap.set(contract.contact_id, existing);
      }
    }

    const lastMeetingMap = new Map<string, Date>();
    if (meetings.data) {
      for (const meeting of meetings.data) {
        if (!lastMeetingMap.has(meeting.contact_id)) {
          lastMeetingMap.set(meeting.contact_id, new Date(meeting.scheduled_at));
        }
      }
    }

    const profilesMap = new Map<string, string>();
    if (profiles.data) {
      for (const profile of profiles.data) {
        profilesMap.set(profile.user_id, profile.full_name);
      }
    }

    // Calculate health score for each contact
    const results: HealthScoreResult[] = [];
    const now = new Date();

    for (const contact of contacts) {
      // NPS
      const npsValue = npsMap.get(contact.id) ?? null;
      const npsResult = calculateNpsScore(npsValue);
      
      // Referrals
      const referralCount = referralCountMap.get(contact.id) || 0;
      const hasReferrals = referralCount > 0;
      const referralsScore = hasReferrals ? 15 : 0;
      
      // Payment
      const contractData = contractsMap.get(contact.id);
      const daysLate = contractData?.daysLate || 0;
      const paymentResult = calculatePaymentScore(daysLate);
      
      // Cross-sell (extra products beyond the main one)
      const productCount = contractData?.productIds.size || 0;
      const extraProductsCount = Math.max(0, productCount - 1);
      const crossSellScore = calculateCrossSellScore(extraProductsCount);
      
      // Meetings
      const lastMeeting = lastMeetingMap.get(contact.id);
      let daysSinceLastMeeting: number | null = null;
      if (lastMeeting) {
        daysSinceLastMeeting = Math.floor((now.getTime() - lastMeeting.getTime()) / (1000 * 60 * 60 * 24));
      }
      const meetingsScore = calculateMeetingsScore(daysSinceLastMeeting);
      
      // Total score (minimum 0)
      const totalScore = Math.max(0, 
        npsResult.score + 
        referralsScore + 
        paymentResult.score + 
        crossSellScore + 
        meetingsScore
      );
      
      const category = getCategory(totalScore);

      results.push({
        contactId: contact.id,
        contactName: contact.full_name,
        ownerId: contact.owner_id,
        ownerName: contact.owner_id ? profilesMap.get(contact.owner_id) || null : null,
        totalScore,
        category,
        breakdown: {
          nps: { score: npsResult.score, value: npsValue, status: npsResult.status },
          referrals: { score: referralsScore, hasReferrals, count: referralCount },
          payment: { score: paymentResult.score, daysLate, status: paymentResult.status },
          crossSell: { score: crossSellScore, extraProductsCount },
          meetings: { score: meetingsScore, daysSinceLastMeeting },
        },
      });
    }

    // Calculate summary stats
    const summary = {
      totalClients: results.length,
      averageScore: results.length > 0 
        ? Math.round(results.reduce((sum, r) => sum + r.totalScore, 0) / results.length)
        : 0,
      byCategory: {
        otimo: results.filter(r => r.category === 'otimo').length,
        estavel: results.filter(r => r.category === 'estavel').length,
        atencao: results.filter(r => r.category === 'atencao').length,
        critico: results.filter(r => r.category === 'critico').length,
      },
    };

    console.log('Health score calculation complete:', { 
      totalClients: results.length, 
      averageScore: summary.averageScore 
    });

    return new Response(JSON.stringify({ results, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error calculating health score:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
