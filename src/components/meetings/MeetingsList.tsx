import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Users, UserCheck, MoreVertical, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMeetings, useUpdateMeetingStatus } from '@/hooks/useMeetings';
import { useToast } from '@/hooks/use-toast';
import { ScheduleMeetingModal } from './ScheduleMeetingModal';
import type { Meeting } from '@/types/meetings';

interface MeetingsListProps {
  contactId: string;
  contactName: string;
}

const statusConfig = {
  scheduled: { label: 'Agendada', variant: 'default' as const },
  completed: { label: 'Realizada', variant: 'secondary' as const },
  cancelled: { label: 'Cancelada', variant: 'outline' as const },
  rescheduled: { label: 'Reagendada', variant: 'outline' as const },
};

export function MeetingsList({ contactId, contactName }: MeetingsListProps) {
  const { data: meetings, isLoading } = useMeetings(contactId);
  const updateStatus = useUpdateMeetingStatus();
  const { toast } = useToast();
  const [reschedulingMeeting, setReschedulingMeeting] = useState<Meeting | null>(null);

  const handleStatusChange = async (meetingId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ meetingId, status });
      toast({
        title: 'Status atualizado',
        description: `Reunião marcada como ${statusConfig[status as keyof typeof statusConfig]?.label || status}.`,
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    }
  };

  const handleReschedule = (meeting: Meeting) => {
    setReschedulingMeeting(meeting);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reuniões Agendadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const upcomingMeetings = meetings?.filter((m) => m.status === 'scheduled') || [];
  const pastMeetings = meetings?.filter((m) => m.status !== 'scheduled') || [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reuniões ({meetings?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meetings?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma reunião agendada para este contato.
            </p>
          ) : (
            <>
              {upcomingMeetings.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Próximas</h4>
                  {upcomingMeetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onStatusChange={handleStatusChange}
                      onReschedule={handleReschedule}
                    />
                  ))}
                </div>
              )}

              {pastMeetings.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Histórico</h4>
                  {pastMeetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onStatusChange={handleStatusChange}
                      onReschedule={handleReschedule}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ScheduleMeetingModal
        open={!!reschedulingMeeting}
        onOpenChange={(open) => !open && setReschedulingMeeting(null)}
        contactId={contactId}
        contactName={contactName}
        reschedulingMeeting={reschedulingMeeting}
      />
    </>
  );
}

function MeetingCard({
  meeting,
  onStatusChange,
  onReschedule,
}: {
  meeting: Meeting;
  onStatusChange: (id: string, status: string) => void;
  onReschedule: (meeting: Meeting) => void;
}) {
  const status = statusConfig[meeting.status as keyof typeof statusConfig] || statusConfig.scheduled;
  const scheduledDate = new Date(meeting.scheduled_at);

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{meeting.meeting_type}</span>
            <Badge variant={status.variant} className="text-xs">
              {status.label}
            </Badge>
            {meeting.reschedule_count > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <RefreshCw className="h-3 w-3" />
                Reagendamento #{meeting.reschedule_count}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(scheduledDate, "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(scheduledDate, "HH:mm", { locale: ptBR })} ({meeting.duration_minutes}min)
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {meeting.participants && meeting.participants.length > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {meeting.participants.length} participante(s)
              </span>
            )}
            {meeting.allows_companion && (
              <span className="flex items-center gap-1 text-green-600">
                <UserCheck className="h-3.5 w-3.5" />
                Permite acompanhante
              </span>
            )}
          </div>

          {meeting.notes && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {meeting.notes}
            </p>
          )}
        </div>

        {meeting.status === 'scheduled' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange(meeting.id, 'completed')}>
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Marcar como realizada
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReschedule(meeting)}>
                <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
                Reagendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(meeting.id, 'cancelled')}>
                <XCircle className="h-4 w-4 mr-2 text-orange-600" />
                Cancelar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
