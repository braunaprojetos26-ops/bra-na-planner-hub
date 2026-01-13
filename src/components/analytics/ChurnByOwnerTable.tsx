import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { ChurnByOwner } from "@/hooks/useChurnAnalytics";

interface ChurnByOwnerTableProps {
  data: ChurnByOwner[] | undefined;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getChurnBadge(rate: number) {
  if (rate === 0) {
    return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">0%</Badge>;
  }
  if (rate <= 5) {
    return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">{rate.toFixed(1)}%</Badge>;
  }
  if (rate <= 10) {
    return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{rate.toFixed(1)}%</Badge>;
  }
  return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{rate.toFixed(1)}%</Badge>;
}

export function ChurnByOwnerTable({ data, isLoading }: ChurnByOwnerTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = data && data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Churn por Planejador</CardTitle>
        <CardDescription>Taxa de cancelamento e valor perdido por responsável</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Sem dados de churn por planejador
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Planejador</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Cancelamentos</TableHead>
                <TableHead className="text-right">Taxa Churn</TableHead>
                <TableHead className="text-right">Valor Perdido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.ownerId}>
                  <TableCell className="font-medium">{row.ownerName}</TableCell>
                  <TableCell className="text-right">{row.totalClients}</TableCell>
                  <TableCell className="text-right">{row.cancellations}</TableCell>
                  <TableCell className="text-right">{getChurnBadge(row.churnRate)}</TableCell>
                  <TableCell className="text-right text-destructive">
                    {row.lostValue > 0 ? formatCurrency(row.lostValue) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
