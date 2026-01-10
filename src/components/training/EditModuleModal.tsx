import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useTrainingModules } from '@/hooks/useTrainingModules';
import { useToast } from '@/hooks/use-toast';
import type { TrainingModule } from '@/types/training';

interface EditModuleModalProps {
  module: TrainingModule;
  onClose: () => void;
}

export function EditModuleModal({ module, onClose }: EditModuleModalProps) {
  const { toast } = useToast();
  const { updateModule } = useTrainingModules(module.course_id);
  
  const [name, setName] = useState(module.name);
  const [description, setDescription] = useState(module.description || '');
  const [deadlineDays, setDeadlineDays] = useState(module.deadline_days?.toString() || '');
  const [hasPracticalExam, setHasPracticalExam] = useState(module.has_practical_exam);
  const [passingScore, setPassingScore] = useState(module.passing_score?.toString() || '70');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do módulo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateModule.mutateAsync({
        id: module.id,
        name: name.trim(),
        description: description.trim() || null,
        deadline_days: deadlineDays ? parseInt(deadlineDays) : 0,
        has_practical_exam: hasPracticalExam,
        passing_score: parseInt(passingScore) || 70,
      });

      toast({
        title: 'Módulo atualizado',
        description: 'As alterações foram salvas.',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar módulo',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Módulo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do módulo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do módulo"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadlineDays">Prazo (dias)</Label>
            <Input
              id="deadlineDays"
              type="number"
              min="0"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              placeholder="Ex: 7"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passingScore">Nota mínima (%)</Label>
            <Input
              id="passingScore"
              type="number"
              min="0"
              max="100"
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="practicalExam">Requer avaliação prática</Label>
            <Switch
              id="practicalExam"
              checked={hasPracticalExam}
              onCheckedChange={setHasPracticalExam}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateModule.isPending}>
              {updateModule.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
