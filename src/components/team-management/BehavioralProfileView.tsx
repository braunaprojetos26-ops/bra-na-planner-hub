import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BehavioralProfile } from '@/hooks/useBehavioralProfile';
import { PlannerProfileChart } from './PlannerProfileChart';

interface BehavioralProfileViewProps {
  profile: BehavioralProfile | null;
}

export function BehavioralProfileView({ profile }: BehavioralProfileViewProps) {
  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum perfil comportamental cadastrado. Faça o upload do relatório Sólides para visualizar.
        </CardContent>
      </Card>
    );
  }

  const indicatorBadge = (label: string, value: string | null) => (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="secondary">{value || 'N/A'}</Badge>
    </div>
  );

  const textSection = (title: string, content: string | null) => (
    <div className="space-y-1">
      <h4 className="text-sm font-medium">{title}</h4>
      <p className="text-sm text-muted-foreground">
        {content || 'Não informado'}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* DISC Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perfil DISC</CardTitle>
        </CardHeader>
        <CardContent>
          <PlannerProfileChart profile={profile} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <span className="text-2xl font-bold text-red-600">
                {profile.executorScore || 0}%
              </span>
              <p className="text-xs text-muted-foreground mt-1">Executor</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <span className="text-2xl font-bold text-yellow-600">
                {profile.comunicadorScore || 0}%
              </span>
              <p className="text-xs text-muted-foreground mt-1">Comunicador</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <span className="text-2xl font-bold text-green-600">
                {profile.planejadorScore || 0}%
              </span>
              <p className="text-xs text-muted-foreground mt-1">Planejador</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <span className="text-2xl font-bold text-blue-600">
                {profile.analistaScore || 0}%
              </span>
              <p className="text-xs text-muted-foreground mt-1">Analista</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Indicadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {indicatorBadge('Nível de Energia', profile.energyLevel)}
            {indicatorBadge('Exigência do Meio', profile.externalDemand)}
            {indicatorBadge('Autoconfiança', profile.selfConfidence)}
            {indicatorBadge('Autoestima', profile.selfEsteem)}
            {indicatorBadge('Flexibilidade', profile.flexibility)}
            {indicatorBadge('Automotivação', profile.autoMotivation)}
          </div>
        </CardContent>
      </Card>

      {/* Characteristics */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estilo e Comunicação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {textSection('Estilo de Liderança', profile.leadershipStyle)}
            {textSection('Estilo de Comunicação', profile.communicationStyle)}
            {textSection('Tomada de Decisão', profile.decisionMaking)}
            {textSection('Ambiente de Trabalho Ideal', profile.workEnvironment)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Motivações e Desenvolvimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {textSection('Fatores Motivacionais', profile.motivationalFactors)}
            {textSection('Fatores de Distanciamento', profile.distancingFactors)}
            {textSection('Pontos Fortes', profile.strengths)}
            {textSection('Áreas para Desenvolvimento', profile.areasToDevlop)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
