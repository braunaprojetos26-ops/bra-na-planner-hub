import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StickyNote } from 'lucide-react';

interface ObservationsPanelProps {
  plannerSummary: string;
  additionalContext: string;
  onPlannerSummaryChange: (value: string) => void;
  onAdditionalContextChange: (value: string) => void;
}

export function ObservationsPanel({
  plannerSummary,
  additionalContext,
  onPlannerSummaryChange,
  onAdditionalContextChange,
}: ObservationsPanelProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Observações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Resumo do Planejador</Label>
          <Textarea
            value={plannerSummary}
            onChange={(e) => onPlannerSummaryChange(e.target.value)}
            placeholder="Anotações e impressões sobre o cliente..."
            rows={4}
            className="text-sm resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Contexto Adicional</Label>
          <Textarea
            value={additionalContext}
            onChange={(e) => onAdditionalContextChange(e.target.value)}
            placeholder="Informações complementares relevantes..."
            rows={4}
            className="text-sm resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
