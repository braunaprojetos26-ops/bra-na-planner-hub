import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, ListPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskType, TASK_TYPE_LABELS } from '@/types/tasks';
import { useTasks } from '@/hooks/useTasks';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface QuickTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: Date | null;
}

interface BulkTaskItem {
  id: string;
  title: string;
  description: string;
  time: string;
  taskType: TaskType;
}

let bulkIdCounter = 0;
function newBulkItem(): BulkTaskItem {
  return { id: `bulk-${++bulkIdCounter}`, title: '', description: '', time: '09:00', taskType: 'other' };
}

export function QuickTaskModal({ open, onOpenChange, defaultDate }: QuickTaskModalProps) {
  const { createTask, isCreating } = useTasks();
  const queryClient = useQueryClient();

  // Single task state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('other');
  const [time, setTime] = useState('09:00');

  // Bulk task state
  const [bulkItems, setBulkItems] = useState<BulkTaskItem[]>([newBulkItem(), newBulkItem(), newBulkItem()]);
  const [isBulkCreating, setIsBulkCreating] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['all-user-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !defaultDate) return;

    const [hours, minutes] = time.split(':').map(Number);
    const scheduledAt = new Date(defaultDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      task_type: taskType,
      scheduled_at: scheduledAt.toISOString(),
    });

    invalidateAll();
    resetSingle();
    onOpenChange(false);
  };

  const handleBulkSubmit = async () => {
    if (!defaultDate) return;
    const validItems = bulkItems.filter(item => item.title.trim());
    if (validItems.length === 0) return;

    setIsBulkCreating(true);
    try {
      for (const item of validItems) {
        const [hours, minutes] = item.time.split(':').map(Number);
        const scheduledAt = new Date(defaultDate);
        scheduledAt.setHours(hours, minutes, 0, 0);

        await createTask({
          title: item.title.trim(),
          description: item.description.trim() || undefined,
          task_type: item.taskType,
          scheduled_at: scheduledAt.toISOString(),
        });
      }
      invalidateAll();
      toast.success(`${validItems.length} tarefa(s) criadas com sucesso!`);
      resetBulk();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar tarefas');
    } finally {
      setIsBulkCreating(false);
    }
  };

  const resetSingle = () => {
    setTitle('');
    setDescription('');
    setTaskType('other');
    setTime('09:00');
  };

  const resetBulk = () => {
    setBulkItems([newBulkItem(), newBulkItem(), newBulkItem()]);
  };

  const updateBulkItem = (id: string, field: keyof BulkTaskItem, value: string) => {
    setBulkItems(items => items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeBulkItem = (id: string) => {
    setBulkItems(items => items.filter(item => item.id !== id));
  };

  const addBulkItem = () => {
    setBulkItems(items => [...items, newBulkItem()]);
  };

  const validBulkCount = bulkItems.filter(item => item.title.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Nova tarefa — {defaultDate && format(defaultDate, "dd 'de' MMMM", { locale: ptBR })}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="single">
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Tarefa única
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex-1">
              <ListPlus className="h-3.5 w-3.5 mr-1" />
              Múltiplas tarefas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Título</Label>
                <Input
                  id="task-title"
                  placeholder="O que precisa ser feito?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-desc">Descrição (opcional)</Label>
                <Textarea
                  id="task-desc"
                  placeholder="Detalhes adicionais..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-time">Horário limite</Label>
                  <Input
                    id="task-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!title.trim() || isCreating}>
                  {isCreating ? 'Criando...' : 'Criar Tarefa'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Adicione todas as tarefas do dia de uma vez. Preencha o título e ajuste horário/tipo se necessário.
              </p>

              <ScrollArea className="max-h-[40vh]">
                <div className="space-y-2 pr-2">
                  {bulkItems.map((item, idx) => (
                    <div key={item.id} className="space-y-1.5 p-2 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5 shrink-0 text-center">{idx + 1}</span>
                        <Input
                          placeholder="Título da tarefa"
                          value={item.title}
                          onChange={(e) => updateBulkItem(item.id, 'title', e.target.value)}
                          className="flex-1 h-8 text-sm"
                        />
                        <Input
                          type="time"
                          value={item.time}
                          onChange={(e) => updateBulkItem(item.id, 'time', e.target.value)}
                          className="w-24 h-8 text-sm"
                        />
                        <Select value={item.taskType} onValueChange={(v) => updateBulkItem(item.id, 'taskType', v)}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {bulkItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeBulkItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="pl-7">
                        <Input
                          placeholder="Descrição (opcional)"
                          value={item.description}
                          onChange={(e) => updateBulkItem(item.id, 'description', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={addBulkItem}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar mais uma linha
              </Button>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-muted-foreground">
                  {validBulkCount} tarefa(s) preenchida(s)
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleBulkSubmit}
                    disabled={validBulkCount === 0 || isBulkCreating}
                  >
                    {isBulkCreating ? 'Criando...' : `Criar ${validBulkCount} tarefa(s)`}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
