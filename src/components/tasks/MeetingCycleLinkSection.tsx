import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PendingMeeting {
  id: string;
  meeting_number: number;
  theme: string;
  scheduled_date: string;
  status: string;
}

interface MeetingCycleLinkSectionProps {
  contactId: string;
  linkToCycle: boolean;
  onLinkToCycleChange: (value: boolean) => void;
  selectedPlanMeetingId: string;
  onSelectedPlanMeetingIdChange: (value: string) => void;
}

export function MeetingCycleLinkSection({
  contactId,
  linkToCycle,
  onLinkToCycleChange,
  selectedPlanMeetingId,
  onSelectedPlanMeetingIdChange,
}: MeetingCycleLinkSectionProps) {
  const [pendingMeetings, setPendingMeetings] = useState<PendingMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState(false);

  useEffect(() => {
    const fetchPendingMeetings = async () => {
      setIsLoading(true);
      try {
        // Find active plan for this contact
        const { data: plans, error: planError } = await supabase
          .from('client_plans')
          .select('id')
          .eq('contact_id', contactId)
          .eq('status', 'active')
          .limit(1);

        if (planError) throw planError;

        if (!plans || plans.length === 0) {
          setHasActivePlan(false);
          setPendingMeetings([]);
          return;
        }

        setHasActivePlan(true);
        const planId = plans[0].id;

        // Fetch non-completed meetings
        const { data: meetings, error: meetingsError } = await supabase
          .from('client_plan_meetings')
          .select('id, meeting_number, theme, scheduled_date, status')
          .eq('plan_id', planId)
          .neq('status', 'completed')
          .order('meeting_number', { ascending: true });

        if (meetingsError) throw meetingsError;

        setPendingMeetings(meetings || []);
      } catch (error) {
        console.error('Error fetching pending meetings:', error);
        setPendingMeetings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingMeetings();
  }, [contactId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando ciclo de reuniões...
      </div>
    );
  }

  if (!hasActivePlan) return null;

  if (pendingMeetings.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-1">
        Todas as reuniões do ciclo já foram concluídas.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="link-cycle" className="flex items-center gap-2 text-sm cursor-pointer">
          <Link2 className="h-4 w-4 text-primary" />
          Vincular ao ciclo de reuniões?
        </Label>
        <Switch
          id="link-cycle"
          checked={linkToCycle}
          onCheckedChange={(checked) => {
            onLinkToCycleChange(checked);
            if (!checked) onSelectedPlanMeetingIdChange('');
          }}
        />
      </div>

      {linkToCycle && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Selecione a reunião do ciclo</Label>
          <Select value={selectedPlanMeetingId} onValueChange={onSelectedPlanMeetingIdChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a reunião" />
            </SelectTrigger>
            <SelectContent>
              {pendingMeetings.map((m) => {
                const dateStr = m.scheduled_date
                  ? format(new Date(m.scheduled_date), "dd/MM/yyyy", { locale: ptBR })
                  : 'Sem data';
                return (
                  <SelectItem key={m.id} value={m.id}>
                    Reunião {m.meeting_number} — {m.theme} ({dateStr})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
