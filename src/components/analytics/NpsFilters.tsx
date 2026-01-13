import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NpsFiltersProps {
  startDate: Date | null;
  endDate: Date | null;
  ownerId: string | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onOwnerChange: (ownerId: string | null) => void;
  owners: Array<{ user_id: string; full_name: string }>;
}

export function NpsFilters({
  startDate,
  endDate,
  ownerId,
  onStartDateChange,
  onEndDateChange,
  onOwnerChange,
  owners,
}: NpsFiltersProps) {
  const hasFilters = startDate || endDate || ownerId;

  const clearFilters = () => {
    onStartDateChange(null);
    onEndDateChange(null);
    onOwnerChange(null);
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal w-[180px]',
              !startDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inicial'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate || undefined}
            onSelect={(date) => onStartDateChange(date || null)}
            initialFocus
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal w-[180px]',
              !endDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data final'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate || undefined}
            onSelect={(date) => onEndDateChange(date || null)}
            initialFocus
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      <Select value={ownerId || 'all'} onValueChange={(v) => onOwnerChange(v === 'all' ? null : v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Planejador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {owners.map((owner) => (
            <SelectItem key={owner.user_id} value={owner.user_id}>
              {owner.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
