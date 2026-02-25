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
    whatsapp: { score: number; daysSinceLastMessage: number | null; status: string };
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

// Calculate payment score based on days late (max 30 pts - reduced from 40)
function calculatePaymentScore(daysLate: number): { score: number; status: string } {
  if (daysLate === 0) {
    return { score: 30, status: 'on_time' };
  }
  if (daysLate <= 15) {
    return { score: 22, status: 'late_15' };
  }
  if (daysLate <= 30) {
    return { score: 15, status: 'late_30' };
  }
  if (daysLate <= 60) {
    return { score: 8, status: 'late_60' };
  }
  if (daysLate <= 90) {
    return { score: 4, status: 'late_90' };
  }
  return { score: 0, status: 'late_90_plus' };
}

// Calculate meetings score based on days since last meeting (max 20 pts - reduced from 25)
function calculateMeetingsScore(daysSinceLastMeeting: number | null): number {
  if (daysSinceLastMeeting === null) {
    return 0; // No meetings recorded
  }
  if (daysSinceLastMeeting < 30) {
    return 20;
  }
  if (daysSinceLastMeeting <= 60) {
    return 10;
  }
  if (daysSinceLastMeeting <= 90) {
    return 5;
  }
  return 0;
}

// Calculate cross-sell score based on extra products count
function calculateCrossSellScore(extraProductsCount: number): number {
  return Math.min(extraProductsCount * 5, 15); // Max 15 points (3 products)
}

// Calculate WhatsApp score based on days since last message (max 15 pts - NEW)
function calculateWhatsAppScore(daysSinceLastMessage: number | null): { score: number; status: string } {
  if (daysSinceLastMessage === null) {
    return { score: 0, status: 'no_messages' };
  }
  if (daysSinceLastMessage <= 10) {
    return { score: 15, status: 'excellent' };
  }
  if (daysSinceLastMessage <= 30) {
    return { score: 8, status: 'regular' };
  }
  return { score: 0, status: 'critical' };
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

    const { contactIds, ownerId, ownerIds } = await req.json();

    console.log('Calculating health score for:', { contactIds, ownerId, ownerIds });

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
    } else if (ownerIds && ownerIds.length > 0) {
      query = query.in('owner_id', ownerIds);
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

    // Fetch all related data in parallel (including WhatsApp messages)
    const [
      npsResponses,
      referrals,
      contracts,
      meetings,
      profiles,
      whatsappMessages
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
        .select('user_id, full_name'),

      // WhatsApp messages - latest for each contact
      supabase
        .from('whatsapp_messages')
        .select('contact_id, message_timestamp')
        .in('contact_id', contactIdList)
        .order('message_timestamp', { ascending: false }),
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
        if (contract.vindi_status === 'pending' || contract.vindi_status === 'overdue') {
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

    // WhatsApp last message map
    const lastWhatsAppMap = new Map<string, Date>();
    if (whatsappMessages.data) {
      for (const msg of whatsappMessages.data) {
        if (!lastWhatsAppMap.has(msg.contact_id)) {
          lastWhatsAppMap.set(msg.contact_id, new Date(msg.message_timestamp));
        }
      }
    }

    // Calculate health score for each contact
    const results: HealthScoreResult[] = [];
    const now = new Date();

    for (const contact of contacts) {
      // NPS (max 20 pts)
      const npsValue = npsMap.get(contact.id) ?? null;
      const npsResult = calculateNpsScore(npsValue);
      
      // Referrals (max 15 pts)
      const referralCount = referralCountMap.get(contact.id) || 0;
      const hasReferrals = referralCount > 0;
      const referralsScore = hasReferrals ? 15 : 0;
      
      // Payment (max 30 pts - reduced from 40)
      const contractData = contractsMap.get(contact.id);
      const daysLate = contractData?.daysLate || 0;
      const paymentResult = calculatePaymentScore(daysLate);
      
      // Cross-sell (max 15 pts)
      const productCount = contractData?.productIds.size || 0;
      const extraProductsCount = Math.max(0, productCount - 1);
      const crossSellScore = calculateCrossSellScore(extraProductsCount);
      
      // Meetings (max 20 pts - reduced from 25)
      const lastMeeting = lastMeetingMap.get(contact.id);
      let daysSinceLastMeeting: number | null = null;
      if (lastMeeting) {
        daysSinceLastMeeting = Math.floor((now.getTime() - lastMeeting.getTime()) / (1000 * 60 * 60 * 24));
      }
      const meetingsScore = calculateMeetingsScore(daysSinceLastMeeting);

      // WhatsApp (max 15 pts - NEW)
      const lastWhatsApp = lastWhatsAppMap.get(contact.id);
      let daysSinceLastMessage: number | null = null;
      if (lastWhatsApp) {
        daysSinceLastMessage = Math.floor((now.getTime() - lastWhatsApp.getTime()) / (1000 * 60 * 60 * 24));
      }
      const whatsappResult = calculateWhatsAppScore(daysSinceLastMessage);
      
      // Total score (minimum 0)
      // Max: 20 (NPS) + 15 (Referrals) + 30 (Payment) + 15 (CrossSell) + 20 (Meetings) + 15 (WhatsApp) = 115
      // But with adjusted weights: roughly maintains 0-100 scale
      const totalScore = Math.max(0, 
        npsResult.score + 
        referralsScore + 
        paymentResult.score + 
        crossSellScore + 
        meetingsScore +
        whatsappResult.score
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
          whatsapp: { score: whatsappResult.score, daysSinceLastMessage, status: whatsappResult.status },
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
