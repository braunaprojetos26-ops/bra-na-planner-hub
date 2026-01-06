import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProspectionAnalyticsData } from '@/hooks/useProspectionAnalytics';

interface ProspectionOwnerTableProps {
  data: ProspectionAnalyticsData | undefined;
  isLoading: boolean;
}

export function ProspectionOwnerTable({ data, isLoading }: ProspectionOwnerTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Planejador</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const ownerMetrics = data?.ownerMetrics || [];

  if (ownerMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Planejador</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by conversion rate descending
  const sortedMetrics = [...ownerMetrics].sort((a, b) => b.conversionRate - a.conversionRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desempenho por Planejador</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Planejador</TableHead>
              <TableHead className="text-center">Adicionados</TableHead>
              <TableHead className="text-center">Convertidos</TableHead>
              <TableHead className="text-center">Perdidos</TableHead>
              <TableHead className="text-center">Taxa de Conversão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMetrics.map((owner) => (
              <TableRow key={owner.ownerId}>
                <TableCell className="font-medium">{owner.ownerName}</TableCell>
                <TableCell className="text-center">{owner.added}</TableCell>
                <TableCell className="text-center text-green-600 font-medium">
                  {owner.converted}
                </TableCell>
                <TableCell className="text-center text-red-600 font-medium">
                  {owner.lost}
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={`font-medium ${
                      owner.conversionRate >= 50
                        ? 'text-green-600'
                        : owner.conversionRate >= 25
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}
                  >
                    {owner.conversionRate.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
