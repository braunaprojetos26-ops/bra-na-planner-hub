import { format, parseISO, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Clock, AlertCircle, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMarkMeetingCompleted } from '@/hooks/useClientMeetings';
import type { ClientPlanMeeting } from '@/types/clients';

interface ClientMeetingsTimelineProps {
  meetings: ClientPlanMeeting[];
}

export function ClientMeetingsTimeline({ meetings }: ClientMeetingsTimelineProps) {
  const markCompleted = useMarkMeetingCompleted();

  const sortedMeetings = [...meetings].sort((a, b) => a.meeting_number - b.meeting_number);

  const getStatusConfig = (meeting: ClientPlanMeeting) => {
    const date = parseISO(meeting.scheduled_date);
    const isOverdue = isBefore(date, new Date()) && !isToday(date) && meeting.status !== 'completed';

    if (meeting.status === 'completed') {
      return {
        icon: Check,
        label: 'Realizada',
        variant: 'default' as const,
        className: 'text-green-500',
      };
    }
    if (isOverdue) {
      return {
        icon: AlertCircle,
        label: 'Atrasada',
        variant: 'destructive' as const,
        className: 'text-red-500',
      };
    }
    if (meeting.status === 'scheduled') {
      return {
        icon: Calendar,
        label: 'Agendada',
        variant: 'secondary' as const,
        className: 'text-blue-500',
      };
    }
    return {
      icon: Clock,
      label: 'Pendente',
      variant: 'outline' as const,
      className: 'text-muted-foreground',
    };
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Tema</TableHead>
            <TableHead className="w-32">Data</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMeetings.map((meeting) => {
            const statusConfig = getStatusConfig(meeting);
            const StatusIcon = statusConfig.icon;

            return (
              <TableRow key={meeting.id}>
                <TableCell className="font-medium">{meeting.meeting_number}</TableCell>
                <TableCell>{meeting.theme}</TableCell>
                <TableCell>
                  {format(parseISO(meeting.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${statusConfig.className}`} />
                    <Badge variant={statusConfig.variant} className="text-xs">
                      {statusConfig.label}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {meeting.status !== 'completed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markCompleted.mutate(meeting.id)}
                      disabled={markCompleted.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Concluir
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
