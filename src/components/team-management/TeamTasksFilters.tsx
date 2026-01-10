import { useState } from 'react';
import { X, SlidersHorizontal, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/date-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { TaskType, TaskStatus, TASK_TYPE_LABELS, TASK_STATUS_LABELS } from '@/types/tasks';

interface TeamMember {
  userId: string;
  fullName: string;
}

interface TeamTasksFiltersProps {
  // Filter values
  selectedMemberId: string;
  selectedPeriod: string;
  selectedStatus: string;
  selectedTaskType: string;
  customDateStart: Date | undefined;
  customDateEnd: Date | undefined;
  
  // Team members
  teamMembers: TeamMember[];
  
  // Callbacks
  onMemberChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTaskTypeChange: (value: string) => void;
  onCustomDateStartChange: (date: Date | undefined) => void;
  onCustomDateEndChange: (date: Date | undefined) => void;
  onNewTask: () => void;
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todos os períodos' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Últimos 7 dias' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'month', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'custom', label: 'Período personalizado' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Atrasada' },
  { value: 'completed', label: 'Concluída' },
];

const TASK_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos os tipos' },
  ...Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export function TeamTasksFilters({
  selectedMemberId,
  selectedPeriod,
  selectedStatus,
  selectedTaskType,
  customDateStart,
  customDateEnd,
  teamMembers,
  onMemberChange,
  onPeriodChange,
  onStatusChange,
  onTaskTypeChange,
  onCustomDateStartChange,
  onCustomDateEndChange,
  onNewTask,
}: TeamTasksFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Build active filters list for tags
  const activeFilters: { key: string; label: string }[] = [];

  if (selectedMemberId !== 'all') {
    const memberName = teamMembers.find(m => m.userId === selectedMemberId)?.fullName || 'Membro';
    activeFilters.push({ key: 'member', label: `Membro: ${memberName}` });
  }

  if (selectedPeriod !== 'all') {
    if (selectedPeriod === 'custom' && (customDateStart || customDateEnd)) {
      const startStr = customDateStart ? format(customDateStart, 'dd/MM/yyyy', { locale: ptBR }) : '...';
      const endStr = customDateEnd ? format(customDateEnd, 'dd/MM/yyyy', { locale: ptBR }) : '...';
      activeFilters.push({ key: 'period', label: `${startStr} - ${endStr}` });
    } else {
      const periodLabel = PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.label || selectedPeriod;
      activeFilters.push({ key: 'period', label: periodLabel });
    }
  }

  if (selectedStatus !== 'all') {
    const statusLabel = STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label || selectedStatus;
    activeFilters.push({ key: 'status', label: `Status: ${statusLabel}` });
  }

  if (selectedTaskType !== 'all') {
    const typeLabel = TASK_TYPE_OPTIONS.find(t => t.value === selectedTaskType)?.label || selectedTaskType;
    activeFilters.push({ key: 'taskType', label: `Tipo: ${typeLabel}` });
  }

  const handleRemoveFilter = (key: string) => {
    switch (key) {
      case 'member':
        onMemberChange('all');
        break;
      case 'period':
        onPeriodChange('all');
        onCustomDateStartChange(undefined);
        onCustomDateEndChange(undefined);
        break;
      case 'status':
        onStatusChange('all');
        break;
      case 'taskType':
        onTaskTypeChange('all');
        break;
    }
  };

  const handleClearAllFilters = () => {
    onMemberChange('all');
    onPeriodChange('all');
    onStatusChange('all');
    onTaskTypeChange('all');
    onCustomDateStartChange(undefined);
    onCustomDateEndChange(undefined);
  };

  return (
    <div className="space-y-3">
      {/* Main filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Member filter */}
        <SearchableSelect
          value={selectedMemberId}
          onValueChange={onMemberChange}
          options={[
            { value: 'all', label: 'Todos os membros' },
            ...teamMembers.map(m => ({ value: m.userId, label: m.fullName }))
          ]}
          placeholder="Membro"
          searchPlaceholder="Buscar membro..."
          className="w-[200px]"
        />

        {/* Status filter */}
        <SearchableSelect
          value={selectedStatus}
          onValueChange={onStatusChange}
          options={STATUS_OPTIONS}
          placeholder="Status"
          searchPlaceholder="Buscar status..."
          className="w-[160px]"
        />

        {/* Advanced Filters Popover */}
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 max-h-[70vh]" align="start" side="bottom" sideOffset={8}>
            <ScrollArea className="h-full max-h-[70vh] p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <SearchableSelect
                    value={selectedPeriod}
                    onValueChange={onPeriodChange}
                    options={PERIOD_OPTIONS}
                    placeholder="Selecione o período"
                    searchPlaceholder="Buscar período..."
                  />
                  
                  {selectedPeriod === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Data início</Label>
                        <DateInput
                          value={customDateStart}
                          onChange={onCustomDateStartChange}
                          placeholder="DD/MM/AAAA"
                          toYear={new Date().getFullYear() + 1}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Data fim</Label>
                        <DateInput
                          value={customDateEnd}
                          onChange={onCustomDateEndChange}
                          placeholder="DD/MM/AAAA"
                          toYear={new Date().getFullYear() + 1}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Tarefa</Label>
                  <SearchableSelect
                    value={selectedTaskType}
                    onValueChange={onTaskTypeChange}
                    options={TASK_TYPE_OPTIONS}
                    placeholder="Tipo de tarefa"
                    searchPlaceholder="Buscar..."
                  />
                </div>

                {activeFilters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllFilters}
                    className="w-full text-muted-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar todos os filtros
                  </Button>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* New Task button */}
        <Button onClick={onNewTask} className="gap-2 ml-auto">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Active filter tags */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {activeFilters.map(filter => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
            >
              {filter.label}
              <button
                onClick={() => handleRemoveFilter(filter.key)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAllFilters}
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            Limpar todos
          </Button>
        </div>
      )}
    </div>
  );
}
