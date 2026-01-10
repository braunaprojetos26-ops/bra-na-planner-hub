import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, ListTodo } from 'lucide-react';
import { useCanManageTeam, useTeamManagement } from '@/hooks/useTeamManagement';
import { PlannerCard } from '@/components/team-management/PlannerCard';
import { TeamTasksSection } from '@/components/team-management/TeamTasksSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TeamManagement() {
  const canManage = useCanManageTeam();
  const { data: planners, isLoading } = useTeamManagement();

  const teamMembers = useMemo(() => {
    return (planners || []).map(p => ({
      userId: p.userId,
      fullName: p.fullName,
    }));
  }, [planners]);

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

      <Tabs defaultValue="team" className="w-full">
        <TabsList>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Tarefas da Equipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-6">
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
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-64" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum membro na sua equipe para atribuir tarefas
            </div>
          ) : (
            <TeamTasksSection teamMembers={teamMembers} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
