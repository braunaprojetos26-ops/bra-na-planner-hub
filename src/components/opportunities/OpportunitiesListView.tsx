import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, differenceInHours } from 'date-fns';
import { ArrowUpDown, Star, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Opportunity } from '@/types/opportunities';

interface OpportunitiesListViewProps {
  opportunities: Opportunity[];
}

type SortKey = 'contact' | 'funnel' | 'stage' | 'time' | 'status' | 'qualification' | 'owner';
type SortDirection = 'asc' | 'desc';

const statusLabels: Record<string, string> = {
  active: 'Em andamento',
  won: 'Vendido',
  lost: 'Perdido',
};

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

export function OpportunitiesListView({ opportunities }: OpportunitiesListViewProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('contact');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const formatTimeInStage = (enteredAt: string) => {
    const days = differenceInDays(new Date(), new Date(enteredAt));
    if (days >= 1) {
      return `${days}d`;
    }
    const hours = differenceInHours(new Date(), new Date(enteredAt));
    return `${hours}h`;
  };

  const getTimeInStageValue = (enteredAt: string) => {
    return new Date().getTime() - new Date(enteredAt).getTime();
  };

  const sortedOpportunities = [...opportunities].sort((a, b) => {
    let comparison = 0;

    switch (sortKey) {
      case 'contact':
        comparison = (a.contact?.full_name || '').localeCompare(b.contact?.full_name || '');
        break;
      case 'funnel':
        comparison = (a.current_funnel?.name || '').localeCompare(b.current_funnel?.name || '');
        break;
      case 'stage':
        comparison = (a.current_stage?.order_position || 0) - (b.current_stage?.order_position || 0);
        break;
      case 'time':
        comparison = getTimeInStageValue(b.stage_entered_at) - getTimeInStageValue(a.stage_entered_at);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'qualification':
        comparison = (b.qualification || 0) - (a.qualification || 0);
        break;
      case 'owner':
        comparison = (a.contact?.owner?.full_name || 'ZZZ').localeCompare(b.contact?.owner?.full_name || 'ZZZ');
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortableHeader = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium"
      onClick={() => handleSort(sortKeyValue)}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortableHeader label="Contato" sortKeyValue="contact" /></TableHead>
            <TableHead><SortableHeader label="Funil" sortKeyValue="funnel" /></TableHead>
            <TableHead><SortableHeader label="Etapa" sortKeyValue="stage" /></TableHead>
            <TableHead><SortableHeader label="Tempo" sortKeyValue="time" /></TableHead>
            <TableHead><SortableHeader label="Status" sortKeyValue="status" /></TableHead>
            <TableHead className="text-center"><SortableHeader label="Qualif." sortKeyValue="qualification" /></TableHead>
            <TableHead><SortableHeader label="Responsável" sortKeyValue="owner" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOpportunities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Nenhuma negociação encontrada
              </TableCell>
            </TableRow>
          ) : (
            sortedOpportunities.map(opportunity => (
              <TableRow
                key={opportunity.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/pipeline/${opportunity.id}`)}
              >
                <TableCell className="font-medium">
                  {opportunity.contact?.full_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {opportunity.current_funnel?.name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {opportunity.current_stage?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTimeInStage(opportunity.stage_entered_at)}
                </TableCell>
                <TableCell>
                  <Badge className={`${statusColors[opportunity.status]} text-xs`}>
                    {statusLabels[opportunity.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {opportunity.qualification ? (
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm">{opportunity.qualification}</span>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">
                      {opportunity.contact?.owner?.full_name || 'Sem responsável'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
