import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote } from 'lucide-react';

interface ObservationsPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export function ObservationsPanel({ value, onChange }: ObservationsPanelProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Observações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Anotações e impressões sobre o cliente..."
          rows={6}
          className="text-sm resize-none"
        />
      </CardContent>
    </Card>
  );
}
