import { useState } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamAnalytics, TeamFilters as TeamFiltersType } from '@/hooks/useTeamAnalytics';
import { useTeamEfforts } from '@/hooks/useTeamEfforts';
import { TeamFilters } from '@/components/team/TeamFilters';
import { TeamMetricsCards } from '@/components/team/TeamMetricsCards';
import { TeamMembersTable } from '@/components/team/TeamMembersTable';
import { Navigate } from 'react-router-dom';

const ALLOWED_ROLES = ['lider', 'supervisor', 'gerente', 'superadmin'];

export default function Team() {
  const { role } = useAuth();
  
  const [filters, setFilters] = useState<TeamFiltersType>({
    dateFrom: startOfMonth(new Date()),
    dateTo: endOfMonth(new Date()),
  });

  const { data: metrics, isLoading } = useTeamAnalytics(filters);
  const { data: efforts, isLoading: isLoadingEfforts } = useTeamEfforts(filters);

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
            <p className="text-muted-foreground text-sm">Acompanhe a performance do seu time</p>
          </div>
        </div>
      </div>

      <TeamFilters filters={filters} onFiltersChange={setFilters} />

      <TeamMetricsCards metrics={metrics} efforts={efforts} isLoading={isLoading} isLoadingEfforts={isLoadingEfforts} />

      <div>
        <h3 className="text-lg font-semibold mb-4">Acompanhamento da Equipe</h3>
        <TeamMembersTable members={metrics?.members || []} isLoading={isLoading} />
      </div>
    </div>
  );
}
