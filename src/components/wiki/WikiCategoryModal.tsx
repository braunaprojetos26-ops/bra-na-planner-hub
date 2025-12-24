import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateWikiCategory, useUpdateWikiCategory, WikiCategory } from '@/hooks/useWikiFiles';

interface WikiCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCategory?: WikiCategory | null;
}

const ICON_OPTIONS = [
  { value: 'Folder', label: 'Pasta' },
  { value: 'Users', label: 'Usuários' },
  { value: 'FileText', label: 'Documento' },
  { value: 'BookOpen', label: 'Livro' },
  { value: 'Briefcase', label: 'Pasta de Trabalho' },
  { value: 'Settings', label: 'Configurações' },
  { value: 'Shield', label: 'Escudo' },
  { value: 'Heart', label: 'Coração' },
  { value: 'Star', label: 'Estrela' },
  { value: 'Globe', label: 'Globo' },
];

export function WikiCategoryModal({ 
  open, 
  onOpenChange, 
  editCategory 
}: WikiCategoryModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Folder');

  const createMutation = useCreateWikiCategory();
  const updateMutation = useUpdateWikiCategory();

  const isEditing = !!editCategory;

  useEffect(() => {
    if (editCategory) {
      setName(editCategory.name);
      setSlug(editCategory.slug);
      setDescription(editCategory.description || '');
      setIcon(editCategory.icon);
    } else {
      resetForm();
    }
  }, [editCategory, open]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditing && name) {
      const generatedSlug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  }, [name, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    if (isEditing && editCategory) {
      await updateMutation.mutateAsync({
        id: editCategory.id,
        name,
        slug,
        description: description || null,
        icon,
      });
    } else {
      await createMutation.mutateAsync({
        name,
        slug,
        description: description || null,
        icon,
        order_position: 0,
        is_active: true,
      });
    }

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Folder');
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da categoria"
              required
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="slug-da-categoria"
              required
              disabled={isEditing}
            />
            <p className="text-xs text-muted-foreground">
              Usado na URL: /wiki/{slug || 'slug'}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição da categoria..."
              rows={2}
            />
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name || !slug || isPending}>
              {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
