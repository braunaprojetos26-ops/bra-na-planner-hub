import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, differenceInDays, differenceInHours, parseISO, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
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

// Metrics for stage-to-stage conversion (prospecting funnels)
export interface StageConversionData {
  fromStageId: string;
  fromStageName: string;
  toStageId: string;
  toStageName: string;
  fromCount: number;
  toCount: number;
  conversionRate: number;
  color: string;
}

// Time spent per stage
export interface TimeByStageData {
  stageId: string;
  stageName: string;
  averageHours: number;
  color: string;
  position: number;
}

// Losses per stage
export interface LossesPerStageData {
  stageId: string;
  stageName: string;
  lossCount: number;
  lossPercentage: number;
  color: string;
  position: number;
}

// Selected funnel info
export interface FunnelInfo {
  id: string;
  name: string;
  generatesContract: boolean;
}

export interface AnalyticsData {
  // Common metrics
  totalCreated: number;
  totalWon: number;
  totalLost: number;
  totalActive: number;
  conversionRate: number;
  
  // Sales metrics
  totalValueConverted: number;
  totalValueLost: number;
  averageTicket: number;
  averageClosingHours: number;
  
  // Process/Prospecting metrics
  stageConversionData: StageConversionData[];
  timeByStageData: TimeByStageData[];
  lossesPerStageData: LossesPerStageData[];
  overallStageConversionRate: number;
  averageProcessTimeHours: number;
  lossRate: number;
  
  // Chart data
  timeSeriesData: TimeSeriesPoint[];
  funnelStagesData: StageData[];
  lostReasonsData: LostReasonData[];
  funnelComparisonData: FunnelComparisonData[];
  
  // Selected funnel info
  selectedFunnel: FunnelInfo | null;
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
          lost_from_stage_id,
          stage_entered_at,
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

  // Fetch opportunity history for time-per-stage calculations
  const { data: opportunityHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['analytics-opportunity-history', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunity_history')
        .select('id, opportunity_id, action, from_stage_id, to_stage_id, created_at')
        .gte('created_at', startOfDay(startDate).toISOString())
        .lte('created_at', endOfDay(endDate).toISOString())
        .order('created_at', { ascending: true });

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

  // Fetch all funnels for comparison and to get funnel info
  const { data: funnels = [], isLoading: loadingFunnels } = useQuery({
    queryKey: ['analytics-funnels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name, generates_contract')
        .eq('is_active', true)
        .order('order_position');
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate analytics data
  const analyticsData = useMemo<AnalyticsData>(() => {
    // Get selected funnel info
    const selectedFunnel: FunnelInfo | null = funnelId 
      ? funnels.find(f => f.id === funnelId) 
        ? { 
            id: funnels.find(f => f.id === funnelId)!.id,
            name: funnels.find(f => f.id === funnelId)!.name,
            generatesContract: funnels.find(f => f.id === funnelId)!.generates_contract
          }
        : null
      : null;

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
    
    // Loss rate
    const lossRate = closedCount > 0 ? (totalLost / closedCount) * 100 : 0;

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

    // Get relevant stages for the selected funnel
    const relevantStages = funnelId 
      ? funnelStages.filter(s => s.funnel_id === funnelId).sort((a, b) => a.order_position - b.order_position)
      : funnelStages.sort((a, b) => a.order_position - b.order_position);

    // ========== PROCESS/PROSPECTING METRICS ==========
    
    // Stage conversion data (stage-to-stage)
    const stageConversionData: StageConversionData[] = [];
    for (let i = 0; i < relevantStages.length - 1; i++) {
      const fromStage = relevantStages[i];
      const toStage = relevantStages[i + 1];
      
      // Count opportunities that passed through each stage
      // An opportunity "passed through" a stage if it's currently in that stage or any later stage
      const fromCount = filteredOpportunities.filter(o => {
        const stagePosition = relevantStages.find(s => s.id === o.current_stage_id)?.order_position ?? -1;
        return stagePosition >= fromStage.order_position;
      }).length;
      
      const toCount = filteredOpportunities.filter(o => {
        const stagePosition = relevantStages.find(s => s.id === o.current_stage_id)?.order_position ?? -1;
        return stagePosition >= toStage.order_position;
      }).length;
      
      stageConversionData.push({
        fromStageId: fromStage.id,
        fromStageName: fromStage.name,
        toStageId: toStage.id,
        toStageName: toStage.name,
        fromCount,
        toCount,
        conversionRate: fromCount > 0 ? (toCount / fromCount) * 100 : 0,
        color: fromStage.color,
      });
    }

    // Overall stage conversion rate (first stage to last stage)
    const firstStageCount = stageConversionData.length > 0 ? stageConversionData[0].fromCount : totalCreated;
    const lastStageCount = relevantStages.length > 0 
      ? filteredOpportunities.filter(o => o.current_stage_id === relevantStages[relevantStages.length - 1].id).length
      : 0;
    const overallStageConversionRate = firstStageCount > 0 ? (lastStageCount / firstStageCount) * 100 : 0;

    // Time by stage data (using opportunity history)
    const timeByStageData: TimeByStageData[] = relevantStages.map(stage => {
      // Find all stage transitions TO this stage and FROM this stage
      const stageEnterEvents = opportunityHistory.filter(h => h.to_stage_id === stage.id);
      const stageExitEvents = opportunityHistory.filter(h => h.from_stage_id === stage.id);
      
      let totalHours = 0;
      let count = 0;
      
      stageEnterEvents.forEach(enterEvent => {
        // Find the next exit event for the same opportunity
        const exitEvent = stageExitEvents.find(
          e => e.opportunity_id === enterEvent.opportunity_id && 
               parseISO(e.created_at) > parseISO(enterEvent.created_at)
        );
        
        if (exitEvent) {
          const hours = differenceInHours(parseISO(exitEvent.created_at), parseISO(enterEvent.created_at));
          totalHours += hours;
          count++;
        }
      });
      
      // Also consider opportunities currently in this stage
      const currentInStage = activeOpportunities.filter(o => o.current_stage_id === stage.id);
      currentInStage.forEach(opp => {
        if (opp.stage_entered_at) {
          const hours = differenceInHours(new Date(), parseISO(opp.stage_entered_at));
          totalHours += hours;
          count++;
        }
      });
      
      return {
        stageId: stage.id,
        stageName: stage.name,
        averageHours: count > 0 ? totalHours / count : 0,
        color: stage.color,
        position: stage.order_position,
      };
    }).sort((a, b) => a.position - b.position);

    // Average process time (total time from creation to current stage for active, or to close for closed)
    const processHours = filteredOpportunities
      .filter(o => o.created_at)
      .map(o => {
        const endTime = o.converted_at || o.lost_at || new Date().toISOString();
        return differenceInHours(parseISO(endTime), parseISO(o.created_at));
      });
    const averageProcessTimeHours = processHours.length > 0 
      ? processHours.reduce((sum, h) => sum + h, 0) / processHours.length 
      : 0;

    // Losses per stage data
    const lossesPerStageData: LossesPerStageData[] = relevantStages.map(stage => {
      const lossCount = lostOpportunities.filter(o => o.lost_from_stage_id === stage.id).length;
      return {
        stageId: stage.id,
        stageName: stage.name,
        lossCount,
        lossPercentage: totalLost > 0 ? (lossCount / totalLost) * 100 : 0,
        color: stage.color,
        position: stage.order_position,
      };
    }).filter(s => s.lossCount > 0).sort((a, b) => b.lossCount - a.lossCount);

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
      stageConversionData,
      timeByStageData,
      lossesPerStageData,
      overallStageConversionRate,
      averageProcessTimeHours,
      lossRate,
      timeSeriesData,
      funnelStagesData,
      lostReasonsData,
      funnelComparisonData,
      selectedFunnel,
    };
  }, [opportunities, contracts, funnelStages, lostReasons, funnels, opportunityHistory, funnelId, productId]);

  const isLoading = loadingOpportunities || loadingContracts || loadingStages || loadingReasons || loadingFunnels || loadingHistory;

  return {
    data: analyticsData,
    isLoading,
  };
}
