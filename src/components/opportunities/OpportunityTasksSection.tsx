import { useState } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TasksList } from '@/components/tasks/TasksList';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';

interface OpportunityTasksSectionProps {
  opportunityId: string;
}

export function OpportunityTasksSection({ opportunityId }: OpportunityTasksSectionProps) {
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Tarefas</h3>
        </div>
        <Button size="sm" onClick={() => setIsNewTaskModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Nova Tarefa
        </Button>
      </div>

      <TasksList opportunityId={opportunityId} />

      <NewTaskModal
        open={isNewTaskModalOpen}
        onOpenChange={setIsNewTaskModalOpen}
        opportunityId={opportunityId}
      />
    </div>
  );
}
