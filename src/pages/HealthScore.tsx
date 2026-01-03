import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryCard } from '@/components/health-score/CategoryCard';
import { ClientDrawer } from '@/components/health-score/ClientDrawer';
import { ScoreDonutChart } from '@/components/health-score/ScoreDonutChart';
import { FilterBar, HealthScoreFilters } from '@/components/health-score/FilterBar';
import { PillarAnalysisTab } from '@/components/health-score/PillarAnalysisTab';
import { TemporalEvolutionTab } from '@/components/health-score/TemporalEvolutionTab';
import { MovementTab } from '@/components/health-score/MovementTab';
import { PortfolioMetricsTab } from '@/components/health-score/PortfolioMetricsTab';
import { useHealthScore, CATEGORY_CONFIG, CategoryKey } from '@/hooks/useHealthScore';
import { cn } from '@/lib/utils';

export default function HealthScore() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<HealthScoreFilters>({});
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useHealthScore({
    ownerIds: filters.ownerIds,
  });

  const handleCategoryClick = (category: CategoryKey) => {
    setSelectedCategory(category);
    setIsDrawerOpen(true);
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const filteredClients = data?.results.filter(
    client => selectedCategory ? client.category === selectedCategory : true
  ) || [];

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
        filters={filters}
        onFiltersChange={setFilters}
      />

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-transparent p-0 h-auto gap-2">
          <TabsTrigger 
            value="dashboard"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-muted text-muted-foreground px-4 py-2 rounded-md"
          >
            Dashboard
          </TabsTrigger>
          <TabsTrigger 
            value="analytics"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-muted text-muted-foreground px-4 py-2 rounded-md"
          >
            Análise de Pilares
          </TabsTrigger>
          <TabsTrigger 
            value="temporal"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-muted text-muted-foreground px-4 py-2 rounded-md"
          >
            Evolução Temporal
          </TabsTrigger>
          <TabsTrigger 
            value="movement"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-muted text-muted-foreground px-4 py-2 rounded-md"
          >
            Movimentação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Category Cards at Top */}
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

          {/* Portfolio Metrics below Category Cards */}
          <PortfolioMetricsTab 
            results={data?.results || []}
            summary={data?.summary}
            isLoading={isLoading}
            ownerIds={filters.ownerIds}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <PillarAnalysisTab 
            results={data?.results || []} 
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="temporal">
          <TemporalEvolutionTab 
            ownerIds={filters.ownerIds}
            startDate={filters.startDate}
            endDate={filters.endDate}
          />
        </TabsContent>

        <TabsContent value="movement">
          <MovementTab 
            ownerIds={filters.ownerIds}
            startDate={filters.startDate}
            endDate={filters.endDate}
          />
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
