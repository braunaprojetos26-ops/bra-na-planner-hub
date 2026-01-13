import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActingUser } from '@/contexts/ActingUserContext';
import { startOfMonth, endOfMonth, subMonths, format, differenceInMonths, parseISO } from 'date-fns';

interface NpsFilters {
  startDate: Date | null;
  endDate: Date | null;
  ownerId: string | null;
  productId: string | null;
}

interface NpsMetrics {
  npsScore: number;
  totalResponses: number;
  promoters: number;
  promotersPercent: number;
  passives: number;
  passivesPercent: number;
  detractors: number;
  detractorsPercent: number;
  averageScore: number;
  responseRate: number;
}

interface NpsDistribution {
  score: number;
  count: number;
  category: 'detractor' | 'passive' | 'promoter';
}

interface NpsTimeSeries {
  month: string;
  npsScore: number;
  responses: number;
}

interface NpsByOwner {
  ownerId: string;
  ownerName: string;
  totalClients: number;
  responses: number;
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
  responseRate: number;
}

interface NpsByTenure {
  tenure: string;
  tenureLabel: string;
  npsScore: number;
  responses: number;
}

interface NpsVsChurn {
  category: string;
  npsScore: number;
  count: number;
}

export function useNpsAnalytics(filters: NpsFilters) {
  const { actingUser } = useActingUser();

  return useQuery({
    queryKey: ['nps-analytics', filters, actingUser?.id],
    queryFn: async () => {
      // Fetch NPS responses with related data
      let query = supabase
        .from('nps_responses')
        .select(`
          id,
          nps_value,
          response_date,
          contact_id,
          contacts!inner (
            id,
            full_name,
            owner_id,
            profiles:owner_id (
              user_id,
              full_name
            )
          )
        `);

      if (filters.startDate) {
        query = query.gte('response_date', format(filters.startDate, 'yyyy-MM-dd'));
      }
      if (filters.endDate) {
        query = query.lte('response_date', format(filters.endDate, 'yyyy-MM-dd'));
      }
      if (filters.ownerId) {
        query = query.eq('contacts.owner_id', filters.ownerId);
      }

      const { data: npsResponses, error: npsError } = await query;
      if (npsError) throw npsError;

      // Fetch contracts for tenure analysis
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, contact_id, start_date, status, product_id');
      if (contractsError) throw contractsError;

      // Fetch cancellations for NPS vs Churn
      const { data: cancellations, error: cancellationsError } = await supabase
        .from('contract_cancellations')
        .select('contract_id, contracts!inner(contact_id)');
      if (cancellationsError) throw cancellationsError;

      // Fetch total active clients for response rate
      const { count: totalClients } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Filter by product if specified
      let filteredResponses = npsResponses || [];
      if (filters.productId) {
        const contactsWithProduct = contracts
          ?.filter(c => c.product_id === filters.productId)
          .map(c => c.contact_id) || [];
        filteredResponses = filteredResponses.filter(r => 
          contactsWithProduct.includes(r.contact_id)
        );
      }

      // Calculate metrics
      const metrics = calculateMetrics(filteredResponses, totalClients || 0);
      const distribution = calculateDistribution(filteredResponses);
      const timeSeries = calculateTimeSeries(filteredResponses);
      const byOwner = calculateByOwner(filteredResponses, contracts || []);
      const byTenure = calculateByTenure(filteredResponses, contracts || []);
      const vsChurn = calculateVsChurn(npsResponses || [], cancellations || [], contracts || []);

      return {
        metrics,
        distribution,
        timeSeries,
        byOwner,
        byTenure,
        vsChurn,
        hasData: filteredResponses.length > 0,
    };
    },
    enabled: true,
  });
}

function calculateMetrics(responses: any[], totalClients: number): NpsMetrics {
  if (responses.length === 0) {
    return {
      npsScore: 0,
      totalResponses: 0,
      promoters: 0,
      promotersPercent: 0,
      passives: 0,
      passivesPercent: 0,
      detractors: 0,
      detractorsPercent: 0,
      averageScore: 0,
      responseRate: 0,
    };
  }

  const promoters = responses.filter(r => r.nps_value >= 9).length;
  const passives = responses.filter(r => r.nps_value >= 7 && r.nps_value <= 8).length;
  const detractors = responses.filter(r => r.nps_value <= 6).length;
  const total = responses.length;

  const promotersPercent = (promoters / total) * 100;
  const passivesPercent = (passives / total) * 100;
  const detractorsPercent = (detractors / total) * 100;
  const npsScore = Math.round(promotersPercent - detractorsPercent);

  const averageScore = responses.reduce((sum, r) => sum + r.nps_value, 0) / total;
  const responseRate = totalClients > 0 ? (total / totalClients) * 100 : 0;

  return {
    npsScore,
    totalResponses: total,
    promoters,
    promotersPercent: Math.round(promotersPercent),
    passives,
    passivesPercent: Math.round(passivesPercent),
    detractors,
    detractorsPercent: Math.round(detractorsPercent),
    averageScore: Math.round(averageScore * 10) / 10,
    responseRate: Math.round(responseRate),
  };
}

function calculateDistribution(responses: any[]): NpsDistribution[] {
  const distribution: NpsDistribution[] = [];
  
  for (let score = 0; score <= 10; score++) {
    const count = responses.filter(r => r.nps_value === score).length;
    let category: 'detractor' | 'passive' | 'promoter';
    if (score <= 6) category = 'detractor';
    else if (score <= 8) category = 'passive';
    else category = 'promoter';
    
    distribution.push({ score, count, category });
  }
  
  return distribution;
}

function calculateTimeSeries(responses: any[]): NpsTimeSeries[] {
  const byMonth: Record<string, any[]> = {};
  
  responses.forEach(r => {
    const month = format(parseISO(r.response_date), 'yyyy-MM');
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(r);
  });

  return Object.entries(byMonth)
    .map(([month, monthResponses]) => {
      const promoters = monthResponses.filter(r => r.nps_value >= 9).length;
      const detractors = monthResponses.filter(r => r.nps_value <= 6).length;
      const total = monthResponses.length;
      const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

      return {
        month,
        npsScore,
        responses: total,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

function calculateByOwner(responses: any[], contracts: any[]): NpsByOwner[] {
  const byOwner: Record<string, { responses: any[]; ownerName: string }> = {};
  
  responses.forEach(r => {
    const ownerId = r.contacts?.owner_id;
    const ownerName = r.contacts?.profiles?.full_name || 'Sem responsável';
    if (!ownerId) return;
    
    if (!byOwner[ownerId]) {
      byOwner[ownerId] = { responses: [], ownerName };
    }
    byOwner[ownerId].responses.push(r);
  });

  // Count total clients per owner
  const clientsPerOwner: Record<string, Set<string>> = {};
  contracts.forEach(c => {
    if (!c.contact_id) return;
    // Get owner from responses data
    const response = responses.find(r => r.contact_id === c.contact_id);
    const ownerId = response?.contacts?.owner_id;
    if (ownerId) {
      if (!clientsPerOwner[ownerId]) clientsPerOwner[ownerId] = new Set();
      clientsPerOwner[ownerId].add(c.contact_id);
    }
  });

  return Object.entries(byOwner).map(([ownerId, data]) => {
    const promoters = data.responses.filter(r => r.nps_value >= 9).length;
    const passives = data.responses.filter(r => r.nps_value >= 7 && r.nps_value <= 8).length;
    const detractors = data.responses.filter(r => r.nps_value <= 6).length;
    const total = data.responses.length;
    const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
    const totalClients = clientsPerOwner[ownerId]?.size || 0;

    return {
      ownerId,
      ownerName: data.ownerName,
      totalClients,
      responses: total,
      npsScore,
      promoters,
      passives,
      detractors,
      responseRate: totalClients > 0 ? Math.round((total / totalClients) * 100) : 0,
    };
  }).sort((a, b) => b.npsScore - a.npsScore);
}

function calculateByTenure(responses: any[], contracts: any[]): NpsByTenure[] {
  const now = new Date();
  const tenureGroups = {
    new: { label: 'Novos (< 3 meses)', responses: [] as any[] },
    mid: { label: 'Em andamento (3-9 meses)', responses: [] as any[] },
    mature: { label: 'Maduros (> 9 meses)', responses: [] as any[] },
  };

  responses.forEach(r => {
    const contract = contracts.find(c => c.contact_id === r.contact_id && c.start_date);
    if (!contract?.start_date) return;

    const months = differenceInMonths(now, parseISO(contract.start_date));
    
    if (months < 3) {
      tenureGroups.new.responses.push(r);
    } else if (months < 9) {
      tenureGroups.mid.responses.push(r);
    } else {
      tenureGroups.mature.responses.push(r);
    }
  });

  return Object.entries(tenureGroups).map(([tenure, data]) => {
    const promoters = data.responses.filter(r => r.nps_value >= 9).length;
    const detractors = data.responses.filter(r => r.nps_value <= 6).length;
    const total = data.responses.length;
    const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    return {
      tenure,
      tenureLabel: data.label,
      npsScore,
      responses: total,
    };
  });
}

function calculateVsChurn(responses: any[], cancellations: any[], contracts: any[]): NpsVsChurn[] {
  const cancelledContactIds = new Set(
    cancellations.map(c => (c.contracts as any)?.contact_id).filter(Boolean)
  );

  const activeResponses = responses.filter(r => !cancelledContactIds.has(r.contact_id));
  const churnedResponses = responses.filter(r => cancelledContactIds.has(r.contact_id));

  const calculateNps = (resps: any[]) => {
    if (resps.length === 0) return 0;
    const promoters = resps.filter(r => r.nps_value >= 9).length;
    const detractors = resps.filter(r => r.nps_value <= 6).length;
    return Math.round(((promoters - detractors) / resps.length) * 100);
  };

  return [
    { category: 'Clientes Ativos', npsScore: calculateNps(activeResponses), count: activeResponses.length },
    { category: 'Clientes que Cancelaram', npsScore: calculateNps(churnedResponses), count: churnedResponses.length },
  ];
}

export function useNpsFilterOptions() {
  return useQuery({
    queryKey: ['nps-filter-options'],
    queryFn: async () => {
      const [{ data: owners }, { data: products }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').order('full_name'),
        supabase.from('products').select('id, name').eq('is_active', true).order('name'),
      ]);

      return {
        owners: owners || [],
        products: products || [],
      };
    },
  });
}
