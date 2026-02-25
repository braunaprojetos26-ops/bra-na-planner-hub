import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInMonths, startOfMonth, endOfMonth, format } from "date-fns";

export interface ChurnFilters {
  startDate?: Date;
  endDate?: Date;
  ownerId?: string;
  planType?: string;
}

export interface ChurnMetrics {
  totalCancellations: number;
  churnValue: number;
  churnRate: number;
  avgTicketCancelled: number;
  avgTicketActive: number;
}

export interface ChurnByMonth {
  month: number;
  count: number;
}

export interface ChurnByMeeting {
  meeting: number;
  count: number;
}

export interface ChurnReason {
  reason: string;
  count: number;
  percentage: number;
}

export interface ChurnTimeSeries {
  month: string;
  cancellations: number;
  value: number;
}

export interface ChurnByOwner {
  ownerId: string;
  ownerName: string;
  totalClients: number;
  cancellations: number;
  churnRate: number;
  lostValue: number;
}

export function useChurnAnalytics(filters: ChurnFilters = {}) {
  return useQuery({
    queryKey: ["churn-analytics", filters],
    queryFn: async () => {
      const { startDate, endDate, ownerId, planType } = filters;

      // Fetch cancelled contracts with cancellation details
      let cancellationsQuery = supabase
        .from("contract_cancellations")
        .select(`
          *,
          contract:contracts!inner(
            id,
            contract_value,
            start_date,
            end_date,
            plan_type,
            meeting_count,
            owner_id,
            product:products(name, category:product_categories(name))
          ),
          reason:lost_reasons(name)
        `);

      if (startDate) {
        cancellationsQuery = cancellationsQuery.gte("cancelled_at", startDate.toISOString());
      }
      if (endDate) {
        cancellationsQuery = cancellationsQuery.lte("cancelled_at", endDate.toISOString());
      }
      if (ownerId) {
        cancellationsQuery = cancellationsQuery.eq("contract.owner_id", ownerId);
      }

      const { data: cancellations, error: cancellationsError } = await cancellationsQuery;
      if (cancellationsError) throw cancellationsError;

      // Also fetch directly cancelled contracts without cancellation record (legacy)
      let legacyCancelledQuery = supabase
        .from("contracts")
        .select(`
          id,
          contract_value,
          start_date,
          end_date,
          plan_type,
          meeting_count,
          owner_id,
          updated_at,
          product:products(name, category:product_categories(name))
        `)
        .eq("status", "cancelled");

      if (startDate) {
        legacyCancelledQuery = legacyCancelledQuery.gte("updated_at", startDate.toISOString());
      }
      if (endDate) {
        legacyCancelledQuery = legacyCancelledQuery.lte("updated_at", endDate.toISOString());
      }
      if (ownerId) {
        legacyCancelledQuery = legacyCancelledQuery.eq("owner_id", ownerId);
      }

      const { data: legacyCancelled, error: legacyError } = await legacyCancelledQuery;
      if (legacyError) throw legacyError;

      // Fetch active contracts for comparison
      // Fetch active contracts (exclude cancelled and frozen)
      let activeQuery = supabase
        .from("contracts")
        .select("id, contract_value, owner_id, plan_type")
        .eq("status", "active");

      if (ownerId) {
        activeQuery = activeQuery.eq("owner_id", ownerId);
      }

      const { data: activeContracts, error: activeError } = await activeQuery;
      if (activeError) throw activeError;

      // Filter by plan type if specified
      const filteredCancellations = planType
        ? (cancellations || []).filter((c: any) => c.contract?.plan_type === planType)
        : cancellations || [];

      const filteredLegacy = planType
        ? (legacyCancelled || []).filter((c: any) => c.plan_type === planType)
        : legacyCancelled || [];

      // Get IDs of contracts that have cancellation records
      const cancellationContractIds = new Set(filteredCancellations.map((c: any) => c.contract_id));
      
      // Filter legacy to exclude ones already in cancellations table
      const uniqueLegacy = filteredLegacy.filter((c: any) => !cancellationContractIds.has(c.id));

      // Calculate metrics
      const totalCancellations = filteredCancellations.length + uniqueLegacy.length;
      const churnValue = 
        filteredCancellations.reduce((sum: number, c: any) => sum + (c.contract_value || 0), 0) +
        uniqueLegacy.reduce((sum: number, c: any) => sum + (c.contract_value || 0), 0);

      const filteredActive = planType
        ? (activeContracts || []).filter((c: any) => c.plan_type === planType)
        : activeContracts || [];

      const totalClients = filteredActive.length + totalCancellations;
      const churnRate = totalClients > 0 ? (totalCancellations / totalClients) * 100 : 0;

      const avgTicketCancelled = totalCancellations > 0 ? churnValue / totalCancellations : 0;
      const activeValue = filteredActive.reduce((sum: number, c: any) => sum + (c.contract_value || 0), 0);
      const avgTicketActive = filteredActive.length > 0 ? activeValue / filteredActive.length : 0;

      const metrics: ChurnMetrics = {
        totalCancellations,
        churnValue,
        churnRate,
        avgTicketCancelled,
        avgTicketActive,
      };

      // Churn by contract month
      const churnByMonth: ChurnByMonth[] = [];
      for (let month = 1; month <= 12; month++) {
        const count = filteredCancellations.filter((c: any) => c.contract_month === month).length;
        if (count > 0) {
          churnByMonth.push({ month, count });
        }
      }
      // Add any remaining without specific month
      const noMonthCount = filteredCancellations.filter((c: any) => !c.contract_month).length + uniqueLegacy.length;
      if (noMonthCount > 0 && churnByMonth.length === 0) {
        churnByMonth.push({ month: 0, count: noMonthCount });
      }

      // Churn by meeting number
      const churnByMeeting: ChurnByMeeting[] = [];
      const meetingCounts: Record<number, number> = {};
      filteredCancellations.forEach((c: any) => {
        const meeting = c.last_completed_meeting || 0;
        meetingCounts[meeting] = (meetingCounts[meeting] || 0) + 1;
      });
      Object.entries(meetingCounts).forEach(([meeting, count]) => {
        churnByMeeting.push({ meeting: parseInt(meeting), count });
      });
      churnByMeeting.sort((a, b) => a.meeting - b.meeting);

      // Churn reasons
      const reasonCounts: Record<string, number> = {};
      filteredCancellations.forEach((c: any) => {
        const reason = c.reason?.name || "Não informado";
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });
      uniqueLegacy.forEach(() => {
        reasonCounts["Não informado"] = (reasonCounts["Não informado"] || 0) + 1;
      });
      const churnReasons: ChurnReason[] = Object.entries(reasonCounts)
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: totalCancellations > 0 ? (count / totalCancellations) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Time series (group by month)
      const timeSeriesMap: Record<string, { cancellations: number; value: number }> = {};
      
      filteredCancellations.forEach((c: any) => {
        const month = format(new Date(c.cancelled_at), "yyyy-MM");
        if (!timeSeriesMap[month]) {
          timeSeriesMap[month] = { cancellations: 0, value: 0 };
        }
        timeSeriesMap[month].cancellations++;
        timeSeriesMap[month].value += c.contract_value || 0;
      });

      uniqueLegacy.forEach((c: any) => {
        const month = format(new Date(c.updated_at), "yyyy-MM");
        if (!timeSeriesMap[month]) {
          timeSeriesMap[month] = { cancellations: 0, value: 0 };
        }
        timeSeriesMap[month].cancellations++;
        timeSeriesMap[month].value += c.contract_value || 0;
      });

      const churnTimeSeries: ChurnTimeSeries[] = Object.entries(timeSeriesMap)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Churn by owner
      // Include all users (active and inactive) so historical data is preserved
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, is_active");

      const ownerMap: Record<string, { name: string; cancellations: number; lostValue: number; activeCount: number }> = {};

      // Initialize with profiles
      (profiles || []).forEach((p: any) => {
        ownerMap[p.user_id] = {
          name: p.full_name + (p.is_active === false ? ' (Inativo)' : ''),
          cancellations: 0,
          lostValue: 0,
          activeCount: 0,
        };
      });

      // Count cancellations per owner
      filteredCancellations.forEach((c: any) => {
        const ownerId = c.contract?.owner_id;
        if (ownerId && ownerMap[ownerId]) {
          ownerMap[ownerId].cancellations++;
          ownerMap[ownerId].lostValue += c.contract_value || 0;
        }
      });

      uniqueLegacy.forEach((c: any) => {
        const ownerId = c.owner_id;
        if (ownerId && ownerMap[ownerId]) {
          ownerMap[ownerId].cancellations++;
          ownerMap[ownerId].lostValue += c.contract_value || 0;
        }
      });

      // Count active per owner
      filteredActive.forEach((c: any) => {
        if (c.owner_id && ownerMap[c.owner_id]) {
          ownerMap[c.owner_id].activeCount++;
        }
      });

      const churnByOwner: ChurnByOwner[] = Object.entries(ownerMap)
        .filter(([_, data]) => data.cancellations > 0 || data.activeCount > 0)
        .map(([ownerId, data]) => {
          const total = data.cancellations + data.activeCount;
          return {
            ownerId,
            ownerName: data.name,
            totalClients: total,
            cancellations: data.cancellations,
            churnRate: total > 0 ? (data.cancellations / total) * 100 : 0,
            lostValue: data.lostValue,
          };
        })
        .filter((o) => o.totalClients > 0)
        .sort((a, b) => b.cancellations - a.cancellations);

      return {
        metrics,
        churnByMonth,
        churnByMeeting,
        churnReasons,
        churnTimeSeries,
        churnByOwner,
      };
    },
  });
}

export function useCancellationReasons() {
  return useQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lost_reasons")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}
