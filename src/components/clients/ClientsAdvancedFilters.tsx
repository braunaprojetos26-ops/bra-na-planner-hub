import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface AdvancedFilters {
  cycles: number[];                // reunião atual: 1-12
  totalMeetings: number[];         // total de reuniões do plano: 4,6,9,12
  progressRanges: string[];        // '0-25','26-50','51-75','76-100'
  healthScoreRanges: string[];     // 'otimo','estavel','atencao','critico'
  meetingStatus: string | null;    // 'overdue' | 'on_track' | null
  paymentStatus: string | null;    // 'overdue' | 'on_track' | null
  productPresence: Record<string, 'has' | 'not_has' | null>; // pa_ativo, credito, investimentos_xp, prunus, previdencia
}

export const EMPTY_FILTERS: AdvancedFilters = {
  cycles: [],
  totalMeetings: [],
  progressRanges: [],
  healthScoreRanges: [],
  meetingStatus: null,
  paymentStatus: null,
  productPresence: {},
};

function countActiveFilters(filters: AdvancedFilters): number {
  let count = 0;
  if (filters.cycles.length) count++;
  if (filters.totalMeetings.length) count++;
  if (filters.progressRanges.length) count++;
  if (filters.healthScoreRanges.length) count++;
  if (filters.meetingStatus) count++;
  if (filters.paymentStatus) count++;
  const productFilters = Object.values(filters.productPresence).filter(v => v !== null);
  count += productFilters.length;
  return count;
}

interface Props {
  filters: AdvancedFilters;
  onChange: (filters: AdvancedFilters) => void;
}

function CheckboxGroup({ label, options, selected, onToggle }: {
  label: string;
  options: { value: string | number; label: string }[];
  selected: (string | number)[];
  onToggle: (value: string | number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="grid grid-cols-2 gap-1">
        {options.map(opt => (
          <label
            key={String(opt.value)}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
          >
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => onToggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function RadioGroup({ label, options, selected, onSelect }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="flex flex-col gap-1">
        {options.map(opt => (
          <label
            key={opt.value}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
          >
            <Checkbox
              checked={selected === opt.value}
              onCheckedChange={(checked) => onSelect(checked ? opt.value : null)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TriStateFilter({ label, filterKey, value, onChange }: {
  label: string;
  filterKey: string;
  value: 'has' | 'not_has' | null;
  onChange: (key: string, val: 'has' | 'not_has' | null) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        <Button
          variant={value === 'has' ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onChange(filterKey, value === 'has' ? null : 'has')}
        >
          Tem
        </Button>
        <Button
          variant={value === 'not_has' ? 'destructive' : 'outline'}
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onChange(filterKey, value === 'not_has' ? null : 'not_has')}
        >
          Não tem
        </Button>
      </div>
    </div>
  );
}

export function ClientsAdvancedFilters({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  const toggleArrayValue = <T extends string | number>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

  const updateProductPresence = (key: string, val: 'has' | 'not_has' | null) => {
    onChange({
      ...filters,
      productPresence: { ...filters.productPresence, [key]: val },
    });
  };

  const clearAll = () => onChange(EMPTY_FILTERS);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[380px] sm:w-[420px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Filtros Avançados</SheetTitle>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearAll}>
                <X className="h-3 w-3 mr-1" />
                Limpar tudo ({activeCount})
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] px-6 pb-6">
          <div className="space-y-6">
            {/* Ciclo atual */}
            <CheckboxGroup
              label="Ciclo (Reunião atual)"
              options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Reunião ${i + 1}` }))}
              selected={filters.cycles}
              onToggle={(v) => onChange({ ...filters, cycles: toggleArrayValue(filters.cycles, v as number) })}
            />

            <Separator />

            {/* Total de reuniões */}
            <CheckboxGroup
              label="Nº de Reuniões (Plano)"
              options={[
                { value: 4, label: '4 reuniões' },
                { value: 6, label: '6 reuniões' },
                { value: 9, label: '9 reuniões' },
                { value: 12, label: '12 reuniões' },
              ]}
              selected={filters.totalMeetings}
              onToggle={(v) => onChange({ ...filters, totalMeetings: toggleArrayValue(filters.totalMeetings, v as number) })}
            />

            <Separator />

            {/* Progresso */}
            <CheckboxGroup
              label="Progresso"
              options={[
                { value: '0-25', label: '0% a 25%' },
                { value: '26-50', label: '26% a 50%' },
                { value: '51-75', label: '51% a 75%' },
                { value: '76-100', label: '76% a 100%' },
              ]}
              selected={filters.progressRanges}
              onToggle={(v) => onChange({ ...filters, progressRanges: toggleArrayValue(filters.progressRanges, v as string) })}
            />

            <Separator />

            {/* Health Score */}
            <CheckboxGroup
              label="Health Score"
              options={[
                { value: 'otimo', label: '🟢 Ótimo (80-100)' },
                { value: 'estavel', label: '🔵 Estável (60-79)' },
                { value: 'atencao', label: '🟡 Atenção (40-59)' },
                { value: 'critico', label: '🔴 Crítico (0-39)' },
              ]}
              selected={filters.healthScoreRanges}
              onToggle={(v) => onChange({ ...filters, healthScoreRanges: toggleArrayValue(filters.healthScoreRanges, v as string) })}
            />

            <Separator />

            {/* Alertas */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Alertas</Label>
              <RadioGroup
                label="Reunião"
                options={[
                  { value: 'overdue', label: 'Com reunião atrasada' },
                  { value: 'on_track', label: 'Reuniões em dia' },
                ]}
                selected={filters.meetingStatus}
                onSelect={(v) => onChange({ ...filters, meetingStatus: v })}
              />
              <RadioGroup
                label="Pagamento"
                options={[
                  { value: 'overdue', label: 'Com pagamento atrasado' },
                  { value: 'on_track', label: 'Pagamentos em dia' },
                ]}
                selected={filters.paymentStatus}
                onSelect={(v) => onChange({ ...filters, paymentStatus: v })}
              />
            </div>

            <Separator />

            {/* Produtos / Mapa de Oportunidades */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Produtos Contratados</Label>
              <TriStateFilter
                label="Seguro de Vida (PA Ativo)"
                filterKey="pa_ativo"
                value={filters.productPresence.pa_ativo || null}
                onChange={updateProductPresence}
              />
              <TriStateFilter
                label="Crédito"
                filterKey="credito"
                value={filters.productPresence.credito || null}
                onChange={updateProductPresence}
              />
              <TriStateFilter
                label="Investimentos XP"
                filterKey="investimentos_xp"
                value={filters.productPresence.investimentos_xp || null}
                onChange={updateProductPresence}
              />
              <TriStateFilter
                label="Prunus"
                filterKey="prunus"
                value={filters.productPresence.prunus || null}
                onChange={updateProductPresence}
              />
              <TriStateFilter
                label="Previdência"
                filterKey="previdencia"
                value={filters.productPresence.previdencia || null}
                onChange={updateProductPresence}
              />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
