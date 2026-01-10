import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useTrainingCourses } from '@/hooks/useTrainingCourses';

interface NewCourseModalProps {
  open: boolean;
  onClose: () => void;
}

const TARGET_ROLES = [
  { value: 'planejador', label: 'Planejador' },
  { value: 'lider', label: 'Líder' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'gerente', label: 'Gerente' },
];

export function NewCourseModal({ open, onClose }: NewCourseModalProps) {
  const { createCourse } = useTrainingCourses();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>(['planejador']);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createCourse.mutateAsync({
      name,
      description: description || null,
      thumbnail_url: thumbnailUrl || null,
      target_roles: targetRoles,
    });

    onClose();
    setName('');
    setDescription('');
    setThumbnailUrl('');
    setTargetRoles(['planejador']);
  };

  const toggleRole = (role: string) => {
    setTargetRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Curso</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Curso *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Introdução ao Planejamento Financeiro"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Uma breve descrição do curso..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">URL da Thumbnail</Label>
            <Input
              id="thumbnail"
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Público-alvo</Label>
            <div className="grid grid-cols-2 gap-2">
              {TARGET_ROLES.map(role => (
                <label
                  key={role.value}
                  className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={targetRoles.includes(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                  />
                  <span className="text-sm">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name || createCourse.isPending}>
              {createCourse.isPending ? 'Criando...' : 'Criar Curso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
