import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { useContactOpportunities } from '@/hooks/useOpportunities';
import { useContactTasks, useTasks } from '@/hooks/useTasks';

interface ClientTasksSectionProps {
  contactId: string;
}

export function ClientTasksSection({ contactId }: ClientTasksSectionProps) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  
  const { data: opportunities } = useContactOpportunities(contactId);
  const activeOpportunity = opportunities?.find(o => o.status === 'active');
  
  // Use useContactTasks to get only tasks for this specific contact
  const { data: contactTasks } = useContactTasks(contactId);
  const { completeTask } = useTasks();

  const pendingTasks = contactTasks?.filter(t => t.status === 'pending') || [];

  const handleNewTask = () => {
    if (activeOpportunity) {
      setSelectedOpportunityId(activeOpportunity.id);
      setShowNewTask(true);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Tarefas</CardTitle>
        {activeOpportunity && (
          <Button variant="ghost" size="sm" onClick={handleNewTask}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Tarefa
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {pendingTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma tarefa pendente
          </p>
        ) : (
          <div className="space-y-2">
            {pendingTasks.slice(0, 5).map((task) => {
              const isOverdue = new Date(task.scheduled_at) < new Date() && task.status === 'pending';
              
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => completeTask(task.id)}
                    >
                      {isOverdue ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <div>
                      <p className="text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(task.scheduled_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">
                      Atrasada
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {selectedOpportunityId && (
        <NewTaskModal
          open={showNewTask}
          onOpenChange={setShowNewTask}
          opportunityId={selectedOpportunityId}
        />
      )}
    </Card>
  );
}
