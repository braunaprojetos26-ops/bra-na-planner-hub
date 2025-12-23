import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, AlertTriangle, Star, Banknote, Plus, CheckSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { useTasks } from '@/hooks/useTasks';
import type { Opportunity } from '@/types/opportunities';

interface OpportunityKanbanCardProps {
  opportunity: Opportunity;
  slaStatus: 'ok' | 'warning' | 'overdue' | null;
  isReadOnly: boolean;
  onDragStart: (e: React.DragEvent, opportunityId: string) => void;
}

export function OpportunityKanbanCard({
  opportunity,
  slaStatus,
  isReadOnly,
  onDragStart,
}: OpportunityKanbanCardProps) {
  const navigate = useNavigate();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const { tasks } = useTasks(opportunity.id);
  
  const pendingTasksCount = tasks.filter(t => t.status === 'pending' || t.status === 'overdue').length;
  const hasOverdueTasks = tasks.some(t => t.status === 'overdue');

  const handleCreateTaskClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTaskModal(true);
  };

  return (
    <>
      <Card
        className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
          slaStatus === 'overdue' ? 'ring-2 ring-destructive' : 
          slaStatus === 'warning' ? 'ring-2 ring-warning' : ''
        }`}
        draggable={!isReadOnly}
        onDragStart={e => onDragStart(e, opportunity.id)}
        onClick={() => navigate(`/pipeline/${opportunity.id}`)}
      >
        {/* Header with status indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-4 rounded-sm ${
            opportunity.status === 'won' ? 'bg-green-500' :
            opportunity.status === 'lost' ? 'bg-destructive' :
            'bg-primary'
          }`} />
          <span className="text-xs text-muted-foreground">
            {opportunity.status === 'won' ? 'Vendido' :
             opportunity.status === 'lost' ? 'Perdido' :
             'Em andamento'}
          </span>
        </div>

        {/* Contact name */}
        <div className="flex items-start justify-between mb-2">
          <p className="font-medium text-sm line-clamp-1">
            {opportunity.contact?.full_name}
          </p>
          {opportunity.contact?.owner_id === null && (
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          )}
        </div>
        
        {/* Info row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-2">
            {opportunity.qualification ? (
              <div className="flex items-center gap-0.5">
                <span>{opportunity.qualification}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              </div>
            ) : null}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <User className="w-3.5 h-3.5 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{opportunity.contact?.owner?.full_name || 'Sem responsável'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Tasks indicator */}
            {pendingTasksCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center gap-0.5 ${hasOverdueTasks ? 'text-destructive' : 'text-muted-foreground'}`}>
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{pendingTasksCount}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{pendingTasksCount} tarefa(s) pendente(s)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {(opportunity.status === 'won' && opportunity.total_contract_value) ? (
            <div className="flex items-center gap-1 text-green-600 font-medium">
              <Banknote className="w-3.5 h-3.5" />
              <span>
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL',
                  notation: 'compact',
                  maximumFractionDigits: 1
                }).format(opportunity.total_contract_value)}
              </span>
            </div>
          ) : opportunity.proposal_value ? (
            <div className="flex items-center gap-1 text-accent font-medium">
              <Banknote className="w-3.5 h-3.5" />
              <span>
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL',
                  notation: 'compact',
                  maximumFractionDigits: 1
                }).format(opportunity.proposal_value)}
              </span>
            </div>
          ) : null}
        </div>

        {/* Create Task Button */}
        {!isReadOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary"
            onClick={handleCreateTaskClick}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Criar Tarefa
          </Button>
        )}
      </Card>

      <NewTaskModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        opportunityId={opportunity.id}
      />
    </>
  );
}
