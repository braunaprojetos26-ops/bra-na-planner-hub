import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { CATEGORY_CONFIG, CategoryKey } from '@/hooks/useHealthScore';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function MovementTab({ ownerId }: MovementTabProps) {
  const { data: movements, isLoading } = useQuery({
    queryKey: ['health-score-movements', ownerId],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

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

      // Get week ago snapshots
      let weekQuery = supabase
        .from('health_score_snapshots')
        .select('contact_id, category, total_score')
        .eq('snapshot_date', weekAgo);

      if (ownerId) {
        weekQuery = weekQuery.eq('owner_id', ownerId);
      }

      const { data: weekData, error: weekError } = await weekQuery;
      if (weekError) throw weekError;

      // Get contact names
      const contactIds = [...new Set([
        ...(todayData?.map(d => d.contact_id) || []),
        ...(weekData?.map(d => d.contact_id) || []),
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
        const weekAgoData = weekData?.find(w => w.contact_id === today.contact_id);
        if (!weekAgoData) return;

        const todayCategory = today.category as CategoryKey;
        const weekCategory = weekAgoData.category as CategoryKey;

        if (todayCategory !== weekCategory) {
          const todayIndex = categoryOrder.indexOf(todayCategory);
          const weekIndex = categoryOrder.indexOf(weekCategory);

          movements.push({
            contactId: today.contact_id,
            contactName: contactMap.get(today.contact_id) || 'Cliente',
            previousCategory: weekCategory,
            currentCategory: todayCategory,
            previousScore: weekAgoData.total_score,
            currentScore: today.total_score,
            direction: todayIndex > weekIndex ? 'up' : 'down',
          });
        }
      });

      return movements;
    },
  });

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

  return (
    <div className="space-y-6">
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
            <p className="text-lg font-medium mt-1">Últimos 7 dias</p>
          </CardContent>
        </Card>
      </div>

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
