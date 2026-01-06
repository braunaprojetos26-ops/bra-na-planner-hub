import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, startOfYear, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useProspectionOwners } from '@/hooks/useProspectionAnalytics';

interface ProspectionFiltersProps {
  startDate: Date;
  endDate: Date;
  ownerId: string;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onOwnerIdChange: (ownerId: string) => void;
}

const periodPresets = [
  { label: 'Últimos 7 dias', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Últimos 30 dias', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'Este mês', getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'Últimos 3 meses', getValue: () => ({ start: subMonths(new Date(), 3), end: new Date() }) },
  { label: 'Este ano', getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) },
];

export function ProspectionFilters({
  startDate,
  endDate,
  ownerId,
  onStartDateChange,
  onEndDateChange,
  onOwnerIdChange,
}: ProspectionFiltersProps) {
  const { data: owners } = useProspectionOwners();

  const handlePresetClick = (preset: typeof periodPresets[0]) => {
    const { start, end } = preset.getValue();
    onStartDateChange(start);
    onEndDateChange(end);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Period Presets */}
      <div className="flex flex-wrap gap-2">
        {periodPresets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Start Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[140px] justify-start text-left font-normal',
                !startDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, 'dd/MM/yyyy') : 'Data inicial'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => date && onStartDateChange(date)}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">até</span>

        {/* End Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[140px] justify-start text-left font-normal',
                !endDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, 'dd/MM/yyyy') : 'Data final'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => date && onEndDateChange(date)}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Owner Filter */}
        <Select value={ownerId} onValueChange={onOwnerIdChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os planejadores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planejadores</SelectItem>
            {owners?.map((owner) => (
              <SelectItem key={owner.id} value={owner.id}>
                {owner.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
