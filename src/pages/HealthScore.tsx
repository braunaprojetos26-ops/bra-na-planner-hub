import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryCard } from '@/components/health-score/CategoryCard';
import { ClientDrawer } from '@/components/health-score/ClientDrawer';
import { ScoreDonutChart } from '@/components/health-score/ScoreDonutChart';
import { FilterBar } from '@/components/health-score/FilterBar';
import { useHealthScore, CATEGORY_CONFIG, CategoryKey } from '@/hooks/useHealthScore';
import { cn } from '@/lib/utils';

export default function HealthScore() {
  const navigate = useNavigate();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useHealthScore({
    ownerId: selectedOwnerId,
  });

  const handleCategoryClick = (category: CategoryKey) => {
    setSelectedCategory(category);
    setIsDrawerOpen(true);
  };

  const handleClientClick = (clientId: string) => {
    // Navigate to client detail page
    navigate(`/clients/${clientId}`);
  };

  const filteredClients = data?.results.filter(
    client => selectedCategory ? client.category === selectedCategory : true
  ) || [];

  // Calculate average scores for each category
  const getCategoryAverageScore = (category: CategoryKey) => {
    const clients = data?.results.filter(c => c.category === category) || [];
    if (clients.length === 0) return undefined;
    return Math.round(clients.reduce((sum, c) => sum + c.totalScore, 0) / clients.length);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Health Score</h1>
            <p className="text-sm text-muted-foreground">
              Monitore a saúde da sua carteira de clientes
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isFetching && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <FilterBar 
        selectedOwnerId={selectedOwnerId}
        onOwnerChange={setSelectedOwnerId}
      />

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="analytics" disabled>Análise de Pilares</TabsTrigger>
          <TabsTrigger value="temporal" disabled>Evolução Temporal</TabsTrigger>
          <TabsTrigger value="movement" disabled>Movimentação</TabsTrigger>
          <TabsTrigger value="portfolio" disabled>Métricas do Portfólio</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Score Geral Card */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score Médio da Carteira</p>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-4xl font-bold">
                      {isLoading ? '—' : data?.summary.averageScore || 0}
                    </span>
                    <span className="text-muted-foreground">/ 100</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total de Clientes</p>
                  <p className="text-2xl font-semibold mt-1">
                    {isLoading ? '—' : data?.summary.totalClients || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['otimo', 'estavel', 'atencao', 'critico'] as CategoryKey[]).map((category) => (
              <CategoryCard
                key={category}
                category={category}
                count={data?.summary.byCategory[category] || 0}
                totalClients={data?.summary.totalClients || 0}
                averageScore={getCategoryAverageScore(category)}
                onClick={() => handleCategoryClick(category)}
                isSelected={selectedCategory === category}
              />
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScoreDonutChart 
              summary={data?.summary}
              isLoading={isLoading}
            />
            
            {/* Placeholder for future charts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tendência (em breve)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Disponível na Fase 3
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Client Drawer */}
      <ClientDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        clients={filteredClients}
        onClientClick={handleClientClick}
      />
    </div>
  );
}
