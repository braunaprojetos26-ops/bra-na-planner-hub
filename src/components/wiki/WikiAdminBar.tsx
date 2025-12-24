import { Plus, FolderPlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface WikiAdminBarProps {
  onNewCategory?: () => void;
  onNewFolder?: () => void;
  onUploadFile?: () => void;
  showCategoryButton?: boolean;
}

export function WikiAdminBar({ 
  onNewCategory, 
  onNewFolder, 
  onUploadFile,
  showCategoryButton = true 
}: WikiAdminBarProps) {
  const { role } = useAuth();
  const isSuperadmin = role === 'superadmin';

  if (!isSuperadmin) return null;

  return (
    <div className="flex items-center gap-2">
      {showCategoryButton && onNewCategory && (
        <Button variant="outline" size="sm" onClick={onNewCategory}>
          <Plus className="h-4 w-4 mr-1" />
          Categoria
        </Button>
      )}
      {onNewFolder && (
        <Button variant="outline" size="sm" onClick={onNewFolder}>
          <FolderPlus className="h-4 w-4 mr-1" />
          Pasta
        </Button>
      )}
      {onUploadFile && (
        <Button size="sm" onClick={onUploadFile}>
          <Upload className="h-4 w-4 mr-1" />
          Arquivo
        </Button>
      )}
    </div>
  );
}
