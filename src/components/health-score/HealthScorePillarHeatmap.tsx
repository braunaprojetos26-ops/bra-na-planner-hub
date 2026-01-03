import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutGrid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PillarMonthData {
  nps: number;
  referrals: number;
  payment: number;
  crossSell: number;
  meetings: number;
  whatsapp: number;
  total: number;
}

interface HealthScorePillarHeatmapProps {
  ownerIds?: string[];
  contactIds?: string[];
}

const PILLAR_CONFIG = [
  { key: 'nps', label: 'NPS' },
  { key: 'referrals', label: 'Indicações' },
  { key: 'payment', label: 'Pagamento' },
  { key: 'crossSell', label: 'Cross-sell' },
  { key: 'meetings', label: 'Reuniões' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'total', label: 'Score Geral' },
] as const;

// Get cell color based on score
const getCellColor = (score: number): string => {
  if (score >= 75) return 'bg-green-500/20 text-green-700 dark:text-green-400';
  if (score >= 50) return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
  if (score >= 30) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
  if (score > 0) return 'bg-red-500/20 text-red-700 dark:text-red-400';
  return 'bg-muted text-muted-foreground';
};

export function HealthScorePillarHeatmap({ ownerIds, contactIds }: HealthScorePillarHeatmapProps) {
  const [monthlyPillarData, setMonthlyPillarData] = useState<Map<string, PillarMonthData>>(new Map());
  const [months, setMonths] = useState<{ key: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPillarData() {
      setIsLoading(true);
      
      const monthsList: { key: string; label: string }[] = [];
      const dataMap = new Map<string, PillarMonthData>();
      const now = new Date();

      // Generate last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthKey = format(monthDate, 'yyyy-MM');
        const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');
        
        const monthLabel = i === 0 
          ? 'Atual' 
          : format(monthDate, 'MMM', { locale: ptBR }).charAt(0).toUpperCase() + 
            format(monthDate, 'MMM', { locale: ptBR }).slice(1);

        monthsList.push({ key: monthKey, label: monthLabel });

        let query = supabase
          .from('health_score_snapshots')
          .select('nps_score, referrals_score, payment_score, cross_sell_score, meetings_score, whatsapp_score, total_score')
          .gte('snapshot_date', start)
          .lte('snapshot_date', end);

        if (ownerIds && ownerIds.length > 0) {
          query = query.in('owner_id', ownerIds);
        }

        if (contactIds && contactIds.length > 0) {
          query = query.in('contact_id', contactIds);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching pillar data:', error);
          continue;
        }

        if (data && data.length > 0) {
          const pillarData: PillarMonthData = {
            nps: Math.round(data.reduce((sum, d) => sum + (d.nps_score || 0), 0) / data.length),
            referrals: Math.round(data.reduce((sum, d) => sum + (d.referrals_score || 0), 0) / data.length),
            payment: Math.round(data.reduce((sum, d) => sum + (d.payment_score || 0), 0) / data.length),
            crossSell: Math.round(data.reduce((sum, d) => sum + (d.cross_sell_score || 0), 0) / data.length),
            meetings: Math.round(data.reduce((sum, d) => sum + (d.meetings_score || 0), 0) / data.length),
            whatsapp: Math.round(data.reduce((sum, d) => sum + (d.whatsapp_score || 0), 0) / data.length),
            total: Math.round(data.reduce((sum, d) => sum + (d.total_score || 0), 0) / data.length),
          };
          dataMap.set(monthKey, pillarData);
        } else {
          dataMap.set(monthKey, {
            nps: 0, referrals: 0, payment: 0, crossSell: 0, meetings: 0, whatsapp: 0, total: 0,
          });
        }
      }

      setMonths(monthsList);
      setMonthlyPillarData(dataMap);
      setIsLoading(false);
    }

    fetchPillarData();
  }, [ownerIds, contactIds]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Mapa de Calor por Pilar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getValue = (monthKey: string, pillarKey: string): number => {
    const data = monthlyPillarData.get(monthKey);
    if (!data) return 0;
    return data[pillarKey as keyof PillarMonthData] || 0;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" />
          Mapa de Calor por Pilar
          <span className="text-xs text-muted-foreground font-normal ml-2">
            Evolução mensal de cada pilar
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">Pilar</TableHead>
                {months.map(month => (
                  <TableHead 
                    key={month.key} 
                    className={cn(
                      "text-center min-w-[60px]",
                      month.label === 'Atual' && "bg-primary/10 font-semibold"
                    )}
                  >
                    {month.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PILLAR_CONFIG.map(pillar => (
                <TableRow 
                  key={pillar.key}
                  className={pillar.key === 'total' ? 'font-semibold bg-muted/50' : ''}
                >
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    {pillar.label}
                  </TableCell>
                  {months.map(month => {
                    const value = getValue(month.key, pillar.key);
                    return (
                      <TableCell 
                        key={`${pillar.key}-${month.key}`}
                        className={cn(
                          "text-center text-sm font-medium",
                          getCellColor(value),
                          month.label === 'Atual' && "ring-2 ring-primary/30"
                        )}
                      >
                        {value > 0 ? value : '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30" />
            <span>Ótimo (≥75)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/30" />
            <span>Estável (50-74)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500/30" />
            <span>Atenção (30-49)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30" />
            <span>Crítico (&lt;30)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
