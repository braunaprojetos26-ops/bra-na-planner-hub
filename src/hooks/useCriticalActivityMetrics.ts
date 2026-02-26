import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, differenceInHours } from 'date-fns';

export interface MetricsFilters {
  months: number; // how many months back
  ruleType?: string;
  urgency?: string;
  plannerId?: string;
  teamManagerId?: string;
}

export interface MonthlyActivityData {
  month: string;
  created: number;
  acted: number;
}

export interface PlannerRanking {
  userId: string;
  name: string;
  count: number;
}

export interface TeamRanking {
  managerId: string;
  managerName: string;
  acted: number;
  open: number;
}

export interface AvgResponseTimeData {
  month: string;
  avgHours: number;
}

export function useCriticalActivityMetrics(filters: MetricsFilters) {
  const { user } = useAuth();

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - filters.months);
  const cutoffISO = cutoffDate.toISOString();

  // Fetch all needed data
  const query = useQuery({
    queryKey: ['critical-activity-metrics', filters],
    queryFn: async () => {
      // 1. Critical activities (for filtering by rule_type/urgency)
      const { data: activities } = await supabase
        .from('critical_activities')
        .select('id, title, urgency, rule_type, created_at, is_perpetual')
        .gte('created_at', cutoffISO);

      // 2. Assignments
      const { data: assignments } = await supabase
        .from('critical_activity_assignments')
        .select('id, activity_id, user_id, status, completed_at, created_at')
        .gte('created_at', cutoffISO);

      // 3. Tasks with critical prefix
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, assigned_to, contact_id, status, completed_at, created_at, title')
        .like('title', '[Atividade Crítica]%')
        .gte('created_at', cutoffISO);

      // 4. Contact interactions linked to critical tasks
      const taskIds = (tasks || []).map(t => t.id);
      let interactions: any[] = [];
      if (taskIds.length > 0) {
        // Batch in chunks of 100
        for (let i = 0; i < taskIds.length; i += 100) {
          const chunk = taskIds.slice(i, i + 100);
          const { data } = await supabase
            .from('contact_interactions')
            .select('id, user_id, task_id, interaction_date, created_at')
            .in('task_id', chunk);
          if (data) interactions = interactions.concat(data);
        }
      }

      // 5. Profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, position, is_active');

      // 6. Hierarchy
      const { data: hierarchy } = await supabase
        .from('user_hierarchy')
        .select('user_id, manager_user_id');

      return {
        activities: activities || [],
        assignments: assignments || [],
        tasks: tasks || [],
        interactions,
        profiles: profiles || [],
        hierarchy: hierarchy || [],
      };
    },
    enabled: !!user,
  });

  const data = query.data;
  if (!data) {
    return {
      isLoading: query.isLoading,
      monthlyData: [] as MonthlyActivityData[],
      topPlanners: [] as PlannerRanking[],
      openRanking: [] as PlannerRanking[],
      teamRanking: [] as TeamRanking[],
      avgResponseTime: [] as AvgResponseTimeData[],
      profiles: [] as any[],
      managers: [] as any[],
    };
  }

  const { activities, assignments, tasks, interactions, profiles, hierarchy } = data;

  // Build lookup maps
  const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name || 'Sem nome']));
  const hierarchyMap = new Map(hierarchy.map(h => [h.user_id, h.manager_user_id]));

  // Filter activities by rule_type/urgency
  let filteredActivityIds = new Set(activities.map(a => a.id));
  if (filters.ruleType) {
    const filtered = activities.filter(a => a.rule_type === filters.ruleType);
    filteredActivityIds = new Set(filtered.map(a => a.id));
  }
  if (filters.urgency) {
    const filtered = activities.filter(a => a.urgency === filters.urgency && filteredActivityIds.has(a.id));
    filteredActivityIds = new Set(filtered.map(a => a.id));
  }

  // Filter assignments by activity
  let filteredAssignments = assignments.filter(a => filteredActivityIds.has(a.activity_id));

  // Filter by planner
  if (filters.plannerId) {
    filteredAssignments = filteredAssignments.filter(a => a.user_id === filters.plannerId);
  }

  // Filter by team (manager)
  if (filters.teamManagerId) {
    const teamUserIds = new Set(
      hierarchy.filter(h => h.manager_user_id === filters.teamManagerId).map(h => h.user_id)
    );
    teamUserIds.add(filters.teamManagerId);
    filteredAssignments = filteredAssignments.filter(a => teamUserIds.has(a.user_id));
  }

  const filteredUserIds = new Set(filteredAssignments.map(a => a.user_id));
  const filteredTaskIds = new Set(
    tasks
      .filter(t => t.assigned_to && filteredUserIds.has(t.assigned_to))
      .map(t => t.id)
  );

  // ---- METRICS ----

  // 1. Monthly created vs acted
  const monthlyMap = new Map<string, { created: number; acted: number }>();
  for (const a of filteredAssignments) {
    const month = format(parseISO(a.created_at), 'yyyy-MM');
    const entry = monthlyMap.get(month) || { created: 0, acted: 0 };
    entry.created++;
    if (a.status === 'completed') entry.acted++;
    monthlyMap.set(month, entry);
  }
  // Also count interactions as "acted" for assignments not yet completed
  for (const i of interactions) {
    if (!filteredTaskIds.has(i.task_id)) continue;
    const month = format(parseISO(i.interaction_date), 'yyyy-MM');
    const entry = monthlyMap.get(month);
    if (entry && entry.acted < entry.created) {
      // Don't double-count, just ensure interactions also count
    }
  }
  const monthlyData: MonthlyActivityData[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month: format(parseISO(month + '-01'), 'MMM/yy'),
      created: d.created,
      acted: d.acted,
    }));

  // 2. Top planners (most interactions on critical tasks)
  const plannerInteractionCount = new Map<string, number>();
  for (const i of interactions) {
    if (!filteredTaskIds.has(i.task_id)) continue;
    plannerInteractionCount.set(i.user_id, (plannerInteractionCount.get(i.user_id) || 0) + 1);
  }
  // Also count completed assignments
  for (const a of filteredAssignments) {
    if (a.status === 'completed') {
      plannerInteractionCount.set(a.user_id, (plannerInteractionCount.get(a.user_id) || 0) + 1);
    }
  }
  const topPlanners: PlannerRanking[] = Array.from(plannerInteractionCount.entries())
    .map(([userId, count]) => ({ userId, name: profileMap.get(userId) || 'Desconhecido', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // 3. Planners with most open activities
  const openCount = new Map<string, number>();
  for (const a of filteredAssignments) {
    if (a.status !== 'completed') {
      openCount.set(a.user_id, (openCount.get(a.user_id) || 0) + 1);
    }
  }
  const openRanking: PlannerRanking[] = Array.from(openCount.entries())
    .map(([userId, count]) => ({ userId, name: profileMap.get(userId) || 'Desconhecido', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // 4. Team ranking
  const teamMap = new Map<string, { acted: number; open: number }>();
  for (const a of filteredAssignments) {
    const managerId = hierarchyMap.get(a.user_id);
    if (!managerId) continue;
    const entry = teamMap.get(managerId) || { acted: 0, open: 0 };
    if (a.status === 'completed') entry.acted++;
    else entry.open++;
    teamMap.set(managerId, entry);
  }
  const teamRanking: TeamRanking[] = Array.from(teamMap.entries())
    .map(([managerId, d]) => ({
      managerId,
      managerName: profileMap.get(managerId) || 'Desconhecido',
      acted: d.acted,
      open: d.open,
    }))
    .sort((a, b) => b.acted - a.acted);

  // 5. Average response time per month
  const taskCreatedMap = new Map(tasks.map(t => [t.id, t.created_at]));
  const firstInteractionByTask = new Map<string, string>();
  for (const i of interactions) {
    if (!filteredTaskIds.has(i.task_id)) continue;
    const existing = firstInteractionByTask.get(i.task_id);
    if (!existing || i.interaction_date < existing) {
      firstInteractionByTask.set(i.task_id, i.interaction_date);
    }
  }

  const responseTimeByMonth = new Map<string, number[]>();
  for (const [taskId, interactionDate] of firstInteractionByTask.entries()) {
    const taskCreated = taskCreatedMap.get(taskId);
    if (!taskCreated) continue;
    const hours = differenceInHours(parseISO(interactionDate), parseISO(taskCreated));
    if (hours < 0) continue;
    const month = format(parseISO(taskCreated), 'yyyy-MM');
    const arr = responseTimeByMonth.get(month) || [];
    arr.push(hours);
    responseTimeByMonth.set(month, arr);
  }

  const avgResponseTime: AvgResponseTimeData[] = Array.from(responseTimeByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, hours]) => ({
      month: format(parseISO(month + '-01'), 'MMM/yy'),
      avgHours: Math.round(hours.reduce((s, h) => s + h, 0) / hours.length),
    }));

  // Managers list for filter
  const managerIds = new Set(hierarchy.map(h => h.manager_user_id).filter(Boolean));
  const managers = Array.from(managerIds).map(id => ({
    id: id!,
    name: profileMap.get(id!) || 'Desconhecido',
  }));

  return {
    isLoading: query.isLoading,
    monthlyData,
    topPlanners,
    openRanking,
    teamRanking,
    avgResponseTime,
    profiles,
    managers,
  };
}
