import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths } from 'date-fns';
import { CATEGORY_CONFIG, CategoryKey } from '@/hooks/useHealthScore';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { Sankey, Tooltip, Layer, Rectangle } from 'recharts';

interface MovementTabProps {
  ownerId?: string;
}

interface Movement {
  contactId: string;
  contactName: string;
  previousCategory: CategoryKey;
  currentCategory: CategoryKey;
  previousScore: number;
  currentScore: number;
  direction: 'up' | 'down';
}

type Period = '7d' | '30d' | '90d';

// Custom node component for Sankey
const SankeyNode = ({ x, y, width, height, index, payload }: any) => {
  const category = payload.name.replace(' (anterior)', '').replace(' (atual)', '').toLowerCase();
  const categoryKey = category === 'ótimo' ? 'otimo' 
    : category === 'estável' ? 'estavel' 
    : category === 'atenção' ? 'atencao' 
    : 'critico';
  
  const config = CATEGORY_CONFIG[categoryKey as CategoryKey] || CATEGORY_CONFIG.estavel;
  
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={config.color}
      fillOpacity={0.9}
      rx={4}
      ry={4}
    />
  );
};

export function MovementTab({ ownerId }: MovementTabProps) {
  const [period, setPeriod] = useState<Period>('7d');

  const getPeriodDays = () => {
    switch (period) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  };

  const { data: movements, isLoading } = useQuery({
    queryKey: ['health-score-movements', ownerId, period],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const pastDate = format(subDays(new Date(), getPeriodDays()), 'yyyy-MM-dd');

      // Get today's snapshots
      let todayQuery = supabase
        .from('health_score_snapshots')
        .select('contact_id, category, total_score')
        .eq('snapshot_date', today);

      if (ownerId) {
        todayQuery = todayQuery.eq('owner_id', ownerId);
      }

      const { data: todayData, error: todayError } = await todayQuery;
      if (todayError) throw todayError;

      // Get past date snapshots
      let pastQuery = supabase
        .from('health_score_snapshots')
        .select('contact_id, category, total_score')
        .eq('snapshot_date', pastDate);

      if (ownerId) {
        pastQuery = pastQuery.eq('owner_id', ownerId);
      }

      const { data: pastData, error: pastError } = await pastQuery;
      if (pastError) throw pastError;

      // Get contact names
      const contactIds = [...new Set([
        ...(todayData?.map(d => d.contact_id) || []),
        ...(pastData?.map(d => d.contact_id) || []),
      ])];

      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name')
        .in('id', contactIds);

      const contactMap = new Map(contacts?.map(c => [c.id, c.full_name]) || []);

      // Calculate movements
      const movements: Movement[] = [];
      const categoryOrder: CategoryKey[] = ['critico', 'atencao', 'estavel', 'otimo'];

      todayData?.forEach((today) => {
        const pastDateData = pastData?.find(w => w.contact_id === today.contact_id);
        if (!pastDateData) return;

        const todayCategory = today.category as CategoryKey;
        const pastCategory = pastDateData.category as CategoryKey;

        if (todayCategory !== pastCategory) {
          const todayIndex = categoryOrder.indexOf(todayCategory);
          const pastIndex = categoryOrder.indexOf(pastCategory);

          movements.push({
            contactId: today.contact_id,
            contactName: contactMap.get(today.contact_id) || 'Cliente',
            previousCategory: pastCategory,
            currentCategory: todayCategory,
            previousScore: pastDateData.total_score,
            currentScore: today.total_score,
            direction: todayIndex > pastIndex ? 'up' : 'down',
          });
        }
      });

      return movements;
    },
  });

  // Build Sankey data
  const sankeyData = useMemo(() => {
    if (!movements || movements.length === 0) return null;

    const categories: CategoryKey[] = ['otimo', 'estavel', 'atencao', 'critico'];
    
    // Create nodes: previous categories + current categories
    const nodes = [
      ...categories.map(c => ({ name: `${CATEGORY_CONFIG[c].label} (anterior)` })),
      ...categories.map(c => ({ name: `${CATEGORY_CONFIG[c].label} (atual)` })),
    ];

    // Create links based on movements
    const linkMap = new Map<string, number>();
    
    movements.forEach((m) => {
      const sourceIndex = categories.indexOf(m.previousCategory);
      const targetIndex = categories.indexOf(m.currentCategory) + 4; // +4 because current categories start at index 4
      const key = `${sourceIndex}-${targetIndex}`;
      linkMap.set(key, (linkMap.get(key) || 0) + 1);
    });

    const links = Array.from(linkMap.entries()).map(([key, value]) => {
      const [source, target] = key.split('-').map(Number);
      return { source, target, value };
    });

    return { nodes, links };
  }, [movements]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-12 bg-muted rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const upMovements = movements?.filter(m => m.direction === 'up') || [];
  const downMovements = movements?.filter(m => m.direction === 'down') || [];

  const renderMovementCard = (movement: Movement) => (
    <div 
      key={movement.contactId}
      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{movement.contactName}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge 
            variant="outline"
            className="text-xs"
            style={{ 
              borderColor: CATEGORY_CONFIG[movement.previousCategory].color,
              color: CATEGORY_CONFIG[movement.previousCategory].color,
            }}
          >
            {CATEGORY_CONFIG[movement.previousCategory].label}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge 
            variant="outline"
            className="text-xs"
            style={{ 
              borderColor: CATEGORY_CONFIG[movement.currentCategory].color,
              color: CATEGORY_CONFIG[movement.currentCategory].color,
            }}
          >
            {CATEGORY_CONFIG[movement.currentCategory].label}
          </Badge>
        </div>
      </div>
      <div className="text-right ml-4">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">{movement.previousScore}</span>
          <span className="text-muted-foreground">→</span>
          <span className={cn(
            "text-sm font-medium",
            movement.direction === 'up' ? 'text-green-600' : 'text-red-600'
          )}>
            {movement.currentScore}
          </span>
        </div>
      </div>
    </div>
  );

  const periodLabel = period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias';

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Período de comparação:</span>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Subiram</span>
            </div>
            <p className="text-2xl font-bold mt-1">{upMovements.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Desceram</span>
            </div>
            <p className="text-2xl font-bold mt-1">{downMovements.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{(movements?.length || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Período</span>
            </div>
            <p className="text-lg font-medium mt-1">Últimos {periodLabel}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sankey Diagram */}
      {sankeyData && sankeyData.links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo de Movimentação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <Sankey
                width={800}
                height={300}
                data={sankeyData}
                node={<SankeyNode />}
                nodePadding={50}
                nodeWidth={20}
                linkCurvature={0.5}
                margin={{ top: 20, right: 200, bottom: 20, left: 20 }}
                link={{ stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.3 }}
              >
                <Tooltip 
                  formatter={(value, name) => [`${value} cliente(s)`, 'Movimentação']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </Sankey>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {(['otimo', 'estavel', 'atencao', 'critico'] as CategoryKey[]).map((cat) => (
                <div key={cat} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CATEGORY_CONFIG[cat].color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {CATEGORY_CONFIG[cat].label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movement Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Up Movements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-green-600" />
              Subiram de Categoria
              <Badge variant="secondary" className="ml-auto">
                {upMovements.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cliente subiu de categoria neste período.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {upMovements.map(renderMovementCard)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Down Movements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-red-600" />
              Desceram de Categoria
              <Badge variant="secondary" className="ml-auto">
                {downMovements.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {downMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cliente desceu de categoria neste período.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {downMovements.map(renderMovementCard)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
