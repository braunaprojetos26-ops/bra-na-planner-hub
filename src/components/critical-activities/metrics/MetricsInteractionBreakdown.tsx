import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface InteractionByChannel {
  month: string; // "MMM/yy"
  monthKey: string; // "yyyy-MM"
  [channel: string]: number | string;
}

export interface PlannerInteractionRanking {
  month: string;
  userId: string;
  name: string;
  count: number;
}

interface Props {
  data: InteractionByChannel[];
  channels: string[];
  plannerRanking: PlannerInteractionRanking[];
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  phone: 'Ligação',
  video_call: 'Vídeo chamada',
  in_person: 'Reunião presencial',
  not_informed: 'Não informado',
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: 'hsl(142, 70%, 40%)',
  email: 'hsl(220, 70%, 35%)',
  phone: 'hsl(175, 60%, 45%)',
  video_call: 'hsl(260, 50%, 50%)',
  in_person: 'hsl(35, 70%, 50%)',
  not_informed: 'hsl(50, 70%, 50%)',
};

function getChannelColor(channel: string, index: number): string {
  if (CHANNEL_COLORS[channel]) return CHANNEL_COLORS[channel];
  const hue = (index * 67) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function MetricsInteractionBreakdown({ data, channels, plannerRanking }: Props) {
  const monthKeys = useMemo(() => data.map(d => d.monthKey as string), [data]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => monthKeys[monthKeys.length - 1] || '');

  const filteredRanking = useMemo(
    () => plannerRanking
      .filter(r => r.month === selectedMonth)
      .sort((a, b) => b.count - a.count)
      .map((r, i) => ({ ...r, position: i + 1 })),
    [plannerRanking, selectedMonth]
  );

  const selectedLabel = useMemo(() => {
    const entry = data.find(d => d.monthKey === selectedMonth);
    return entry?.month || selectedMonth;
  }, [data, selectedMonth]);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-base">Detalhamento de Registros de Relacionamento Concluídos</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stacked Bar Chart */}
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      color: 'hsl(var(--foreground))',
                    }}
                    formatter={(value: number, name: string) => [value, CHANNEL_LABELS[name] || name]}
                  />
                  <Legend formatter={(value) => CHANNEL_LABELS[value] || value} />
                  {channels.map((ch, i) => (
                    <Bar
                      key={ch}
                      dataKey={ch}
                      name={ch}
                      stackId="a"
                      fill={getChannelColor(ch, i)}
                      radius={i === channels.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Planner Ranking */}
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Mês</p>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.map(d => (
                      <SelectItem key={d.monthKey} value={d.monthKey as string}>
                        {d.month as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem registros neste mês</p>
              ) : (
                <div className="max-h-[280px] overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Planejador</TableHead>
                        <TableHead className="text-xs text-right">Registros</TableHead>
                        <TableHead className="text-xs text-right">Posição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRanking.map(r => (
                        <TableRow key={r.userId}>
                          <TableCell className="text-xs py-1.5">{r.name}</TableCell>
                          <TableCell className="text-xs text-right py-1.5">{r.count}</TableCell>
                          <TableCell className="text-xs text-right py-1.5">{r.position}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
