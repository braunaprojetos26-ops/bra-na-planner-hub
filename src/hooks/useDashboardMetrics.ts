import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format } from 'date-fns';

interface DashboardMetrics {
  totalRevenue: number;
  totalPBs: number;
  currentMonthRevenue: number;
  currentMonthPBs: number;
  previousMonthRevenue: number;
  previousMonthPBs: number;
  sameMonthLastYearRevenue: number;
  sameMonthLastYearPBs: number;
  vsPreviousMonthPercent: number | null;
  vsLastYearPercent: number | null;
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      const sameMonthLastYearStart = startOfMonth(subMonths(now, 12));
      
      // Get current month end (start of next month)
      const currentMonthEnd = startOfMonth(subMonths(now, -1));
      const previousMonthEnd = currentMonthStart;
      const sameMonthLastYearEnd = startOfMonth(subMonths(now, 11));

      // Fetch all active contracts
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('contract_value, calculated_pbs, reported_at')
        .neq('status', 'cancelled');

      if (error) throw error;

      const allContracts = contracts || [];

      // Calculate totals
      let totalRevenue = 0;
      let totalPBs = 0;
      let currentMonthRevenue = 0;
      let currentMonthPBs = 0;
      let previousMonthRevenue = 0;
      let previousMonthPBs = 0;
      let sameMonthLastYearRevenue = 0;
      let sameMonthLastYearPBs = 0;

      allContracts.forEach(contract => {
        const reportedAt = new Date(contract.reported_at);
        const value = contract.contract_value || 0;
        const pbs = contract.calculated_pbs || 0;

        // Total
        totalRevenue += value;
        totalPBs += pbs;

        // Current month
        if (reportedAt >= currentMonthStart && reportedAt < currentMonthEnd) {
          currentMonthRevenue += value;
          currentMonthPBs += pbs;
        }

        // Previous month
        if (reportedAt >= previousMonthStart && reportedAt < previousMonthEnd) {
          previousMonthRevenue += value;
          previousMonthPBs += pbs;
        }

        // Same month last year
        if (reportedAt >= sameMonthLastYearStart && reportedAt < sameMonthLastYearEnd) {
          sameMonthLastYearRevenue += value;
          sameMonthLastYearPBs += pbs;
        }
      });

      // Calculate percentages
      const vsPreviousMonthPercent = previousMonthRevenue > 0
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : null;

      const vsLastYearPercent = sameMonthLastYearRevenue > 0
        ? ((currentMonthRevenue - sameMonthLastYearRevenue) / sameMonthLastYearRevenue) * 100
        : null;

      return {
        totalRevenue,
        totalPBs,
        currentMonthRevenue,
        currentMonthPBs,
        previousMonthRevenue,
        previousMonthPBs,
        sameMonthLastYearRevenue,
        sameMonthLastYearPBs,
        vsPreviousMonthPercent,
        vsLastYearPercent,
      };
    }
  });
}
