import { useState } from 'react';
import { Plus, Calendar, FileText, Sparkles, Check, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useOneOnOneMeetings,
  OneOnOneMeeting,
} from '@/hooks/useOneOnOneMeetings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NewMeetingModal } from './NewMeetingModal';
import { MeetingDetailModal } from './MeetingDetailModal';

interface MeetingsSectionProps {
  userId: string;
  plannerName: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pendente', icon: Clock, variant: 'outline' },
  scheduled: { label: 'Agendada', icon: Calendar, variant: 'secondary' },
  completed: { label: 'Concluída', icon: Check, variant: 'default' },
  cancelled: { label: 'Cancelada', icon: X, variant: 'destructive' },
};

export function MeetingsSection({ userId, plannerName }: MeetingsSectionProps) {
  const { data: meetings, isLoading } = useOneOnOneMeetings(userId);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<OneOnOneMeeting | null>(null);

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  const upcomingMeetings = meetings?.filter(m => 
    m.status === 'scheduled' || m.status === 'pending'
  ) || [];
  
  const pastMeetings = meetings?.filter(m => 
    m.status === 'completed' || m.status === 'cancelled'
  ) || [];

  const renderMeetingCard = (meeting: OneOnOneMeeting) => {
    const status = statusConfig[meeting.status];
    const StatusIcon = status.icon;
    
    return (
      <Card
        key={meeting.id}
        className="hover:shadow-sm cursor-pointer transition-shadow"
        onClick={() => setSelectedMeeting(meeting)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {meeting.templateName || 'Reunião 1:1'}
                </span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              
              {meeting.scheduledDate && (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(meeting.scheduledDate), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
              
              {meeting.aiPreparation && (
                <div className="flex items-center gap-1 mt-2">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-xs text-primary">Preparação com IA disponível</span>
                </div>
              )}
            </div>
            
            {meeting.notes && (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reuniões 1:1</h3>
        <Button onClick={() => setIsNewModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Reunião
        </Button>
      </div>

      {/* Upcoming */}
      {upcomingMeetings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Próximas Reuniões
          </h4>
          <div className="grid gap-3">
            {upcomingMeetings.map(renderMeetingCard)}
          </div>
        </div>
      )}

      {/* Past */}
      {pastMeetings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Histórico
          </h4>
          <div className="grid gap-3">
            {pastMeetings.map(renderMeetingCard)}
          </div>
        </div>
      )}

      {!meetings?.length && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhuma reunião 1:1 agendada ainda.
          </CardContent>
        </Card>
      )}

      <NewMeetingModal
        open={isNewModalOpen}
        onOpenChange={setIsNewModalOpen}
        plannerId={userId}
        plannerName={plannerName}
      />

      {selectedMeeting && (
        <MeetingDetailModal
          open={!!selectedMeeting}
          onOpenChange={() => setSelectedMeeting(null)}
          meeting={selectedMeeting}
          plannerName={plannerName}
        />
      )}
    </div>
  );
}
