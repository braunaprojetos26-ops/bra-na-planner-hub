import { useState, useMemo } from 'react';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamTasksStats } from './TeamTasksStats';
import { TeamTasksFilters } from './TeamTasksFilters';
import { TeamTasksTable } from './TeamTasksTable';
import { NewTeamTaskModal } from './NewTeamTaskModal';
import { useTeamTasks, useTeamTaskStats, useCompleteTeamTask, useDeleteTeamTask, TeamTaskFilters } from '@/hooks/useTeamTasks';
import { TaskType, TaskStatus } from '@/types/tasks';

interface TeamMember {
  userId: string;
  fullName: string;
}

interface TeamTasksSectionProps {
  teamMembers: TeamMember[];
}

function getDateRange(period: string, customStart?: Date, customEnd?: Date): { startDate?: Date; endDate?: Date } {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
    case 'week':
      return {
        startDate: subDays(now, 7),
        endDate: now,
      };
    case 'this_week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case 'month':
      return {
        startDate: subDays(now, 30),
        endDate: now,
      };
    case 'this_month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
    case 'custom':
      return {
        startDate: customStart ? startOfDay(customStart) : undefined,
        endDate: customEnd ? endOfDay(customEnd) : undefined,
      };
    case 'all':
    default:
      return {};
  }
}

export function TeamTasksSection({ teamMembers }: TeamTasksSectionProps) {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTaskType, setSelectedTaskType] = useState('all');
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);

  const teamMemberIds = useMemo(() => teamMembers.map(m => m.userId), [teamMembers]);

  const filters: TeamTaskFilters = useMemo(() => {
    const dateRange = getDateRange(selectedPeriod, customDateStart, customDateEnd);
    return {
      ...dateRange,
      memberId: selectedMemberId,
      taskType: selectedTaskType as TaskType | 'all',
      status: selectedStatus as TaskStatus | 'all',
    };
  }, [selectedPeriod, selectedMemberId, selectedStatus, selectedTaskType, customDateStart, customDateEnd]);

  const { data: tasks = [], isLoading: isLoadingTasks } = useTeamTasks(teamMemberIds, filters);
  const { data: stats, isLoading: isLoadingStats } = useTeamTaskStats(teamMemberIds);
  const { mutate: completeTask } = useCompleteTeamTask();
  const { mutate: deleteTask } = useDeleteTeamTask();

  const handleComplete = (taskId: string) => {
    completeTask(taskId);
  };

  const handleDelete = (taskId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      deleteTask(taskId);
    }
  };

  return (
    <div className="space-y-6">
      <TeamTasksStats
        total={stats?.total || 0}
        pending={stats?.pending || 0}
        overdue={stats?.overdue || 0}
        completed={stats?.completed || 0}
        isLoading={isLoadingStats}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Tarefas da Equipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TeamTasksFilters
            selectedMemberId={selectedMemberId}
            selectedPeriod={selectedPeriod}
            selectedStatus={selectedStatus}
            selectedTaskType={selectedTaskType}
            customDateStart={customDateStart}
            customDateEnd={customDateEnd}
            teamMembers={teamMembers}
            onMemberChange={setSelectedMemberId}
            onPeriodChange={setSelectedPeriod}
            onStatusChange={setSelectedStatus}
            onTaskTypeChange={setSelectedTaskType}
            onCustomDateStartChange={setCustomDateStart}
            onCustomDateEndChange={setCustomDateEnd}
            onNewTask={() => setShowNewTaskModal(true)}
          />

          <TeamTasksTable
            tasks={tasks}
            isLoading={isLoadingTasks}
            onComplete={handleComplete}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <NewTeamTaskModal
        open={showNewTaskModal}
        onOpenChange={setShowNewTaskModal}
        teamMembers={teamMembers}
      />
    </div>
  );
}
