import { useState } from 'react';
import { subDays } from 'date-fns';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OperationsEfficiencyFilters } from './OperationsEfficiencyFilters';
import { OperationsEfficiencyCards } from './OperationsEfficiencyCards';
import { useTicketEfficiency } from '@/hooks/useTicketEfficiency';
import { TicketDepartment, TicketPriority } from '@/types/tickets';

interface OperationsEfficiencySectionProps {
  department: TicketDepartment | null;
}

export function OperationsEfficiencySection({ department }: OperationsEfficiencySectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [startDate, setStartDate] = useState<Date>(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | null>(null);

  const { metrics, isLoading } = useTicketEfficiency({
    department,
    startDate,
    endDate,
    priority: priorityFilter,
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Métricas de Eficiência
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <OperationsEfficiencyFilters
              startDate={startDate}
              endDate={endDate}
              priorityFilter={priorityFilter}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onPriorityChange={setPriorityFilter}
            />

            <OperationsEfficiencyCards 
              metrics={metrics} 
              isLoading={isLoading} 
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
