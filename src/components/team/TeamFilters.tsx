import { useMemo } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamMembers, TeamFilters as TeamFiltersType } from '@/hooks/useTeamAnalytics';
import { cn } from '@/lib/utils';

interface TeamFiltersProps {
  filters: TeamFiltersType;
  onFiltersChange: (filters: TeamFiltersType) => void;
}

export function TeamFilters({ filters, onFiltersChange }: TeamFiltersProps) {
  const { data: members } = useTeamMembers();

  const coordinators = useMemo(() => 
    members?.filter(m => 
      m.position === 'coordenador_comercial' || 
      m.position === 'coordenador_executivo'
    ) || [],
    [members]
  );

  const leaders = useMemo(() => 
    members?.filter(m => m.role === 'lider') || [],
    [members]
  );

  const planners = useMemo(() => 
    members?.filter(m => 
      m.role === 'planejador' || 
      m.position === 'planejador_financeiro' ||
      m.position === 'planejador_prime' ||
      m.position === 'planejador_exclusive' ||
      m.position === 'especialista' ||
      m.position === 'especialista_private'
    ) || [],
    [members]
  );

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {/* Date From */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal min-w-[140px]',
              !filters.dateFrom && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'Data início'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateFrom}
            onSelect={(date) => date && onFiltersChange({ ...filters, dateFrom: date })}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal min-w-[140px]',
              !filters.dateTo && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateTo ? format(filters.dateTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Data fim'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateTo}
            onSelect={(date) => date && onFiltersChange({ ...filters, dateTo: date })}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      {/* Coordinator */}
      {coordinators.length > 0 && (
        <Select
          value={filters.coordinatorId || 'all'}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            coordinatorId: value === 'all' ? undefined : value,
            leaderId: undefined,
            plannerId: undefined,
          })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Coordenador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Coordenadores</SelectItem>
            {coordinators.map((c) => (
              <SelectItem key={c.userId} value={c.userId}>
                {c.fullName}{c.isActive === false ? ' (Inativo)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Leader */}
      {leaders.length > 0 && (
        <Select
          value={filters.leaderId || 'all'}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            leaderId: value === 'all' ? undefined : value,
            plannerId: undefined,
          })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Líder Comercial" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Líderes</SelectItem>
            {leaders.map((l) => (
              <SelectItem key={l.userId} value={l.userId}>
                {l.fullName}{l.isActive === false ? ' (Inativo)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Planner */}
      {planners.length > 0 && (
        <Select
          value={filters.plannerId || 'all'}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            plannerId: value === 'all' ? undefined : value,
          })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Planejador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Planejadores</SelectItem>
            {planners.map((p) => (
              <SelectItem key={p.userId} value={p.userId}>
                {p.fullName}{p.isActive === false ? ' (Inativo)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
