import { useState } from 'react';
import { Map } from 'lucide-react';
import { useOpportunityMap } from '@/hooks/useOpportunityMap';
import { OpportunityMapMetricsCards } from '@/components/opportunity-map/OpportunityMapMetrics';
import { OpportunityMapFilters } from '@/components/opportunity-map/OpportunityMapFilters';
import { OpportunityMapTable } from '@/components/opportunity-map/OpportunityMapTable';

export default function OpportunityMap() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useOpportunityMap({ searchTerm });

  const rows = data?.rows || [];
  const metrics = data?.metrics || {
    totalClientes: 0,
    planejamentoTotal: 0,
    planejamentoCount: 0,
    paAtivoTotal: 0,
    paAtivoCount: 0,
    creditoTotal: 0,
    creditoCount: 0,
    prunusTotal: 0,
    prunusCount: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Map className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Mapa de Oportunidades</h1>
        </div>
        <p className="text-muted-foreground">
          Visualize os produtos ativos de cada cliente em sua carteira
        </p>
      </div>

      <OpportunityMapMetricsCards metrics={metrics} isLoading={isLoading} />

      <OpportunityMapFilters searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <OpportunityMapTable rows={rows} isLoading={isLoading} />
    </div>
  );
}
