import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TeamMemberMetrics } from '@/hooks/useTeamAnalytics';
import { getPositionLabel } from '@/lib/positionLabels';

interface TeamMembersTableProps {
  members: TeamMemberMetrics[];
  isLoading: boolean;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function TeamMembersTable({ members, isLoading }: TeamMembersTableProps) {
  if (isLoading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="animate-pulse p-4">
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Nenhum dado encontrado para o período selecionado.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Planejador</TableHead>
            <TableHead className="font-semibold">Área</TableHead>
            <TableHead className="font-semibold">Líder</TableHead>
            <TableHead className="font-semibold text-center">Vnd Planej</TableHead>
            <TableHead className="font-semibold text-center">Vnd Seguro</TableHead>
            <TableHead className="font-semibold text-center">PB Total</TableHead>
            <TableHead className="font-semibold text-center">Clientes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.userId} className="hover:bg-muted/30">
              <TableCell className="font-medium">{member.fullName}</TableCell>
              <TableCell>
                {member.position ? (
                  <Badge variant="outline" className="font-normal">
                    {getPositionLabel(member.position as any)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {member.leaderName || <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={member.planningContracts > 0 ? 'default' : 'secondary'}>
                  {member.planningContracts}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={member.insuranceContracts > 0 ? 'default' : 'secondary'}>
                  {member.insuranceContracts}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-semibold text-amber-600">
                {formatNumber(member.totalPB)}
              </TableCell>
              <TableCell className="text-center">
                {member.clientCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
