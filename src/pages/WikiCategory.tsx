import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Folder, Users, FileText, BookOpen, Briefcase, Settings, Shield, Heart, Star, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WikiViewControls } from '@/components/wiki/WikiViewControls';
import { WikiSearchBar } from '@/components/wiki/WikiSearchBar';
import { WikiItemCard } from '@/components/wiki/WikiItemCard';
import { WikiAdminBar } from '@/components/wiki/WikiAdminBar';
import { WikiUploadModal } from '@/components/wiki/WikiUploadModal';
import { WikiItemModal } from '@/components/wiki/WikiItemModal';
import { WikiDeleteConfirmModal } from '@/components/wiki/WikiDeleteConfirmModal';
import { 
  useWikiCategoryBySlug, 
  useWikiItems, 
  useWikiItem,
  useDeleteWikiItem,
  WikiItem,
  getFileDownloadUrl 
} from '@/hooks/useWikiFiles';
import { Skeleton } from '@/components/ui/skeleton';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder,
  Users,
  FileText,
  BookOpen,
  Briefcase,
  Settings,
  Shield,
  Heart,
  Star,
  Globe,
};

export default function WikiCategory() {
  const { categorySlug, folderId } = useParams();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<WikiItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<WikiItem | null>(null);

  const { data: category, isLoading: categoryLoading } = useWikiCategoryBySlug(categorySlug);
  const { data: parentFolder } = useWikiItem(folderId);
  const { data: items = [], isLoading: itemsLoading } = useWikiItems(category?.id, folderId || null);
  const deleteMutation = useDeleteWikiItem();

  const sortedItems = useMemo(() => {
    if (!sortAlphabetically) return items;
    return [...items].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }, [items, sortAlphabetically]);

  const handleItemClick = (item: WikiItem) => {
    if (item.item_type === 'folder') {
      navigate(`/wiki/${categorySlug}/${item.id}`);
    } else if (item.item_type === 'file' && item.file_path) {
      window.open(getFileDownloadUrl(item.file_path), '_blank');
    } else if (item.item_type === 'link' && item.href) {
      if (item.href.startsWith('http')) {
        window.open(item.href, '_blank');
      } else {
        navigate(item.href);
      }
    }
  };

  const handleEdit = (item: WikiItem) => {
    setEditItem(item);
    if (item.item_type === 'file') {
      // For files, we only allow editing metadata, not the file itself
      setItemModalOpen(true);
    } else {
      setItemModalOpen(true);
    }
  };

  const handleDelete = (item: WikiItem) => {
    setDeleteItem(item);
  };

  const confirmDelete = async () => {
    if (deleteItem) {
      await deleteMutation.mutateAsync(deleteItem);
      setDeleteItem(null);
    }
  };

  const handleBack = () => {
    if (folderId && parentFolder?.parent_id) {
      navigate(`/wiki/${categorySlug}/${parentFolder.parent_id}`);
    } else if (folderId) {
      navigate(`/wiki/${categorySlug}`);
    } else {
      navigate('/wiki');
    }
  };

  const CategoryIcon = category ? (iconMap[category.icon] || Folder) : Folder;

  if (categoryLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground">Categoria não encontrada</h2>
          <p className="text-muted-foreground mt-2">A categoria "{categorySlug}" não existe.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/wiki')}>
            Voltar para Wiki
          </Button>
        </div>
      </div>
    );
  }

  const pageTitle = folderId && parentFolder ? parentFolder.title : category.name;
  const pageDescription = folderId && parentFolder ? parentFolder.description : category.description;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <CategoryIcon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
              {pageDescription && (
                <p className="text-muted-foreground">{pageDescription}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <WikiSearchBar />
          <WikiViewControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortAlphabetically={sortAlphabetically}
            onSortChange={setSortAlphabetically}
          />
          <WikiAdminBar 
            showCategoryButton={false}
            onNewFolder={() => {
              setEditItem(null);
              setItemModalOpen(true);
            }}
            onUploadFile={() => setUploadModalOpen(true)}
          />
        </div>
      </div>

      {/* Breadcrumb */}
      {folderId && parentFolder && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button 
            onClick={() => navigate('/wiki')} 
            className="hover:text-foreground transition-colors"
          >
            Wiki
          </button>
          <span>/</span>
          <button 
            onClick={() => navigate(`/wiki/${categorySlug}`)} 
            className="hover:text-foreground transition-colors"
          >
            {category.name}
          </button>
          <span>/</span>
          <span className="text-foreground">{parentFolder.title}</span>
        </div>
      )}

      {/* Items */}
      {itemsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Pasta vazia</h3>
          <p className="text-muted-foreground mt-1">
            Nenhum item nesta pasta ainda.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedItems.map((item) => (
            <WikiItemCard
              key={item.id}
              item={item}
              viewMode="grid"
              onClick={() => handleItemClick(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg bg-card">
          {sortedItems.map((item) => (
            <WikiItemCard
              key={item.id}
              item={item}
              viewMode="list"
              onClick={() => handleItemClick(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <WikiUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        defaultCategoryId={category.id}
        defaultParentId={folderId || null}
      />

      <WikiItemModal
        open={itemModalOpen}
        onOpenChange={(open) => {
          setItemModalOpen(open);
          if (!open) setEditItem(null);
        }}
        categoryId={category.id}
        parentId={folderId || null}
        editItem={editItem}
      />

      <WikiDeleteConfirmModal
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        onConfirm={confirmDelete}
        title={deleteItem?.title || ''}
        description={deleteItem?.item_type === 'folder' ? 'Todos os itens dentro desta pasta também serão removidos.' : undefined}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
