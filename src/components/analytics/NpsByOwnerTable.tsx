import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NpsByOwner {
  ownerId: string;
  ownerName: string;
  totalClients: number;
  responses: number;
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
  responseRate: number;
}

interface NpsByOwnerTableProps {
  data: NpsByOwner[];
}

export function NpsByOwnerTable({ data }: NpsByOwnerTableProps) {
  const getNpsColor = (score: number) => {
    if (score >= 75) return 'text-emerald-500';
    if (score >= 50) return 'text-green-500';
    if (score >= 0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getNpsBadgeVariant = (score: number) => {
    if (score >= 50) return 'default';
    if (score >= 0) return 'secondary';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">NPS por Planejador</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Sem dados para exibir
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Planejador</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead className="text-center">Respostas</TableHead>
                <TableHead className="text-center">Taxa</TableHead>
                <TableHead className="text-center">NPS</TableHead>
                <TableHead className="text-center">Promotores</TableHead>
                <TableHead className="text-center">Neutros</TableHead>
                <TableHead className="text-center">Detratores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.ownerId}>
                  <TableCell className="font-medium">{row.ownerName}</TableCell>
                  <TableCell className="text-center">{row.totalClients}</TableCell>
                  <TableCell className="text-center">{row.responses}</TableCell>
                  <TableCell className="text-center">{row.responseRate}%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getNpsBadgeVariant(row.npsScore)}>
                      {row.npsScore}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-emerald-500">{row.promoters}</TableCell>
                  <TableCell className="text-center text-yellow-500">{row.passives}</TableCell>
                  <TableCell className="text-center text-red-500">{row.detractors}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
