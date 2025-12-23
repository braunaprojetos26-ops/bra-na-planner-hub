import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMeetingMinutes } from '@/hooks/useMeetingMinutes';

interface ClientMinutesSectionProps {
  contactId: string;
}

export function ClientMinutesSection({ contactId }: ClientMinutesSectionProps) {
  const { data: minutes, isLoading } = useMeetingMinutes(contactId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Atas de Reunião</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Atas de Reunião</CardTitle>
      </CardHeader>
      <CardContent>
        {!minutes || minutes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma ata registrada
          </p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {minutes.map((minute) => (
                <div
                  key={minute.id}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{minute.meeting_type}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(minute.meeting_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {minute.content}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
