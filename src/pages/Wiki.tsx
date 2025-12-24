import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Folder, Users, FileText, Briefcase, Settings, Shield, Heart, Star, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WikiViewControls } from '@/components/wiki/WikiViewControls';
import { WikiSearchBar } from '@/components/wiki/WikiSearchBar';
import { WikiAdminBar } from '@/components/wiki/WikiAdminBar';
import { WikiCategoryModal } from '@/components/wiki/WikiCategoryModal';
import { useWikiCategories, WikiCategory } from '@/hooks/useWikiFiles';
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

export default function Wiki() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const { data: categories = [], isLoading } = useWikiCategories();

  const sortedCategories = sortAlphabetically 
    ? [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    : categories;

  const handleCategoryClick = (category: WikiCategory) => {
    navigate(`/wiki/${category.slug}`);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Wiki</h1>
            <p className="text-muted-foreground">Central de conhecimento e recursos da empresa</p>
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
            onNewCategory={() => setCategoryModalOpen(true)}
          />
        </div>
      </div>

      {/* Categories */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : sortedCategories.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhuma categoria</h3>
          <p className="text-muted-foreground mt-1">
            Adicione uma categoria para começar a organizar seus documentos.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedCategories.map((category) => {
            const Icon = iconMap[category.icon] || Folder;
            return (
              <Card 
                key={category.id}
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 group"
                onClick={() => handleCategoryClick(category)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{category.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{category.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg bg-card divide-y">
          {sortedCategories.map((category) => {
            const Icon = iconMap[category.icon] || Folder;
            return (
              <div
                key={category.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors group"
                onClick={() => handleCategoryClick(category)}
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{category.name}</div>
                  {category.description && (
                    <div className="text-sm text-muted-foreground">{category.description}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      <WikiCategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
      />
    </div>
  );
}
