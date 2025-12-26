import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Search, Check, ChevronRight } from 'lucide-react';
import { useDataCollectionSchema } from '@/hooks/useDataCollectionSchema';
import { cn } from '@/lib/utils';

interface DataPathPickerProps {
  selectedPaths: string[];
  onAddPath: (path: string) => void;
}

export function DataPathPicker({ selectedPaths, onAddPath }: DataPathPickerProps) {
  const { data: schema, isLoading } = useDataCollectionSchema();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Build flat list of all available paths
  const availablePaths = useMemo(() => {
    if (!schema?.sections) return [];

    const paths: { path: string; label: string; section: string }[] = [];

    for (const section of schema.sections) {
      for (const field of section.fields || []) {
        paths.push({
          path: field.data_path,
          label: field.label,
          section: section.title
        });
      }
    }

    return paths;
  }, [schema]);

  // Filter by search
  const filteredPaths = useMemo(() => {
    if (!search.trim()) return availablePaths;
    const lowerSearch = search.toLowerCase();
    return availablePaths.filter(
      p =>
        p.path.toLowerCase().includes(lowerSearch) ||
        p.label.toLowerCase().includes(lowerSearch) ||
        p.section.toLowerCase().includes(lowerSearch)
    );
  }, [availablePaths, search]);

  // Group by section
  const groupedPaths = useMemo(() => {
    const groups: Record<string, typeof filteredPaths> = {};
    for (const p of filteredPaths) {
      if (!groups[p.section]) groups[p.section] = [];
      groups[p.section].push(p);
    }
    return groups;
  }, [filteredPaths]);

  const handleSelect = (path: string) => {
    if (!selectedPaths.includes(path)) {
      onAddPath(path);
    }
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="secondary">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Campo
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Carregando campos...
            </div>
          ) : Object.keys(groupedPaths).length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {search ? 'Nenhum campo encontrado' : 'Nenhum campo disponível'}
            </div>
          ) : (
            <div className="p-1">
              {Object.entries(groupedPaths).map(([section, paths]) => (
                <div key={section} className="mb-2">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    {section}
                  </div>
                  {paths.map((p) => {
                    const isSelected = selectedPaths.includes(p.path);
                    return (
                      <button
                        key={p.path}
                        type="button"
                        disabled={isSelected}
                        onClick={() => handleSelect(p.path)}
                        className={cn(
                          'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between gap-2',
                          isSelected
                            ? 'opacity-50 cursor-not-allowed bg-muted'
                            : 'hover:bg-accent cursor-pointer'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{p.label}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {p.path}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t text-xs text-muted-foreground">
          {availablePaths.length} campos disponíveis
        </div>
      </PopoverContent>
    </Popover>
  );
}
