import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, Link2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLinkMeetingToPlan, useUnlinkMeetingFromPlan } from '@/hooks/useClientMeetings';
import { useContactMeetingsForLinking } from '@/hooks/useMeetings';
import type { ClientPlanMeeting } from '@/types/clients';

interface LinkMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planMeeting: ClientPlanMeeting | null;
  contactId: string;
}

export function LinkMeetingModal({
  open,
  onOpenChange,
  planMeeting,
  contactId,
}: LinkMeetingModalProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [updateTheme, setUpdateTheme] = useState(true);
  const [updateDate, setUpdateDate] = useState(true);

  const { data: availableMeetings, isLoading } = useContactMeetingsForLinking(contactId);
  const linkMeeting = useLinkMeetingToPlan();
  const unlinkMeeting = useUnlinkMeetingFromPlan();

  // Filter meetings that are completed or scheduled and not already linked to another plan meeting
  const eligibleMeetings = availableMeetings?.filter(
    (m) => ['completed', 'scheduled'].includes(m.status)
  ) || [];

  const selectedMeeting = eligibleMeetings.find(m => m.id === selectedMeetingId);

  const handleLink = async () => {
    if (!planMeeting || !selectedMeetingId || !selectedMeeting) return;

    await linkMeeting.mutateAsync({
      planMeetingId: planMeeting.id,
      meetingId: selectedMeetingId,
      updateTheme: updateTheme ? selectedMeeting.meeting_type : undefined,
      updateDate: updateDate
        ? format(parseISO(selectedMeeting.scheduled_at), 'yyyy-MM-dd')
        : undefined,
      markCompleted: selectedMeeting.status === 'completed',
    });

    setSelectedMeetingId(null);
    onOpenChange(false);
  };

  const handleUnlink = async () => {
    if (!planMeeting) return;

    await unlinkMeeting.mutateAsync(planMeeting.id);
    onOpenChange(false);
  };

  if (!planMeeting) return null;

  const isLinked = !!planMeeting.meeting_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {isLinked ? 'Reunião Vinculada' : 'Vincular Reunião'}
          </DialogTitle>
          <DialogDescription>
            {isLinked
              ? 'Esta reunião do cronograma já está vinculada a uma reunião realizada.'
              : `Vincule uma reunião realizada à "Reunião ${planMeeting.meeting_number}" do cronograma.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current plan meeting info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Reunião do Cronograma</p>
            <p className="text-lg font-semibold">{planMeeting.theme}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Data prevista: {format(parseISO(planMeeting.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>

          {isLinked ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta reunião está vinculada. Você pode desvincular para selecionar outra reunião.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleUnlink}
                  disabled={unlinkMeeting.isPending}
                >
                  {unlinkMeeting.isPending ? 'Desvinculando...' : 'Desvincular'}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Available meetings */}
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando reuniões...</p>
              ) : eligibleMeetings.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhuma reunião realizada ou agendada disponível para vincular.
                    Agende ou registre uma reunião primeiro.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium mb-2">Selecione uma reunião para vincular:</p>
                    <ScrollArea className="h-48 border rounded-lg p-2">
                      <RadioGroup
                        value={selectedMeetingId || ''}
                        onValueChange={setSelectedMeetingId}
                      >
                        {eligibleMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 ${
                              selectedMeetingId === meeting.id ? 'bg-muted' : ''
                            }`}
                          >
                            <RadioGroupItem value={meeting.id} id={meeting.id} />
                            <Label
                              htmlFor={meeting.id}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{meeting.meeting_type}</span>
                                <Badge
                                  variant={meeting.status === 'completed' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {meeting.status === 'completed' ? 'Realizada' : 'Agendada'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(meeting.scheduled_at), "dd/MM/yyyy 'às' HH:mm", {
                                  locale: ptBR,
                                })}
                              </p>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </ScrollArea>
                  </div>

                  {/* Update options */}
                  {selectedMeeting && (
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium">Atualizar dados do cronograma:</p>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="updateTheme"
                          checked={updateTheme}
                          onCheckedChange={(checked) => setUpdateTheme(!!checked)}
                        />
                        <Label htmlFor="updateTheme" className="text-sm">
                          Atualizar tema para "{selectedMeeting.meeting_type}"
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="updateDate"
                          checked={updateDate}
                          onCheckedChange={(checked) => setUpdateDate(!!checked)}
                        />
                        <Label htmlFor="updateDate" className="text-sm">
                          Atualizar data para{' '}
                          {format(parseISO(selectedMeeting.scheduled_at), 'dd/MM/yyyy')}
                        </Label>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleLink}
                      disabled={!selectedMeetingId || linkMeeting.isPending}
                    >
                      {linkMeeting.isPending ? 'Vinculando...' : 'Vincular Reunião'}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
