import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateWikiItem, useUpdateWikiItem, WikiItem } from '@/hooks/useWikiFiles';

interface WikiItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  parentId?: string | null;
  editItem?: WikiItem | null;
}

const ICON_OPTIONS = [
  { value: 'Folder', label: 'Pasta' },
  { value: 'FolderOpen', label: 'Pasta Aberta' },
  { value: 'FileText', label: 'Documento' },
  { value: 'Link', label: 'Link' },
  { value: 'Presentation', label: 'Apresentação' },
  { value: 'Table', label: 'Tabela' },
  { value: 'Image', label: 'Imagem' },
  { value: 'Newspaper', label: 'Notícia' },
  { value: 'Target', label: 'Alvo' },
  { value: 'Megaphone', label: 'Megafone' },
  { value: 'Cog', label: 'Configuração' },
  { value: 'Brain', label: 'Cérebro' },
  { value: 'Users', label: 'Usuários' },
  { value: 'CalendarDays', label: 'Calendário' },
  { value: 'Gift', label: 'Presente' },
  { value: 'Globe', label: 'Globo' },
];

export function WikiItemModal({ 
  open, 
  onOpenChange, 
  categoryId,
  parentId = null,
  editItem 
}: WikiItemModalProps) {
  const [itemType, setItemType] = useState<'folder' | 'link'>('folder');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [href, setHref] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const createMutation = useCreateWikiItem();
  const updateMutation = useUpdateWikiItem();

  const isEditing = !!editItem;

  useEffect(() => {
    if (editItem) {
      setItemType(editItem.item_type as 'folder' | 'link');
      setTitle(editItem.title);
      setDescription(editItem.description || '');
      setIcon(editItem.icon || 'Folder');
      setHref(editItem.href || '');
      setKeywords(editItem.keywords || []);
    } else {
      resetForm();
    }
  }, [editItem, open]);

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    if (isEditing && editItem) {
      await updateMutation.mutateAsync({
        id: editItem.id,
        title,
        description: description || null,
        icon,
        href: itemType === 'link' ? href : null,
        keywords,
      });
    } else {
      await createMutation.mutateAsync({
        category_id: categoryId,
        parent_id: parentId,
        title,
        description: description || null,
        icon,
        item_type: itemType,
        href: itemType === 'link' ? href : null,
        keywords,
        file_path: null,
        file_name: null,
        file_type: null,
        file_size: null,
        uploaded_by: null,
        order_position: 0,
        is_active: true,
      });
    }

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setItemType('folder');
    setTitle('');
    setDescription('');
    setIcon('Folder');
    setHref('');
    setKeywords([]);
    setKeywordInput('');
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Item' : 'Novo Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Type (only for new items, and only if not a file) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={itemType} onValueChange={(v) => setItemType(v as 'folder' | 'link')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="folder">Pasta</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do item"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição..."
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

          {/* URL for links */}
          {itemType === 'link' && (
            <div className="space-y-2">
              <Label htmlFor="href">URL</Label>
              <Input
                id="href"
                type="url"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="https://exemplo.com ou /rota-interna"
              />
            </div>
          )}

          {/* Keywords */}
          <div className="space-y-2">
            <Label>Palavras-chave</Label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite e pressione Enter"
              />
              <Button type="button" variant="outline" onClick={handleAddKeyword}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title || isPending}>
              {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
