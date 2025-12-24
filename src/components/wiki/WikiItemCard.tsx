import { 
  FileText, 
  Folder, 
  Link as LinkIcon, 
  Download, 
  Pencil, 
  Trash2,
  Presentation,
  Table,
  Image,
  File,
  FolderOpen,
  Newspaper,
  Target,
  Megaphone,
  Cog,
  Brain,
  Users,
  CalendarDays,
  Gift,
  Globe
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WikiItem, getFileDownloadUrl, formatFileSize } from '@/hooks/useWikiFiles';
import { useAuth } from '@/contexts/AuthContext';

interface WikiItemCardProps {
  item: WikiItem;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewMode?: 'grid' | 'list';
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Folder,
  FolderOpen,
  Link: LinkIcon,
  Presentation,
  Table,
  Image,
  File,
  Newspaper,
  Target,
  Megaphone,
  Cog,
  Brain,
  Users,
  CalendarDays,
  Gift,
  Globe,
};

export function WikiItemCard({ item, onClick, onEdit, onDelete, viewMode = 'grid' }: WikiItemCardProps) {
  const { role } = useAuth();
  const isSuperadmin = role === 'superadmin';

  const getIcon = () => {
    const iconName = item.icon || 'File';
    const IconComponent = iconMap[iconName] || File;
    return IconComponent;
  };

  const Icon = getIcon();

  const getTypeLabel = () => {
    switch (item.item_type) {
      case 'folder': return 'Pasta';
      case 'file': return item.file_type?.toUpperCase() || 'Arquivo';
      case 'link': return 'Link';
      default: return '';
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.file_path) {
      window.open(getFileDownloadUrl(item.file_path), '_blank');
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  if (viewMode === 'list') {
    return (
      <div 
        className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors group"
        onClick={onClick}
      >
        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground">{item.title}</div>
          {item.description && (
            <div className="text-sm text-muted-foreground truncate">{item.description}</div>
          )}
          {item.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.keywords.slice(0, 3).map((keyword) => (
                <Badge key={keyword} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {item.keywords.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{item.keywords.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {getTypeLabel()}
          </Badge>
          {item.file_size && (
            <span className="text-xs text-muted-foreground">
              {formatFileSize(item.file_size)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.item_type === 'file' && (
            <Button variant="ghost" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          )}
          {isSuperadmin && (
            <>
              <Button variant="ghost" size="icon" onClick={handleEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground truncate">{item.title}</div>
              {item.description && (
                <div className="text-sm text-muted-foreground truncate">{item.description}</div>
              )}
            </div>
          </div>
          
          <Badge variant="secondary" className="text-xs ml-2 shrink-0">
            {getTypeLabel()}
          </Badge>
        </div>

        {item.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {item.keywords.slice(0, 3).map((keyword) => (
              <Badge key={keyword} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
            {item.keywords.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{item.keywords.length - 3}
              </Badge>
            )}
          </div>
        )}

        {(item.file_size || isSuperadmin || item.item_type === 'file') && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            {item.file_size && (
              <span className="text-xs text-muted-foreground">
                {formatFileSize(item.file_size)}
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              {item.item_type === 'file' && (
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              )}
              {isSuperadmin && (
                <>
                  <Button variant="ghost" size="icon" onClick={handleEdit}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
