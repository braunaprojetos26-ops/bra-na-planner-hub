import { Link } from 'react-router-dom';
import { User, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TeamMember } from '@/hooks/useTeamManagement';
import { useBehavioralProfile } from '@/hooks/useBehavioralProfile';
import { getPositionLabel } from '@/lib/positionLabels';

interface PlannerCardProps {
  planner: TeamMember;
}

export function PlannerCard({ planner }: PlannerCardProps) {
  const { data: profile } = useBehavioralProfile(planner.userId);

  const getDominantProfile = () => {
    if (!profile) return null;
    const scores = [
      { name: 'Executor', score: profile.executorScore || 0, color: 'bg-red-500' },
      { name: 'Comunicador', score: profile.comunicadorScore || 0, color: 'bg-yellow-500' },
      { name: 'Planejador', score: profile.planejadorScore || 0, color: 'bg-green-500' },
      { name: 'Analista', score: profile.analistaScore || 0, color: 'bg-blue-500' },
    ];
    return scores.reduce((prev, current) => (current.score > prev.score ? current : prev));
  };

  const dominantProfile = getDominantProfile();

  return (
    <Link to={`/equipe/gestao/${planner.userId}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">
                  {planner.fullName}
                </h3>
                {dominantProfile && (
                  <span className={`h-2 w-2 rounded-full ${dominantProfile.color}`} 
                        title={`Perfil dominante: ${dominantProfile.name}`} />
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                {planner.position ? getPositionLabel(planner.position) : 'Sem cargo'}
              </p>
              
              {dominantProfile && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {dominantProfile.name}
                </Badge>
              )}
            </div>
            
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
