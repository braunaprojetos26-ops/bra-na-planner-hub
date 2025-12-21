import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, ChevronDown, ChevronUp, Trash2, Eye, Calendar, User, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMeetingMinutes, useDeleteMeetingMinute } from '@/hooks/useMeetingMinutes';
import type { MeetingMinute } from '@/types/meetingMinutes';

interface OpportunityMeetingMinutesSectionProps {
  contactId: string;
  contactName: string;
  opportunityId: string;
  isReadOnly?: boolean;
}

const formatDateTime = (date: string) => {
  try {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '-';
  }
};

const formatDate = (date: string) => {
  try {
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return '-';
  }
};

export function OpportunityMeetingMinutesSection({ 
  contactId, 
  contactName, 
  opportunityId,
  isReadOnly = false 
}: OpportunityMeetingMinutesSectionProps) {
  const { data: minutes, isLoading } = useMeetingMinutes(contactId);
  const deleteMutation = useDeleteMeetingMinute();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMinute, setSelectedMinute] = useState<MeetingMinute | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const handleView = (minute: MeetingMinute) => {
    setSelectedMinute(minute);
    setViewDialogOpen(true);
  };

  const handleDelete = (minute: MeetingMinute) => {
    deleteMutation.mutate({ id: minute.id, contactId });
  };

  // Check if a minute is linked to this opportunity
  const isLinkedToOpportunity = (minute: MeetingMinute) => {
    return minute.meeting?.opportunity_id === opportunityId;
  };

  // Count minutes linked to this opportunity
  const linkedCount = minutes?.filter(isLinkedToOpportunity).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-accent" />
            Atas de Reunião
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-xs text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-accent" />
            Atas de Reunião
            {minutes && minutes.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {minutes.length}
              </Badge>
            )}
            {linkedCount > 0 && (
              <Badge variant="outline" className="text-[10px] bg-primary/10">
                <Link2 className="w-2.5 h-2.5 mr-0.5" />
                {linkedCount} desta negociação
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {!minutes?.length ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma ata de reunião registrada para este contato.
            </p>
          ) : (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              {/* Always show the most recent minute */}
              <MeetingMinuteItem
                minute={minutes[0]}
                onView={handleView}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
                isReadOnly={isReadOnly}
                isLinked={isLinkedToOpportunity(minutes[0])}
              />

              {/* Show remaining minutes in collapsible */}
              {minutes.length > 1 && (
                <>
                  <CollapsibleContent className="space-y-1.5 mt-1.5">
                    {minutes.slice(1).map((minute) => (
                      <MeetingMinuteItem
                        key={minute.id}
                        minute={minute}
                        onView={handleView}
                        onDelete={handleDelete}
                        isDeleting={deleteMutation.isPending}
                        isReadOnly={isReadOnly}
                        isLinked={isLinkedToOpportunity(minute)}
                      />
                    ))}
                  </CollapsibleContent>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs text-muted-foreground hover:text-foreground">
                      {isOpen ? (
                        <>
                          <ChevronUp className="w-3 h-3 mr-1" />
                          Ocultar anteriores
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Ver mais {minutes.length - 1} ata{minutes.length - 1 > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </>
              )}
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Ata de Reunião
              {selectedMinute && isLinkedToOpportunity(selectedMinute) && (
                <Badge variant="outline" className="text-[10px] bg-primary/10">
                  <Link2 className="w-2.5 h-2.5 mr-0.5" />
                  Desta negociação
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedMinute && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(selectedMinute.meeting_date)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>Por: {selectedMinute.created_by_profile?.full_name || '-'}</span>
                </div>
              </div>
              <Badge variant="outline">{selectedMinute.meeting_type}</Badge>
              <ScrollArea className="h-[400px] border rounded-md p-4">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {selectedMinute.content}
                </pre>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface MeetingMinuteItemProps {
  minute: MeetingMinute;
  onView: (minute: MeetingMinute) => void;
  onDelete: (minute: MeetingMinute) => void;
  isDeleting: boolean;
  isReadOnly?: boolean;
  isLinked?: boolean;
}

function MeetingMinuteItem({ minute, onView, onDelete, isDeleting, isReadOnly = false, isLinked = false }: MeetingMinuteItemProps) {
  // Get first 100 characters of content as preview
  const preview = minute.content.length > 100 
    ? minute.content.substring(0, 100) + '...'
    : minute.content;

  return (
    <div className={`flex items-start gap-2 p-2 rounded-md group ${isLinked ? 'bg-primary/5 border border-primary/20' : 'bg-secondary/50'}`}>
      <div className={`w-1.5 h-1.5 rounded-full mt-2 ${isLinked ? 'bg-primary' : 'bg-accent'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Badge variant="outline" className="text-[10px] shrink-0">
              {minute.meeting_type}
            </Badge>
            {isLinked && (
              <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/10 border-primary/30">
                <Link2 className="w-2 h-2 mr-0.5" />
                Desta negociação
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground truncate">
              {formatDateTime(minute.meeting_date)}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onView(minute)}
            >
              <Eye className="w-3 h-3" />
            </Button>
            {!isReadOnly && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir ata?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A ata de reunião será permanentemente excluída.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(minute)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {preview}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Por: {minute.created_by_profile?.full_name || '-'}
        </p>
      </div>
    </div>
  );
}
