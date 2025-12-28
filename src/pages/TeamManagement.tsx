import { Navigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useCanManageTeam, useTeamManagement } from '@/hooks/useTeamManagement';
import { PlannerCard } from '@/components/team-management/PlannerCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeamManagement() {
  const canManage = useCanManageTeam();
  const { data: planners, isLoading } = useTeamManagement();

  if (!canManage) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gestão de Equipe</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhamento individual dos seus planejadores
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : planners?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum planejador na sua equipe
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {planners?.map(planner => (
            <PlannerCard key={planner.userId} planner={planner} />
          ))}
        </div>
      )}
    </div>
  );
}
