import { useState } from 'react';
import { format, isPast, isToday, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Plus, RefreshCw, CheckCircle, XCircle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOpportunityMeetings, useUpdateMeetingStatus } from '@/hooks/useMeetings';
import { ScheduleMeetingModal } from '@/components/meetings/ScheduleMeetingModal';
import type { Meeting } from '@/types/meetings';

interface OpportunityMeetingsSectionProps {
  opportunityId: string;
  contactId: string;
  contactName: string;
  isReadOnly?: boolean;
}

const statusLabels: Record<string, string> = {
  scheduled: 'Agendada',
  completed: 'Realizada',
  cancelled: 'Cancelada',
  rescheduled: 'Reagendada',
  no_show: 'Não compareceu',
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-muted text-muted-foreground',
  rescheduled: 'bg-yellow-100 text-yellow-800',
  no_show: 'bg-red-100 text-red-800',
};

export function OpportunityMeetingsSection({
  opportunityId,
  contactId,
  contactName,
  isReadOnly = false,
}: OpportunityMeetingsSectionProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [reschedulingMeeting, setReschedulingMeeting] = useState<Meeting | null>(null);

  const { data: meetings, isLoading } = useOpportunityMeetings(opportunityId);
  const updateStatus = useUpdateMeetingStatus();

  const handleUpdateStatus = (meeting: Meeting, status: string) => {
    updateStatus.mutate({
      meetingId: meeting.id,
      status,
      contactId: meeting.contact_id,
      meetingType: meeting.meeting_type,
    });
  };

  const handleReschedule = (meeting: Meeting) => {
    setReschedulingMeeting(meeting);
    setShowScheduleModal(true);
  };

  const formatMeetingDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) {
      return `Hoje às ${format(d, 'HH:mm', { locale: ptBR })}`;
    }
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getMeetingTimeStatus = (scheduledAt: string, status: string) => {
    if (status !== 'scheduled') return null;
    const date = new Date(scheduledAt);
    if (isPast(date)) return 'overdue';
    if (isToday(date)) return 'today';
    return 'upcoming';
  };

  // Sort meetings: scheduled first (by date), then others
  const sortedMeetings = [...(meetings || [])].sort((a, b) => {
    if (a.status === 'scheduled' && b.status !== 'scheduled') return -1;
    if (a.status !== 'scheduled' && b.status === 'scheduled') return 1;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });

  const scheduledMeetings = sortedMeetings.filter(m => m.status === 'scheduled');
  const otherMeetings = sortedMeetings.filter(m => m.status !== 'scheduled');

  return (
    <>
      <Card>
        <CardHeader className="pb-1 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-accent" />
              Reuniões da Negociação
            </CardTitle>
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setReschedulingMeeting(null);
                  setShowScheduleModal(true);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Agendar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : !meetings?.length ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma reunião vinculada a esta negociação
            </p>
          ) : (
            <div className="space-y-2">
              {/* Scheduled meetings */}
              {scheduledMeetings.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">
                    Agendadas ({scheduledMeetings.length})
                  </p>
                  {scheduledMeetings.map((meeting) => {
                    const timeStatus = getMeetingTimeStatus(meeting.scheduled_at, meeting.status);
                    return (
                      <div
                        key={meeting.id}
                        className={`flex items-start justify-between p-2 rounded-md border ${
                          timeStatus === 'overdue' 
                            ? 'border-destructive/50 bg-destructive/5' 
                            : timeStatus === 'today' 
                            ? 'border-primary/50 bg-primary/5' 
                            : 'border-border bg-secondary/50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{meeting.meeting_type}</span>
                            <Badge className={`${statusColors[meeting.status]} text-[10px] px-1.5 py-0`}>
                              {statusLabels[meeting.status]}
                            </Badge>
                            {meeting.reschedule_count > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                (#{meeting.reschedule_count + 1})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className={`text-[10px] flex items-center gap-1 ${
                              timeStatus === 'overdue' ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                              <Clock className="w-2.5 h-2.5" />
                              {formatMeetingDate(meeting.scheduled_at)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {meeting.duration_minutes}min
                            </span>
                            {meeting.allows_companion && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Users className="w-2.5 h-2.5" />
                                Acompanhante
                              </span>
                            )}
                          </div>
                        </div>
                        {!isReadOnly && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                Ações
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleUpdateStatus(meeting, 'completed')}>
                                <CheckCircle className="w-3 h-3 mr-1.5 text-green-600" />
                                Marcar Realizada
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReschedule(meeting)}>
                                <RefreshCw className="w-3 h-3 mr-1.5 text-yellow-600" />
                                Reagendar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(meeting, 'no_show')}>
                                <XCircle className="w-3 h-3 mr-1.5 text-red-600" />
                                Não Compareceu
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(meeting, 'cancelled')}>
                                <XCircle className="w-3 h-3 mr-1.5 text-muted-foreground" />
                                Cancelar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Past/Other meetings */}
              {otherMeetings.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase mt-2">
                    Histórico ({otherMeetings.length})
                  </p>
                  {otherMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-start justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {meeting.meeting_type}
                          </span>
                          <Badge className={`${statusColors[meeting.status]} text-[10px] px-1.5 py-0`}>
                            {statusLabels[meeting.status]}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatMeetingDate(meeting.scheduled_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ScheduleMeetingModal
        open={showScheduleModal}
        onOpenChange={(open) => {
          setShowScheduleModal(open);
          if (!open) setReschedulingMeeting(null);
        }}
        contactId={contactId}
        contactName={contactName}
        opportunityId={opportunityId}
        reschedulingMeeting={reschedulingMeeting}
      />
    </>
  );
}
