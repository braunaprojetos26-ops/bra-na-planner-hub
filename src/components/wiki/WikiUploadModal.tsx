import { useState } from 'react';
import { Upload, X, Plus } from 'lucide-react';
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
import { useWikiCategories, useWikiItems, useUploadWikiFile, WikiCategory, WikiItem } from '@/hooks/useWikiFiles';

interface WikiUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategoryId?: string;
  defaultParentId?: string | null;
}

export function WikiUploadModal({ 
  open, 
  onOpenChange, 
  defaultCategoryId,
  defaultParentId = null 
}: WikiUploadModalProps) {
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data: categories = [] } = useWikiCategories();
  const { data: folders = [] } = useWikiItems(categoryId || undefined, null);
  const uploadMutation = useUploadWikiFile();

  // Filter only folders for parent selection
  const availableFolders = folders.filter((item: WikiItem) => item.item_type === 'folder');

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        // Auto-fill title from filename (without extension)
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !categoryId || !title) return;

    await uploadMutation.mutateAsync({
      file,
      categoryId,
      parentId,
      title,
      description,
      keywords,
    });

    // Reset form and close
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setCategoryId(defaultCategoryId || '');
    setParentId(defaultParentId);
    setTitle('');
    setDescription('');
    setKeywords([]);
    setKeywordInput('');
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload de Arquivo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat: WikiCategory) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parent Folder Selection */}
          {categoryId && availableFolders.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="parent">Pasta (opcional)</Label>
              <Select value={parentId || 'root'} onValueChange={(v) => setParentId(v === 'root' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Raiz da categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Raiz da categoria</SelectItem>
                  {availableFolders.map((folder: WikiItem) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* File Selection */}
          <div className="space-y-2">
            <Label>Arquivo *</Label>
            {file ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do documento"
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
              placeholder="Breve descrição do documento..."
              rows={2}
            />
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>Palavras-chave</Label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma palavra e pressione Enter"
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
            <Button 
              type="submit" 
              disabled={!file || !categoryId || !title || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Enviando...' : 'Enviar Arquivo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
