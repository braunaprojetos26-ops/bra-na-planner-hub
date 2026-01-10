import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useTrainingModules } from '@/hooks/useTrainingModules';
import { useToast } from '@/hooks/use-toast';

interface NewModuleModalProps {
  courseId: string;
  onClose: () => void;
}

export function NewModuleModal({ courseId, onClose }: NewModuleModalProps) {
  const { toast } = useToast();
  const { createModule } = useTrainingModules(courseId);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('');
  const [hasPracticalExam, setHasPracticalExam] = useState(false);
  const [passingScore, setPassingScore] = useState('70');

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
      await createModule.mutateAsync({
        course_id: courseId,
        name: name.trim(),
        description: description.trim() || null,
        deadline_days: deadlineDays ? parseInt(deadlineDays) : 0,
        has_practical_exam: hasPracticalExam,
        passing_score: parseInt(passingScore) || 70,
      });

      toast({
        title: 'Módulo criado',
        description: 'O módulo foi criado com sucesso.',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Erro ao criar módulo',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Módulo</DialogTitle>
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
            <p className="text-xs text-muted-foreground">
              Deixe em branco para sem prazo
            </p>
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
            <Button type="submit" disabled={createModule.isPending}>
              {createModule.isPending ? 'Criando...' : 'Criar Módulo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
