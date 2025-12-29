import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORY_CONFIG, CategoryKey } from '@/hooks/useHealthScore';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Users, 
  AlertTriangle, 
  Calendar,
  Settings,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface MovementTabProps {
  ownerIds?: string[];
  startDate?: Date;
  endDate?: Date;
}

interface Movement {
  contactId: string;
  contactName: string;
  previousCategory: CategoryKey | 'novo';
  currentCategory: CategoryKey | 'perdido';
  previousScore: number;
  currentScore: number;
}

interface MovementSummary {
  melhorando: number;
  piorando: number;
  estaveis: number;
  novos: number;
  perdidos: number;
}

interface CategoryFlow {
  from: CategoryKey | 'novo';
  to: CategoryKey | 'perdido';
  count: number;
}

type Period = '30d' | '60d' | '90d' | 'year';

export function MovementTab({ ownerIds, startDate, endDate }: MovementTabProps) {
  const [period, setPeriod] = useState<Period>('30d');
  const hasCustomDateRange = startDate && endDate;

  const getDateRange = () => {
    if (hasCustomDateRange) {
      return { 
        end: endDate, 
        start: startDate,
        endStr: format(endDate, 'yyyy-MM-dd'),
        startStr: format(startDate, 'yyyy-MM-dd')
      };
    }
    
    const end = new Date();
    let start: Date;
    
    switch (period) {
      case '30d': start = subDays(end, 30); break;
      case '60d': start = subDays(end, 60); break;
      case '90d': start = subDays(end, 90); break;
      case 'year': start = startOfYear(end); break;
      default: start = subDays(end, 30);
    }
    
    return { 
      end, 
      start,
      endStr: format(end, 'yyyy-MM-dd'),
      startStr: format(start, 'yyyy-MM-dd')
    };
  };

  const dateRange = getDateRange();

  const { data, isLoading } = useQuery({
    queryKey: ['health-score-movements', ownerIds, period, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      // Get end date snapshots (current state)
      let endQuery = supabase
        .from('health_score_snapshots')
        .select('contact_id, category, total_score, owner_id')
        .eq('snapshot_date', dateRange.endStr);

      if (ownerIds && ownerIds.length > 0) {
        endQuery = endQuery.in('owner_id', ownerIds);
      }

      const { data: endData, error: endError } = await endQuery;
      if (endError) throw endError;

      // Get start date snapshots (previous state)
      let startQuery = supabase
        .from('health_score_snapshots')
        .select('contact_id, category, total_score, owner_id')
        .eq('snapshot_date', dateRange.startStr);

      if (ownerIds && ownerIds.length > 0) {
        startQuery = startQuery.in('owner_id', ownerIds);
      }

      const { data: startData, error: startError } = await startQuery;
      if (startError) throw startError;

      // Get contact names
      const allContactIds = [...new Set([
        ...(endData?.map(d => d.contact_id) || []),
        ...(startData?.map(d => d.contact_id) || []),
      ])];

      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name')
        .in('id', allContactIds);

      const contactMap = new Map(contacts?.map(c => [c.id, c.full_name]) || []);

      // Build maps for comparison
      const startMap = new Map(startData?.map(s => [s.contact_id, s]) || []);
      const endMap = new Map(endData?.map(e => [e.contact_id, e]) || []);

      const movements: Movement[] = [];
      const categoryOrder: CategoryKey[] = ['critico', 'atencao', 'estavel', 'otimo'];
      const summary: MovementSummary = { melhorando: 0, piorando: 0, estaveis: 0, novos: 0, perdidos: 0 };
      const flows: CategoryFlow[] = [];

      // Process clients in end period
      endData?.forEach((end) => {
        const start = startMap.get(end.contact_id);
        
        if (!start) {
          // New client
          summary.novos++;
          movements.push({
            contactId: end.contact_id,
            contactName: contactMap.get(end.contact_id) || 'Cliente',
            previousCategory: 'novo',
            currentCategory: end.category as CategoryKey,
            previousScore: 0,
            currentScore: end.total_score,
          });
          flows.push({ from: 'novo', to: end.category as CategoryKey, count: 1 });
        } else {
          const startCategory = start.category as CategoryKey;
          const endCategory = end.category as CategoryKey;
          
          if (startCategory === endCategory) {
            summary.estaveis++;
          } else {
            const startIndex = categoryOrder.indexOf(startCategory);
            const endIndex = categoryOrder.indexOf(endCategory);
            
            if (endIndex > startIndex) {
              summary.melhorando++;
            } else {
              summary.piorando++;
            }
          }
          
          movements.push({
            contactId: end.contact_id,
            contactName: contactMap.get(end.contact_id) || 'Cliente',
            previousCategory: startCategory,
            currentCategory: endCategory,
            previousScore: start.total_score,
            currentScore: end.total_score,
          });
          flows.push({ from: startCategory, to: endCategory, count: 1 });
        }
      });

      // Process lost clients (in start but not in end)
      startData?.forEach((start) => {
        if (!endMap.has(start.contact_id)) {
          summary.perdidos++;
          movements.push({
            contactId: start.contact_id,
            contactName: contactMap.get(start.contact_id) || 'Cliente',
            previousCategory: start.category as CategoryKey,
            currentCategory: 'perdido',
            previousScore: start.total_score,
            currentScore: 0,
          });
          flows.push({ from: start.category as CategoryKey, to: 'perdido', count: 1 });
        }
      });

      // Aggregate flows
      const aggregatedFlows = flows.reduce((acc, flow) => {
        const key = `${flow.from}-${flow.to}`;
        if (!acc[key]) {
          acc[key] = { from: flow.from, to: flow.to, count: 0 };
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, CategoryFlow>);

      return {
        movements,
        summary,
        flows: Object.values(aggregatedFlows).sort((a, b) => b.count - a.count),
        startData: startData || [],
        endData: endData || [],
      };
    },
  });

  // Calculate category net changes
  const netChanges = useMemo(() => {
    if (!data) return [];
    
    const categories: CategoryKey[] = ['otimo', 'estavel', 'atencao', 'critico'];
    
    return categories.map(cat => {
      const startCount = data.startData.filter(s => s.category === cat).length;
      const endCount = data.endData.filter(e => e.category === cat).length;
      const netChange = endCount - startCount;
      
      return {
        category: cat,
        label: CATEGORY_CONFIG[cat].label,
        color: CATEGORY_CONFIG[cat].color,
        startCount,
        endCount,
        netChange,
      };
    });
  }, [data]);

  // Prepare flow chart data (inflow vs outflow per category)
  const flowChartData = useMemo(() => {
    if (!data) return [];
    
    const categories: CategoryKey[] = ['otimo', 'estavel', 'atencao', 'critico'];
    
    return categories.map(cat => {
      const inflow = data.movements.filter(m => 
        m.currentCategory === cat && m.previousCategory !== cat
      ).length;
      
      const outflow = data.movements.filter(m => 
        m.previousCategory === cat && m.currentCategory !== cat
      ).length;
      
      return {
        name: CATEGORY_CONFIG[cat].label,
        entrada: inflow,
        saida: outflow,
      };
    });
  }, [data]);

  // Prepare origin/destination pie data
  const originPieData = useMemo(() => {
    if (!data) return [];
    
    const categories: (CategoryKey | 'novo')[] = ['otimo', 'estavel', 'atencao', 'critico'];
    
    return categories.map(cat => {
      const count = data.movements.filter(m => m.previousCategory === cat).length;
      return {
        name: cat === 'novo' ? 'Novo' : CATEGORY_CONFIG[cat as CategoryKey].label,
        value: count,
        color: cat === 'novo' ? 'hsl(var(--muted-foreground))' : CATEGORY_CONFIG[cat as CategoryKey].color,
      };
    }).filter(d => d.value > 0);
  }, [data]);

  const destinationPieData = useMemo(() => {
    if (!data) return [];
    
    const categories: (CategoryKey | 'perdido')[] = ['otimo', 'estavel', 'atencao', 'critico'];
    
    return categories.map(cat => {
      const count = data.movements.filter(m => m.currentCategory === cat).length;
      return {
        name: cat === 'perdido' ? 'Perdido' : CATEGORY_CONFIG[cat as CategoryKey].label,
        value: count,
        color: cat === 'perdido' ? 'hsl(var(--destructive))' : CATEGORY_CONFIG[cat as CategoryKey].color,
      };
    }).filter(d => d.value > 0);
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="pt-6">
            <div className="h-32 bg-muted rounded" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getCategoryDot = (category: CategoryKey | 'novo' | 'perdido') => {
    if (category === 'novo') {
      return <div className="w-3 h-3 rounded-full bg-muted-foreground" />;
    }
    if (category === 'perdido') {
      return <div className="w-3 h-3 rounded-full bg-destructive" />;
    }
    return (
      <div 
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: CATEGORY_CONFIG[category].color }}
      />
    );
  };

  const getCategoryLabel = (category: CategoryKey | 'novo' | 'perdido') => {
    if (category === 'novo') return 'Novo';
    if (category === 'perdido') return 'Perdido';
    return CATEGORY_CONFIG[category].label;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Movement Sankey Diagram</h2>
        <p className="text-sm text-muted-foreground">
          Fluxo de clientes entre categorias de Health Score
        </p>
      </div>

      {/* Period Selection Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Período de Análise
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecione o período para comparar mudanças de categoria dos clientes
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Date Range Display */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(dateRange.start, 'dd/MM/yyyy')} - {format(dateRange.end, 'dd/MM/yyyy')}
              </span>
            </div>

            {/* Period Preset Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant={period === '30d' && !hasCustomDateRange ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('30d')}
                disabled={!!hasCustomDateRange}
              >
                30 dias
              </Button>
              <Button
                variant={period === '60d' && !hasCustomDateRange ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('60d')}
                disabled={!!hasCustomDateRange}
              >
                60 dias
              </Button>
              <Button
                variant={period === '90d' && !hasCustomDateRange ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('90d')}
                disabled={!!hasCustomDateRange}
              >
                90 dias
              </Button>
              <Button
                variant={period === 'year' && !hasCustomDateRange ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('year')}
                disabled={!!hasCustomDateRange}
              >
                Ano atual
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-3">
            Comparando estado dos clientes de {format(dateRange.start, 'dd/MM/yyyy', { locale: ptBR })} até {format(dateRange.end, 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-500">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-3xl font-bold text-green-500 mt-1">{data?.summary.melhorando || 0}</p>
            <p className="text-sm text-muted-foreground">Melhorando</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-500">
              <TrendingDown className="h-4 w-4" />
            </div>
            <p className="text-3xl font-bold text-red-500 mt-1">{data?.summary.piorando || 0}</p>
            <p className="text-sm text-muted-foreground">Piorando</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
            </div>
            <p className="text-3xl font-bold mt-1">{data?.summary.estaveis || 0}</p>
            <p className="text-sm text-muted-foreground">Estáveis</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-500">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-3xl font-bold text-blue-500 mt-1">{data?.summary.novos || 0}</p>
            <p className="text-sm text-muted-foreground">Novos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-3xl font-bold text-red-400 mt-1">{data?.summary.perdidos || 0}</p>
            <p className="text-sm text-muted-foreground">Perdidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Flow List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Fluxo de Movimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.flows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma movimentação encontrada no período.
            </p>
          ) : (
            <div className="space-y-2">
              {data?.flows.slice(0, 10).map((flow, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getCategoryDot(flow.from)}
                    <span className="text-sm font-medium">{getCategoryLabel(flow.from)}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    {getCategoryDot(flow.to)}
                    <span className="text-sm font-medium">{getCategoryLabel(flow.to)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{flow.count}</span>
                    <span className="text-sm text-muted-foreground ml-1">clientes</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flow by Category Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Fluxo por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="entrada" name="Entrada" fill="hsl(142, 76%, 36%)" />
                  <Bar dataKey="saida" name="Saída" fill="hsl(0, 84%, 60%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Net Change Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Mudança Líquida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {netChanges.map((item) => (
                <div 
                  key={item.category}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.netChange > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    ) : item.netChange < 0 ? (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    ) : null}
                    <span className={cn(
                      "font-bold",
                      item.netChange > 0 ? "text-green-500" : 
                      item.netChange < 0 ? "text-red-500" : 
                      "text-muted-foreground"
                    )}>
                      {item.netChange > 0 ? '+' : ''}{item.netChange}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Pie Charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Distribuição de Movimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Origin Pie */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-4">
                Movimentos por Categoria de Origem
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={originPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                    >
                      {originPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} clientes`, 'Quantidade']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Destination Pie */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-4">
                Movimentos por Categoria de Destino
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={destinationPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                    >
                      {destinationPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} clientes`, 'Quantidade']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
