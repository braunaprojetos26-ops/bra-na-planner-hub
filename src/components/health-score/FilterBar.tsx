import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { X, CalendarIcon, Users, ChevronDown } from 'lucide-react';
import { useHierarchy, HierarchyUser } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';

export interface HealthScoreFilters {
  startDate?: Date;
  endDate?: Date;
  ownerIds?: string[];
}

interface FilterBarProps {
  filters: HealthScoreFilters;
  onFiltersChange: (filters: HealthScoreFilters) => void;
}

// Helper to flatten hierarchy tree into a list
function flattenHierarchy(nodes: HierarchyUser[]): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = [];
  const traverse = (node: HierarchyUser) => {
    result.push({ id: node.user_id, name: node.full_name });
    node.children.forEach(traverse);
  };
  nodes.forEach(traverse);
  return result;
}

// Quick period presets
const PERIOD_PRESETS = [
  { label: '7 dias', getDates: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: '30 dias', getDates: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: '90 dias', getDates: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: 'Este mês', getDates: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'Mês passado', getDates: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
];

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const { user, role } = useAuth();
  const { data: hierarchyData } = useHierarchy();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  
  // Flatten hierarchy to get all users as a simple list
  const allUsers = hierarchyData ? flattenHierarchy(hierarchyData) : [];
  
  // Build options list: current user + all visible users
  const ownerOptions = [
    ...(user ? [{ id: user.id, name: 'Minha Carteira' }] : []),
    ...allUsers.filter(u => u.id !== user?.id),
  ];

  const canSeeOthers = role && ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role);

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      startDate: range?.from,
      endDate: range?.to,
    });
  };

  const handlePresetClick = (preset: typeof PERIOD_PRESETS[0]) => {
    const dates = preset.getDates();
    onFiltersChange({
      ...filters,
      startDate: dates.from,
      endDate: dates.to,
    });
    setDatePopoverOpen(false);
  };

  const handleOwnerToggle = (ownerId: string) => {
    const currentOwners = filters.ownerIds || [];
    const newOwners = currentOwners.includes(ownerId)
      ? currentOwners.filter(id => id !== ownerId)
      : [...currentOwners, ownerId];
    
    onFiltersChange({
      ...filters,
      ownerIds: newOwners.length > 0 ? newOwners : undefined,
    });
  };

  const handleSelectAll = () => {
    onFiltersChange({
      ...filters,
      ownerIds: ownerOptions.map(o => o.id),
    });
  };

  const handleClearOwners = () => {
    onFiltersChange({
      ...filters,
      ownerIds: undefined,
    });
  };

  const hasFilters = filters.startDate || filters.endDate || (filters.ownerIds && filters.ownerIds.length > 0);

  const dateRange: DateRange | undefined = filters.startDate || filters.endDate
    ? { from: filters.startDate, to: filters.endDate }
    : undefined;

  const getDateLabel = () => {
    if (filters.startDate && filters.endDate) {
      return `${format(filters.startDate, 'dd/MM/yy', { locale: ptBR })} - ${format(filters.endDate, 'dd/MM/yy', { locale: ptBR })}`;
    }
    if (filters.startDate) {
      return `A partir de ${format(filters.startDate, 'dd/MM/yy', { locale: ptBR })}`;
    }
    return 'Período';
  };

  const getOwnerLabel = () => {
    const count = filters.ownerIds?.length || 0;
    if (count === 0) return 'Todos os planejadores';
    if (count === 1) {
      const owner = ownerOptions.find(o => o.id === filters.ownerIds![0]);
      return owner?.name || '1 planejador';
    }
    return `${count} planejadores`;
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range Filter */}
      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              dateRange && "border-primary"
            )}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {getDateLabel()}
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex flex-wrap gap-2">
              {PERIOD_PRESETS.map((preset) => (
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
          </div>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateRangeChange}
            numberOfMonths={2}
            locale={ptBR}
            className="p-3 pointer-events-auto"
          />
          {dateRange && (
            <div className="p-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onFiltersChange({ ...filters, startDate: undefined, endDate: undefined });
                  setDatePopoverOpen(false);
                }}
                className="w-full"
              >
                Limpar período
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Owner Filter (for leaders) */}
      {canSeeOthers && ownerOptions.length > 1 && (
        <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                filters.ownerIds && filters.ownerIds.length > 0 && "border-primary"
              )}
            >
              <Users className="h-4 w-4 mr-2" />
              {getOwnerLabel()}
              <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-sm font-medium">Planejadores</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  Todos
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearOwners}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {ownerOptions.map(option => (
                <label
                  key={option.id}
                  className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                >
                  <Checkbox
                    checked={filters.ownerIds?.includes(option.id) || false}
                    onCheckedChange={() => handleOwnerToggle(option.id)}
                  />
                  <span className="text-sm">{option.name}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Selected owners badges */}
      {filters.ownerIds && filters.ownerIds.length > 0 && filters.ownerIds.length <= 3 && (
        <div className="flex flex-wrap gap-1">
          {filters.ownerIds.map(id => {
            const owner = ownerOptions.find(o => o.id === id);
            return owner ? (
              <Badge key={id} variant="secondary" className="text-xs">
                {owner.name}
                <button
                  onClick={() => handleOwnerToggle(id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
      )}

      {/* Clear All Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-9 px-2 text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
