import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, differenceInDays, differenceInHours, parseISO, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  funnelId?: string;
  productId?: string;
}

export interface TimeSeriesPoint {
  date: string;
  label: string;
  created: number;
  won: number;
  lost: number;
  valueWon: number;
  valueLost: number;
}

export interface StageData {
  id: string;
  name: string;
  color: string;
  count: number;
  position: number;
}

export interface LostReasonData {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

export interface FunnelComparisonData {
  id: string;
  name: string;
  total: number;
  won: number;
  lost: number;
  conversionRate: number;
}

export interface AnalyticsData {
  totalCreated: number;
  totalWon: number;
  totalLost: number;
  totalActive: number;
  conversionRate: number;
  totalValueConverted: number;
  totalValueLost: number;
  averageTicket: number;
  averageClosingHours: number;
  timeSeriesData: TimeSeriesPoint[];
  funnelStagesData: StageData[];
  lostReasonsData: LostReasonData[];
  funnelComparisonData: FunnelComparisonData[];
}

export function useAnalytics(filters: AnalyticsFilters) {
  const { startDate, endDate, funnelId, productId } = filters;

  // Fetch opportunities within the date range
  const { data: opportunities = [], isLoading: loadingOpportunities } = useQuery({
    queryKey: ['analytics-opportunities', startDate.toISOString(), endDate.toISOString(), funnelId],
    queryFn: async () => {
      let query = supabase
        .from('opportunities')
        .select(`
          id,
          status,
          proposal_value,
          created_at,
          converted_at,
          lost_at,
          current_funnel_id,
          current_stage_id,
          lost_reason_id,
          contact:contacts!inner(id, owner_id)
        `)
        .gte('created_at', startOfDay(startDate).toISOString())
        .lte('created_at', endOfDay(endDate).toISOString());

      if (funnelId) {
        query = query.eq('current_funnel_id', funnelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch contracts for value calculations
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['analytics-contracts', startDate.toISOString(), endDate.toISOString(), productId],
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select('id, contract_value, opportunity_id, product_id, created_at')
        .gte('created_at', startOfDay(startDate).toISOString())
        .lte('created_at', endOfDay(endDate).toISOString());

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch funnel stages
  const { data: funnelStages = [], isLoading: loadingStages } = useQuery({
    queryKey: ['analytics-funnel-stages', funnelId],
    queryFn: async () => {
      let query = supabase
        .from('funnel_stages')
        .select('id, name, color, order_position, funnel_id')
        .order('order_position');

      if (funnelId) {
        query = query.eq('funnel_id', funnelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch lost reasons
  const { data: lostReasons = [], isLoading: loadingReasons } = useQuery({
    queryKey: ['analytics-lost-reasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lost_reasons')
        .select('id, name')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all funnels for comparison
  const { data: funnels = [], isLoading: loadingFunnels } = useQuery({
    queryKey: ['analytics-funnels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('is_active', true)
        .order('order_position');
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate analytics data
  const analyticsData = useMemo<AnalyticsData>(() => {
    // Filter opportunities by product if needed
    let filteredOpportunities = opportunities;
    if (productId) {
      const opportunityIdsWithProduct = new Set(
        contracts.filter(c => c.product_id === productId).map(c => c.opportunity_id)
      );
      filteredOpportunities = opportunities.filter(o => 
        o.status === 'active' || opportunityIdsWithProduct.has(o.id)
      );
    }

    // Basic counts
    const totalCreated = filteredOpportunities.length;
    const wonOpportunities = filteredOpportunities.filter(o => o.status === 'won');
    const lostOpportunities = filteredOpportunities.filter(o => o.status === 'lost');
    const activeOpportunities = filteredOpportunities.filter(o => o.status === 'active');
    
    const totalWon = wonOpportunities.length;
    const totalLost = lostOpportunities.length;
    const totalActive = activeOpportunities.length;

    // Conversion rate (won / (won + lost))
    const closedCount = totalWon + totalLost;
    const conversionRate = closedCount > 0 ? (totalWon / closedCount) * 100 : 0;

    // Value calculations
    const relevantContracts = productId 
      ? contracts.filter(c => c.product_id === productId)
      : contracts;
    
    const totalValueConverted = relevantContracts.reduce((sum, c) => sum + Number(c.contract_value || 0), 0);
    const totalValueLost = lostOpportunities.reduce((sum, o) => sum + Number(o.proposal_value || 0), 0);
    
    const averageTicket = totalWon > 0 ? totalValueConverted / totalWon : 0;

    // Average closing time (in hours for precision)
    const closingHours = wonOpportunities
      .filter(o => o.converted_at && o.created_at)
      .map(o => differenceInHours(parseISO(o.converted_at!), parseISO(o.created_at)));
    const averageClosingHours = closingHours.length > 0 
      ? closingHours.reduce((sum, h) => sum + h, 0) / closingHours.length 
      : 0;

    // Time series data
    const daysDiff = differenceInDays(endDate, startDate);
    let intervals: Date[];
    let formatStr: string;
    
    if (daysDiff <= 31) {
      intervals = eachDayOfInterval({ start: startDate, end: endDate });
      formatStr = 'dd/MM';
    } else if (daysDiff <= 90) {
      intervals = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 0 });
      formatStr = "'Sem' w";
    } else {
      intervals = eachMonthOfInterval({ start: startDate, end: endDate });
      formatStr = 'MMM/yy';
    }

    const timeSeriesData: TimeSeriesPoint[] = intervals.map((intervalStart, index) => {
      const intervalEnd = index < intervals.length - 1 
        ? intervals[index + 1] 
        : endDate;
      
      const intervalOpps = filteredOpportunities.filter(o => {
        const createdAt = parseISO(o.created_at);
        return createdAt >= intervalStart && createdAt < intervalEnd;
      });

      const intervalContracts = relevantContracts.filter(c => {
        const createdAt = parseISO(c.created_at);
        return createdAt >= intervalStart && createdAt < intervalEnd;
      });

      return {
        date: intervalStart.toISOString(),
        label: format(intervalStart, formatStr, { locale: ptBR }),
        created: intervalOpps.length,
        won: intervalOpps.filter(o => o.status === 'won').length,
        lost: intervalOpps.filter(o => o.status === 'lost').length,
        valueWon: intervalContracts.reduce((sum, c) => sum + Number(c.contract_value || 0), 0),
        valueLost: intervalOpps.filter(o => o.status === 'lost').reduce((sum, o) => sum + Number(o.proposal_value || 0), 0),
      };
    });

    // Funnel stages data
    const relevantStages = funnelId 
      ? funnelStages.filter(s => s.funnel_id === funnelId)
      : funnelStages;
    
    const funnelStagesData: StageData[] = relevantStages.map(stage => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      count: activeOpportunities.filter(o => o.current_stage_id === stage.id).length,
      position: stage.order_position,
    })).sort((a, b) => a.position - b.position);

    // Lost reasons data
    const lostByReason = new Map<string, number>();
    lostOpportunities.forEach(o => {
      if (o.lost_reason_id) {
        lostByReason.set(o.lost_reason_id, (lostByReason.get(o.lost_reason_id) || 0) + 1);
      }
    });

    const lostReasonsData: LostReasonData[] = lostReasons
      .map(reason => {
        const count = lostByReason.get(reason.id) || 0;
        return {
          id: reason.id,
          name: reason.name,
          count,
          percentage: totalLost > 0 ? (count / totalLost) * 100 : 0,
        };
      })
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);

    // Funnel comparison data
    const funnelComparisonData: FunnelComparisonData[] = funnels.map(funnel => {
      const funnelOpps = opportunities.filter(o => o.current_funnel_id === funnel.id);
      const funnelWon = funnelOpps.filter(o => o.status === 'won').length;
      const funnelLost = funnelOpps.filter(o => o.status === 'lost').length;
      const funnelClosed = funnelWon + funnelLost;
      
      return {
        id: funnel.id,
        name: funnel.name,
        total: funnelOpps.length,
        won: funnelWon,
        lost: funnelLost,
        conversionRate: funnelClosed > 0 ? (funnelWon / funnelClosed) * 100 : 0,
      };
    }).filter(f => f.total > 0);

    return {
      totalCreated,
      totalWon,
      totalLost,
      totalActive,
      conversionRate,
      totalValueConverted,
      totalValueLost,
      averageTicket,
      averageClosingHours,
      timeSeriesData,
      funnelStagesData,
      lostReasonsData,
      funnelComparisonData,
    };
  }, [opportunities, contracts, funnelStages, lostReasons, funnels, funnelId, productId]);

  const isLoading = loadingOpportunities || loadingContracts || loadingStages || loadingReasons || loadingFunnels;

  return {
    data: analyticsData,
    isLoading,
  };
}
