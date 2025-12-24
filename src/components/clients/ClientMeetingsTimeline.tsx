import { useState } from 'react';
import { format, parseISO, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Clock, AlertCircle, Calendar, Pencil, Link2, Unlink } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMarkMeetingCompleted } from '@/hooks/useClientMeetings';
import { EditPlanMeetingModal } from './EditPlanMeetingModal';
import { LinkMeetingModal } from './LinkMeetingModal';
import type { ClientPlanMeeting } from '@/types/clients';

interface ClientMeetingsTimelineProps {
  meetings: ClientPlanMeeting[];
  contactId: string;
}

export function ClientMeetingsTimeline({ meetings, contactId }: ClientMeetingsTimelineProps) {
  const markCompleted = useMarkMeetingCompleted();
  const [editMeeting, setEditMeeting] = useState<ClientPlanMeeting | null>(null);
  const [linkMeeting, setLinkMeeting] = useState<ClientPlanMeeting | null>(null);

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

  const isPlaceholderTheme = (theme: string, meetingNumber: number) => {
    return theme === `Reunião ${meetingNumber}`;
  };

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Tema</TableHead>
              <TableHead className="w-32">Data</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-40 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMeetings.map((meeting) => {
              const statusConfig = getStatusConfig(meeting);
              const StatusIcon = statusConfig.icon;
              const isPlaceholder = isPlaceholderTheme(meeting.theme, meeting.meeting_number);
              const isLinked = !!meeting.meeting_id;

              return (
                <TableRow key={meeting.id}>
                  <TableCell className="font-medium">{meeting.meeting_number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={isPlaceholder ? 'text-muted-foreground italic' : ''}>
                        {meeting.theme}
                      </span>
                      {isPlaceholder && (
                        <Badge variant="outline" className="text-xs">
                          A definir
                        </Badge>
                      )}
                      {isLinked && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Link2 className="h-3 w-3 text-primary" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Vinculada a uma reunião realizada
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
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
                    <div className="flex justify-end gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditMeeting(meeting)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar tema/data</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setLinkMeeting(meeting)}
                            >
                              {isLinked ? (
                                <Unlink className="h-4 w-4 text-primary" />
                              ) : (
                                <Link2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isLinked ? 'Gerenciar vínculo' : 'Vincular reunião realizada'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {meeting.status !== 'completed' && !isLinked && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => markCompleted.mutate(meeting.id)}
                                disabled={markCompleted.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Marcar como concluída</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <EditPlanMeetingModal
        open={!!editMeeting}
        onOpenChange={(open) => !open && setEditMeeting(null)}
        meeting={editMeeting}
      />

      <LinkMeetingModal
        open={!!linkMeeting}
        onOpenChange={(open) => !open && setLinkMeeting(null)}
        planMeeting={linkMeeting}
        contactId={contactId}
      />
    </>
  );
}
