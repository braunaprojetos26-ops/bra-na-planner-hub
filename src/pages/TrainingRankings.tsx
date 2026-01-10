import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Award, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrainingRankings } from '@/hooks/useTrainingRankings';

export default function TrainingRankings() {
  const navigate = useNavigate();
  const { cohorts, rankings, isLoading, cohortFilter, setCohortFilter } = useTrainingRankings();

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return null;
    }
  };

  const getMedalBg = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 2:
        return 'bg-gray-400/10 border-gray-400/30';
      case 3:
        return 'bg-amber-600/10 border-amber-600/30';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/training')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Rankings de Treinamento</h1>
            <p className="text-muted-foreground">
              Veja os melhores desempenhos em treinamentos
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={cohortFilter} onValueChange={setCohortFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {cohorts?.map((cohort) => (
                  <SelectItem key={cohort.value} value={cohort.value}>
                    {cohort.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Classificação Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : rankings?.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum ranking disponível</p>
              <p className="text-sm text-muted-foreground mt-1">
                Os rankings aparecem quando há progresso nos treinamentos
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rankings?.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors hover:bg-muted/50 ${getMedalBg(entry.position)}`}
                >
                  {/* Position */}
                  <div className="w-12 flex justify-center">
                    {getMedalIcon(entry.position) || (
                      <span className="text-2xl font-bold text-muted-foreground">
                        {entry.position}
                      </span>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.userPhoto || undefined} />
                      <AvatarFallback>
                        {entry.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{entry.userName}</p>
                      {entry.cohortDate && (
                        <p className="text-xs text-muted-foreground">
                          Turma: {new Date(entry.cohortDate).toLocaleDateString('pt-BR', { 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{entry.totalLessonsCompleted}</p>
                      <p className="text-xs text-muted-foreground">Aulas</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{entry.averageExamScore.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Média Teórica</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{entry.averagePracticalScore.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Média Prática</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{entry.coursesCompleted}</p>
                      <p className="text-xs text-muted-foreground">Cursos</p>
                    </div>
                  </div>

                  {/* Combined Score */}
                  <Badge 
                    variant="outline" 
                    className="text-lg px-4 py-1 font-bold"
                  >
                    {entry.combinedScore.toFixed(0)} pts
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3">Como funciona a pontuação:</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• <strong>Aulas concluídas:</strong> 10 pontos cada</li>
            <li>• <strong>Nota das provas teóricas:</strong> Média percentual × 2</li>
            <li>• <strong>Nota das provas práticas:</strong> Média × 10</li>
            <li>• <strong>Cursos completos:</strong> 50 pontos cada</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
