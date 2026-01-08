import { useState } from 'react';
import { Calendar, Flag, Users, CircleDot, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
import { AssigneePicker } from './AssigneePicker';
import { ProjectPage } from '@/hooks/useProjectPages';
import { ProjectMember } from '@/hooks/useProjectMembers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PagePropertiesSectionProps {
  page: ProjectPage;
  members: ProjectMember[];
  currentUserId: string;
  onUpdate: (property: string, value: string | null) => void;
  onAssign: (userId: string) => void;
  onUnassign: (userId: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Não iniciado', color: 'bg-muted text-muted-foreground' },
  { value: 'in_progress', label: 'Em andamento', color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400' },
  { value: 'done', label: 'Concluído', color: 'bg-green-500/20 text-green-600 dark:text-green-400' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  { value: 'high', label: 'Alta', color: 'bg-red-500/20 text-red-600 dark:text-red-400' },
];

export function PagePropertiesSection({
  page,
  members,
  currentUserId,
  onUpdate,
  onAssign,
  onUnassign,
}: PagePropertiesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dateOpen, setDateOpen] = useState(false);

  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === page.status) || STATUS_OPTIONS[0];
  const selectedPriority = PRIORITY_OPTIONS.find((p) => p.value === page.priority) || PRIORITY_OPTIONS[0];

  const formattedDate = page.due_date
    ? format(new Date(page.due_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  return (
    <div className="border-b border-border/50 pb-4 mb-6">
      <div className="space-y-3">
        {/* Status - sempre visível */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground w-40">
            <CircleDot className="h-4 w-4" />
            <span>Status</span>
          </div>
          <Select
            value={page.status}
            onValueChange={(value) => onUpdate('status', value)}
          >
            <SelectTrigger className="w-auto h-7 border-0 bg-transparent hover:bg-muted px-2">
              <Badge className={cn('font-normal', selectedStatus.color)}>
                {selectedStatus.label}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <Badge className={cn('font-normal', option.color)}>
                    {option.label}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isExpanded && (
          <>
            {/* Data Limite */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground w-40">
                <Calendar className="h-4 w-4" />
                <span>Data Limite</span>
              </div>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    {formattedDate || 'Vazio'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={page.due_date ? new Date(page.due_date) : undefined}
                    onSelect={(date) => {
                      onUpdate('due_date', date ? date.toISOString() : null);
                      setDateOpen(false);
                    }}
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                  {page.due_date && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => {
                          onUpdate('due_date', null);
                          setDateOpen(false);
                        }}
                      >
                        Remover data
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Prioridade */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground w-40">
                <Flag className="h-4 w-4" />
                <span>Prioridade</span>
              </div>
              <Select
                value={page.priority}
                onValueChange={(value) => onUpdate('priority', value)}
              >
                <SelectTrigger className="w-auto h-7 border-0 bg-transparent hover:bg-muted px-2">
                  <Badge className={cn('font-normal', selectedPriority.color)}>
                    {selectedPriority.label}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <Badge className={cn('font-normal', option.color)}>
                        {option.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Responsáveis */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground w-40">
                <Users className="h-4 w-4" />
                <span>Responsáveis</span>
              </div>
              <AssigneePicker
                assignees={page.assignees || []}
                members={members}
                currentUserId={currentUserId}
                onAssign={onAssign}
                onUnassign={onUnassign}
              />
            </div>
          </>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-muted-foreground hover:text-foreground"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4 mr-1" />
            Ocultar propriedades
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-1" />
            Mostrar propriedades
          </>
        )}
      </Button>
    </div>
  );
}
