import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, X } from 'lucide-react';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TicketPriority, priorityLabels } from '@/types/tickets';

interface OperationsEfficiencyFiltersProps {
  startDate: Date;
  endDate: Date;
  priorityFilter: TicketPriority | null;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onPriorityChange: (priority: TicketPriority | null) => void;
}

const presets = [
  { label: '7 dias', getValue: () => subDays(new Date(), 7) },
  { label: '30 dias', getValue: () => subDays(new Date(), 30) },
  { label: '90 dias', getValue: () => subDays(new Date(), 90) },
  { label: 'Este mês', getValue: () => startOfMonth(new Date()) },
  { label: 'Este ano', getValue: () => startOfYear(new Date()) },
];

export function OperationsEfficiencyFilters({
  startDate,
  endDate,
  priorityFilter,
  onStartDateChange,
  onEndDateChange,
  onPriorityChange,
}: OperationsEfficiencyFiltersProps) {
  const handlePresetClick = (getValue: () => Date) => {
    onStartDateChange(getValue());
    onEndDateChange(new Date());
  };

  const handleClearFilters = () => {
    onStartDateChange(subDays(new Date(), 30));
    onEndDateChange(new Date());
    onPriorityChange(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Presets de período */}
      <div className="flex gap-1">
        {presets.map(preset => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => handlePresetClick(preset.getValue)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Seletor de data inicial */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "justify-start text-left font-normal text-xs",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1 h-3 w-3" />
            {format(startDate, "dd/MM/yy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={(date) => date && onStartDateChange(date)}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <span className="text-xs text-muted-foreground">até</span>

      {/* Seletor de data final */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "justify-start text-left font-normal text-xs",
              !endDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1 h-3 w-3" />
            {format(endDate, "dd/MM/yy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={(date) => date && onEndDateChange(date)}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Filtro de prioridade */}
      <Select
        value={priorityFilter || 'all'}
        onValueChange={(value) => onPriorityChange(value === 'all' ? null : value as TicketPriority)}
      >
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {Object.entries(priorityLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Botão limpar */}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground"
        onClick={handleClearFilters}
      >
        <X className="h-3 w-3 mr-1" />
        Limpar
      </Button>
    </div>
  );
}
