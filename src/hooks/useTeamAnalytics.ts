import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  creditContracts: number;
  othersContracts: number;
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
  // Crédito
  creditSales: number;
  creditValue: number;
  // Outros
  othersSales: number;
  othersValue: number;
  // Totals
  totalRevenue: number;
  memberCount: number;
  // PB
  pbInsurance: number;
  pbPlanning: number;
  pbCredit: number;
  pbOthers: number;
  pbTotal: number;
  // Performance (placeholders)
  nps: number | null;
  inadimplencia: number | null;
  fatPerdido: number | null;
  churn: number | null;
  // Members
  members: TeamMemberMetrics[];
}

// Category mapping
const PLANNING_CATEGORIES = ['planejamento financeiro'];
const INSURANCE_CATEGORIES = ['seguro de vida', 'seguros (corretora de seguros)', 'plano de saúde'];
const CREDIT_CATEGORIES = [
  'home equity', 'financiamento imobiliário', 'financiamento auto',
  'carta contemplada auto', 'carta contemplada imobiliário',
  'crédito com colateral xp', 'consórcio',
];

function classifyCategory(name: string): 'planning' | 'insurance' | 'credit' | 'others' {
  const lower = name.toLowerCase();
  if (PLANNING_CATEGORIES.includes(lower)) return 'planning';
  if (INSURANCE_CATEGORIES.includes(lower)) return 'insurance';
  if (CREDIT_CATEGORIES.includes(lower)) return 'credit';
  return 'others';
}

export function useTeamAnalytics(filters: TeamFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-analytics', filters, user?.id],
    queryFn: async (): Promise<TeamMetrics> => {
      if (!user) throw new Error('User not authenticated');

      const dateFrom = filters.dateFrom.toISOString();
      const dateTo = filters.dateTo.toISOString();

      const { data: accessibleIds, error: accessError } = await supabase
        .rpc('get_accessible_user_ids', { _accessor_id: user.id });
      if (accessError) throw accessError;

      let targetUserIds = accessibleIds || [];

      // Apply filters
      if (filters.plannerId) {
        targetUserIds = [filters.plannerId];
      } else if (filters.leaderId) {
        const { data: leaderSubs } = await supabase
          .from('user_hierarchy')
          .select('user_id')
          .eq('manager_user_id', filters.leaderId);
        const leaderSubIds = leaderSubs?.map(s => s.user_id) || [];
        targetUserIds = targetUserIds.filter(id =>
          id === filters.leaderId || leaderSubIds.includes(id)
        );
      } else if (filters.coordinatorId) {
        const { data: coordSubs } = await supabase
          .from('user_hierarchy')
          .select('user_id')
          .eq('manager_user_id', filters.coordinatorId);
        const coordSubIds = coordSubs?.map(s => s.user_id) || [];
        const { data: deepSubs } = await supabase
          .from('user_hierarchy')
          .select('user_id')
          .in('manager_user_id', coordSubIds);
        const deepSubIds = deepSubs?.map(s => s.user_id) || [];
        const allCoordSubs = [...new Set([filters.coordinatorId, ...coordSubIds, ...deepSubIds])];
        targetUserIds = targetUserIds.filter(id => allCoordSubs.includes(id));
      }

      if (targetUserIds.length === 0) return getEmptyMetrics();

      // Parallel fetches
      const [profilesRes, rolesRes, hierarchiesRes, contractsRes, clientPlansRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, position, is_active, deactivated_at').in('user_id', targetUserIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', targetUserIds),
        supabase.from('user_hierarchy').select('user_id, manager_user_id').in('user_id', targetUserIds),
        supabase.from('contracts')
          .select('id, owner_id, contract_value, calculated_pbs, product_id, products!inner(category_id, product_categories(name))')
          .in('owner_id', targetUserIds)
          .gte('reported_at', dateFrom)
          .lte('reported_at', dateTo)
          .eq('status', 'active'),
        supabase.from('client_plans').select('owner_id').in('owner_id', targetUserIds).eq('status', 'active'),
      ]);

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const hierarchies = hierarchiesRes.data || [];
      const contracts = contractsRes.data || [];
      const clientPlans = clientPlansRes.data || [];

      // Manager names
      const managerIds = [...new Set(hierarchies.map(h => h.manager_user_id).filter(Boolean))];
      const { data: managerProfiles } = managerIds.length > 0
        ? await supabase.from('profiles').select('user_id, full_name').in('user_id', managerIds)
        : { data: [] };
      const managerMap = new Map<string, string>(managerProfiles?.map(p => [p.user_id, p.full_name] as [string, string]) || []);

      const rolesMap = new Map(roles.map(r => [r.user_id, r.role]));
      const hierarchyMap = new Map(hierarchies.map(h => [h.user_id, h.manager_user_id]));
      const profilesMap = new Map(profiles.map(p => [p.user_id, p]));

      // Aggregates
      let planningSales = 0, planningSalesValue = 0;
      let insuranceSales = 0, insuranceValue = 0;
      let creditSales = 0, creditValue = 0;
      let othersSales = 0, othersValue = 0;
      let pbPlanning = 0, pbInsurance = 0, pbCredit = 0, pbOthers = 0;

      const memberMetricsMap = new Map<string, TeamMemberMetrics>();
      for (const userId of targetUserIds) {
        const profile = profilesMap.get(userId);
        if (!profile) continue;
        const managerId = hierarchyMap.get(userId);
        memberMetricsMap.set(userId, {
          userId,
          fullName: profile.full_name,
          position: profile.position,
          role: rolesMap.get(userId) || null,
          leaderId: managerId as string || null,
          leaderName: managerId ? (managerMap.get(managerId as string) || null) : null,
          planningContracts: 0,
          insuranceContracts: 0,
          creditContracts: 0,
          othersContracts: 0,
          totalPB: 0,
          clientCount: 0,
        });
      }

      for (const contract of contracts) {
        const categoryName = (contract.products as any)?.product_categories?.name || '';
        const type = classifyCategory(categoryName);
        const val = Number(contract.contract_value) || 0;
        const pb = Number(contract.calculated_pbs) || 0;

        if (type === 'planning') { planningSales++; planningSalesValue += val; pbPlanning += pb; }
        else if (type === 'insurance') { insuranceSales++; insuranceValue += val; pbInsurance += pb; }
        else if (type === 'credit') { creditSales++; creditValue += val; pbCredit += pb; }
        else { othersSales++; othersValue += val; pbOthers += pb; }

        const member = memberMetricsMap.get(contract.owner_id);
        if (member) {
          if (type === 'planning') member.planningContracts++;
          else if (type === 'insurance') member.insuranceContracts++;
          else if (type === 'credit') member.creditContracts++;
          else member.othersContracts++;
          member.totalPB += pb;
        }
      }

      for (const plan of clientPlans) {
        const member = memberMetricsMap.get(plan.owner_id);
        if (member) member.clientCount++;
      }

      const members = Array.from(memberMetricsMap.values())
        .filter(m => m.planningContracts > 0 || m.insuranceContracts > 0 || m.creditContracts > 0 || m.othersContracts > 0 || m.clientCount > 0)
        .sort((a, b) => b.totalPB - a.totalPB);

      // Count only members who were active during the filtered period
      // A user was active if: still active OR deactivated after the period start
      const memberCount = profiles.filter(p => {
        if (p.is_active) return true;
        if (p.deactivated_at) {
          return new Date(p.deactivated_at) >= filters.dateFrom;
        }
        return false;
      }).length;

      return {
        planningSales,
        planningRenewals: 0,
        planningSalesValue,
        planningRenewalsValue: 0,
        insuranceSales,
        insuranceValue,
        insuranceTicketMedio: insuranceSales > 0 ? insuranceValue / insuranceSales : 0,
        creditSales,
        creditValue,
        othersSales,
        othersValue,
        totalRevenue: planningSalesValue + insuranceValue + creditValue + othersValue,
        memberCount,
        pbInsurance,
        pbPlanning,
        pbCredit,
        pbOthers,
        pbTotal: pbInsurance + pbPlanning + pbCredit + pbOthers,
        nps: null,
        inadimplencia: null,
        fatPerdido: null,
        churn: null,
        members,
      };
    },
    enabled: !!user,
  });
}

function getEmptyMetrics(): TeamMetrics {
  return {
    planningSales: 0, planningRenewals: 0, planningSalesValue: 0, planningRenewalsValue: 0,
    insuranceSales: 0, insuranceValue: 0, insuranceTicketMedio: 0,
    creditSales: 0, creditValue: 0,
    othersSales: 0, othersValue: 0,
    totalRevenue: 0, memberCount: 0,
    pbInsurance: 0, pbPlanning: 0, pbCredit: 0, pbOthers: 0, pbTotal: 0,
    nps: null, inadimplencia: null, fatPerdido: null, churn: null,
    members: [],
  };
}

export function useTeamMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      const { data: accessibleIds, error: accessError } = await supabase
        .rpc('get_accessible_user_ids', { _accessor_id: user.id });
      if (accessError) throw accessError;

      // Include inactive users so they appear in filters for historical analysis
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, position, is_active, deactivated_at')
        .in('user_id', accessibleIds || [])
        .order('full_name');

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
        isActive: p.is_active,
      }));
    },
    enabled: !!user,
  });
}
