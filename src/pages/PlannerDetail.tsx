import { Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useCanManageTeam } from '@/hooks/useTeamManagement';
import { useBehavioralProfile } from '@/hooks/useBehavioralProfile';
import { usePlannerGoals } from '@/hooks/usePlannerGoals';
import { useOneOnOneMeetings } from '@/hooks/useOneOnOneMeetings';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getPositionLabel } from '@/lib/positionLabels';
import { PlannerProfileChart } from '@/components/team-management/PlannerProfileChart';
import { BehavioralProfileUpload } from '@/components/team-management/BehavioralProfileUpload';
import { BehavioralProfileView } from '@/components/team-management/BehavioralProfileView';
import { GoalsSection } from '@/components/team-management/GoalsSection';
import { MeetingsSection } from '@/components/team-management/MeetingsSection';
import { PlannerFeedbacksManager } from '@/components/team-management/PlannerFeedbacksManager';
import { PlannerCasesManager } from '@/components/team-management/PlannerCasesManager';

export default function PlannerDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { role } = useAuth();
  const canManage = useCanManageTeam();

  const { data: planner } = useQuery({
    queryKey: ['planner-detail', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, position')
        .eq('user_id', userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: profile } = useBehavioralProfile(userId || '');
  const { data: goals } = usePlannerGoals(userId || '');
  const { data: meetings } = useOneOnOneMeetings(userId || '');

  if (!canManage) {
    return <Navigate to="/" replace />;
  }

  if (!userId) {
    return <Navigate to="/equipe/gestao" replace />;
  }

  const activeGoalsCount = goals?.filter(g => g.status === 'active').length || 0;
  const upcomingMeetingsCount = meetings?.filter(m => m.status === 'scheduled' || m.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/equipe/gestao">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{planner?.full_name}</h1>
            <p className="text-muted-foreground">
              {planner?.position ? getPositionLabel(planner.position) : 'Sem cargo'}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="profile">Perfil Comportamental</TabsTrigger>
          <TabsTrigger value="meetings">Reuniões 1:1</TabsTrigger>
          <TabsTrigger value="goals">Sonhos e Objetivos</TabsTrigger>
          <TabsTrigger value="proposals">Propostas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* DISC Profile Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Perfil DISC</CardTitle>
              </CardHeader>
              <CardContent>
                <PlannerProfileChart profile={profile || null} />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Objetivos Ativos</p>
                      <p className="text-2xl font-bold">{activeGoalsCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Próximas Reuniões</p>
                      <p className="text-2xl font-bold">{upcomingMeetingsCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <BehavioralProfileUpload 
            userId={userId} 
            existingReportUrl={profile?.rawReportUrl} 
          />
          <BehavioralProfileView profile={profile || null} />
        </TabsContent>

        <TabsContent value="meetings">
          <MeetingsSection userId={userId} plannerName={planner?.full_name || ''} />
        </TabsContent>

        <TabsContent value="goals">
          <GoalsSection userId={userId} />
        </TabsContent>

        <TabsContent value="proposals" className="space-y-6">
          <PlannerFeedbacksManager />
          <PlannerCasesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
