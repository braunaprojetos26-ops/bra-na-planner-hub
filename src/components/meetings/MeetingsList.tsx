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

  const handleStatusChange = async (meeting: Meeting, status: string) => {
    try {
      await updateStatus.mutateAsync({ 
        meetingId: meeting.id, 
        status,
        contactId: meeting.contact_id,
        meetingType: meeting.meeting_type,
      });
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
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            Reuniões
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="animate-pulse space-y-1.5">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 bg-muted rounded-md" />
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
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            Reuniões ({meetings?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {meetings?.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhuma reunião agendada.
            </p>
          ) : (
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {upcomingMeetings.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-medium text-muted-foreground uppercase">Próximas</h4>
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
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-medium text-muted-foreground uppercase">Histórico</h4>
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
            </div>
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

const statusColors = {
  scheduled: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-orange-500',
  rescheduled: 'bg-purple-500',
};

function MeetingCard({
  meeting,
  onStatusChange,
  onReschedule,
}: {
  meeting: Meeting;
  onStatusChange: (meeting: Meeting, status: string) => void;
  onReschedule: (meeting: Meeting) => void;
}) {
  const status = statusConfig[meeting.status as keyof typeof statusConfig] || statusConfig.scheduled;
  const statusColor = statusColors[meeting.status as keyof typeof statusColors] || statusColors.scheduled;
  const scheduledDate = new Date(meeting.scheduled_at);

  return (
    <div className="flex items-start gap-2 p-2 bg-secondary/50 rounded-md">
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusColor}`} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium">{meeting.meeting_type}</span>
          <Badge variant={status.variant} className="text-[10px] px-1.5 py-0 h-4">
            {status.label}
          </Badge>
          {meeting.reschedule_count > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
              <RefreshCw className="h-2.5 w-2.5" />
              #{meeting.reschedule_count}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Calendar className="h-3 w-3" />
            {format(scheduledDate, "dd/MM/yy", { locale: ptBR })}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {format(scheduledDate, "HH:mm", { locale: ptBR })}
          </span>
          {meeting.participants && meeting.participants.length > 0 && (
            <span className="flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {meeting.participants.length}
            </span>
          )}
          {meeting.allows_companion && (
            <span className="flex items-center gap-0.5 text-green-600">
              <UserCheck className="h-3 w-3" />
            </span>
          )}
        </div>

        {meeting.notes && (
          <p className="text-[10px] text-muted-foreground line-clamp-1">
            {meeting.notes}
          </p>
        )}
      </div>

      {meeting.status === 'scheduled' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onStatusChange(meeting, 'completed')}>
              <CheckCircle className="h-3.5 w-3.5 mr-2 text-green-600" />
              Realizada
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReschedule(meeting)}>
              <RefreshCw className="h-3.5 w-3.5 mr-2 text-blue-600" />
              Reagendar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(meeting, 'cancelled')}>
              <XCircle className="h-3.5 w-3.5 mr-2 text-orange-600" />
              Cancelar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
