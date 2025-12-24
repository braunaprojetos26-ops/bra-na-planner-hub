import { useState, useEffect, useRef } from 'react';
import { Search, FileText, Folder, Link, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSearchWiki, WikiItem, WikiCategory } from '@/hooks/useWikiFiles';
import { useNavigate } from 'react-router-dom';
import { getFileDownloadUrl } from '@/hooks/useWikiFiles';

interface WikiSearchBarProps {
  onSearching?: (isSearching: boolean) => void;
}

export function WikiSearchBar({ onSearching }: WikiSearchBarProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isLoading } = useSearchWiki(debouncedTerm);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update parent about search state
  useEffect(() => {
    onSearching?.(searchTerm.length >= 2);
  }, [searchTerm, onSearching]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (item: WikiItem & { category: WikiCategory }) => {
    if (item.item_type === 'file' && item.file_path) {
      window.open(getFileDownloadUrl(item.file_path), '_blank');
    } else if (item.item_type === 'folder') {
      navigate(`/wiki/${item.category.slug}/${item.id}`);
    } else if (item.item_type === 'link' && item.href) {
      if (item.href.startsWith('http')) {
        window.open(item.href, '_blank');
      } else {
        navigate(item.href);
      }
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'file': return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'folder': return <Folder className="h-4 w-4 text-muted-foreground" />;
      case 'link': return <Link className="h-4 w-4 text-muted-foreground" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const highlightMatch = (text: string, term: string) => {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-primary/20 text-foreground">{part}</mark> : part
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Pesquisar documentos, processos..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && searchTerm.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Pesquisando...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhum resultado encontrado para "{searchTerm}"
            </div>
          ) : (
            <div className="divide-y">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleResultClick(item)}
                  className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  <div className="mt-0.5">
                    {getItemIcon(item.item_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">
                      {highlightMatch(item.title, debouncedTerm)}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{item.category?.name}</span>
                      {item.file_type && (
                        <Badge variant="secondary" className="text-xs uppercase">
                          {item.file_type}
                        </Badge>
                      )}
                    </div>
                    {item.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.keywords.slice(0, 3).map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {highlightMatch(keyword, debouncedTerm)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
