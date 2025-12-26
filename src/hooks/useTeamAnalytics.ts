import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface TeamFilters {
  dateFrom: Date;
  dateTo: Date;
  coordinatorId?: string;
  leaderId?: string;
  plannerId?: string;
}

export interface TeamMemberMetrics {
  userId: string;
  fullName: string;
  position: string | null;
  role: string | null;
  leaderId: string | null;
  leaderName: string | null;
  planningContracts: number;
  insuranceContracts: number;
  totalPB: number;
  clientCount: number;
}

export interface TeamMetrics {
  // Planejamento
  planningSales: number;
  planningRenewals: number;
  planningSalesValue: number;
  planningRenewalsValue: number;
  // Seguro
  insuranceSales: number;
  insuranceValue: number;
  insuranceTicketMedio: number;
  // PB
  pbInsurance: number;
  pbPlanning: number;
  pbTotal: number;
  // Performance (placeholders)
  nps: number | null;
  inadimplencia: number | null;
  fatPerdido: number | null;
  churn: number | null;
  // Members
  members: TeamMemberMetrics[];
}

export function useTeamAnalytics(filters: TeamFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-analytics', filters, user?.id],
    queryFn: async (): Promise<TeamMetrics> => {
      if (!user) throw new Error('User not authenticated');

      const dateFrom = filters.dateFrom.toISOString();
      const dateTo = filters.dateTo.toISOString();

      // Get accessible user IDs (subordinates)
      const { data: accessibleIds, error: accessError } = await supabase
        .rpc('get_accessible_user_ids', { _accessor_id: user.id });

      if (accessError) throw accessError;

      let targetUserIds = accessibleIds || [];

      // Apply filters
      if (filters.plannerId) {
        targetUserIds = [filters.plannerId];
      } else if (filters.leaderId) {
        // Get subordinates of the leader
        const { data: leaderSubs } = await supabase
          .from('user_hierarchy')
          .select('user_id')
          .eq('manager_user_id', filters.leaderId);
        
        const leaderSubIds = leaderSubs?.map(s => s.user_id) || [];
        targetUserIds = targetUserIds.filter(id => 
          id === filters.leaderId || leaderSubIds.includes(id)
        );
      } else if (filters.coordinatorId) {
        // Get subordinates of the coordinator (including leaders and planners)
        const { data: coordSubs } = await supabase
          .from('user_hierarchy')
          .select('user_id')
          .eq('manager_user_id', filters.coordinatorId);
        
        const coordSubIds = coordSubs?.map(s => s.user_id) || [];
        
        // Also get subordinates of those subordinates
        const { data: deepSubs } = await supabase
          .from('user_hierarchy')
          .select('user_id')
          .in('manager_user_id', coordSubIds);
        
        const deepSubIds = deepSubs?.map(s => s.user_id) || [];
        
        const allCoordSubs = [...new Set([filters.coordinatorId, ...coordSubIds, ...deepSubIds])];
        targetUserIds = targetUserIds.filter(id => allCoordSubs.includes(id));
      }

      if (targetUserIds.length === 0) {
        return getEmptyMetrics();
      }

      // Get profiles with hierarchy
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, position')
        .in('user_id', targetUserIds);

      // Get roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', targetUserIds);

      // Get hierarchy
      const { data: hierarchies } = await supabase
        .from('user_hierarchy')
        .select('user_id, manager_user_id')
        .in('user_id', targetUserIds);

      // Get all profiles for manager names
      const managerIds = [...new Set(hierarchies?.map(h => h.manager_user_id).filter(Boolean) || [])];
      const { data: managerProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', managerIds);

      const managerMap = new Map(managerProfiles?.map(p => [p.user_id, p.full_name]) || []);

      // Get contracts in period
      const { data: contracts } = await supabase
        .from('contracts')
        .select(`
          id,
          owner_id,
          contract_value,
          calculated_pbs,
          product_id,
          products!inner(category_id, product_categories(name))
        `)
        .in('owner_id', targetUserIds)
        .gte('reported_at', dateFrom)
        .lte('reported_at', dateTo)
        .eq('status', 'active');

      // Get client plans count per user
      const { data: clientPlans } = await supabase
        .from('client_plans')
        .select('owner_id')
        .in('owner_id', targetUserIds)
        .eq('status', 'active');

      // Calculate metrics
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const hierarchyMap = new Map(hierarchies?.map(h => [h.user_id, h.manager_user_id]) || []);
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Aggregate by category
      let planningSales = 0;
      let planningSalesValue = 0;
      let insuranceSales = 0;
      let insuranceValue = 0;
      let pbInsurance = 0;
      let pbPlanning = 0;

      const memberMetricsMap = new Map<string, TeamMemberMetrics>();

      // Initialize member metrics
      for (const userId of targetUserIds) {
        const profile = profilesMap.get(userId);
        if (!profile) continue;

        const managerId = hierarchyMap.get(userId);
        memberMetricsMap.set(userId, {
          userId,
          fullName: profile.full_name,
          position: profile.position,
          role: rolesMap.get(userId) || null,
          leaderId: managerId || null,
          leaderName: managerId ? (managerMap.get(managerId) || null) : null,
          planningContracts: 0,
          insuranceContracts: 0,
          totalPB: 0,
          clientCount: 0,
        });
      }

      // Process contracts
      for (const contract of contracts || []) {
        const categoryName = (contract.products as any)?.product_categories?.name?.toLowerCase() || '';
        const isPlanning = categoryName.includes('planejamento');
        const isInsurance = categoryName.includes('seguro');

        if (isPlanning) {
          planningSales++;
          planningSalesValue += Number(contract.contract_value) || 0;
          pbPlanning += Number(contract.calculated_pbs) || 0;
        } else if (isInsurance) {
          insuranceSales++;
          insuranceValue += Number(contract.contract_value) || 0;
          pbInsurance += Number(contract.calculated_pbs) || 0;
        }

        // Update member metrics
        const member = memberMetricsMap.get(contract.owner_id);
        if (member) {
          if (isPlanning) member.planningContracts++;
          if (isInsurance) member.insuranceContracts++;
          member.totalPB += Number(contract.calculated_pbs) || 0;
        }
      }

      // Count clients per user
      for (const plan of clientPlans || []) {
        const member = memberMetricsMap.get(plan.owner_id);
        if (member) member.clientCount++;
      }

      const members = Array.from(memberMetricsMap.values())
        .filter(m => m.planningContracts > 0 || m.insuranceContracts > 0 || m.clientCount > 0)
        .sort((a, b) => b.totalPB - a.totalPB);

      return {
        planningSales,
        planningRenewals: 0, // Placeholder - renewal funnel just created
        planningSalesValue,
        planningRenewalsValue: 0,
        insuranceSales,
        insuranceValue,
        insuranceTicketMedio: insuranceSales > 0 ? insuranceValue / insuranceSales : 0,
        pbInsurance,
        pbPlanning,
        pbTotal: pbInsurance + pbPlanning,
        nps: null, // Placeholder
        inadimplencia: null, // Placeholder
        fatPerdido: null, // Placeholder
        churn: null, // Placeholder
        members,
      };
    },
    enabled: !!user,
  });
}

function getEmptyMetrics(): TeamMetrics {
  return {
    planningSales: 0,
    planningRenewals: 0,
    planningSalesValue: 0,
    planningRenewalsValue: 0,
    insuranceSales: 0,
    insuranceValue: 0,
    insuranceTicketMedio: 0,
    pbInsurance: 0,
    pbPlanning: 0,
    pbTotal: 0,
    nps: null,
    inadimplencia: null,
    fatPerdido: null,
    churn: null,
    members: [],
  };
}

export function useTeamMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Get accessible user IDs
      const { data: accessibleIds, error: accessError } = await supabase
        .rpc('get_accessible_user_ids', { _accessor_id: user.id });

      if (accessError) throw accessError;

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, position')
        .in('user_id', accessibleIds || [])
        .eq('is_active', true)
        .order('full_name');

      // Get roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', accessibleIds || []);

      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return (profiles || []).map(p => ({
        userId: p.user_id,
        fullName: p.full_name,
        position: p.position,
        role: rolesMap.get(p.user_id) || null,
      }));
    },
    enabled: !!user,
  });
}
