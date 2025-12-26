import { useLayoutEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote } from 'lucide-react';

interface ObservationsPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export function ObservationsPanel({ value, onChange }: ObservationsPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeToFit = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    resizeToFit();
  }, [value]);

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
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onInput={resizeToFit}
          placeholder="Anotações e impressões sobre o cliente..."
          rows={1}
          className="text-sm resize-none overflow-hidden min-h-[140px]"
        />
      </CardContent>
    </Card>
  );
}
