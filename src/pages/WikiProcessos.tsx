import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cog, Brain, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WikiViewControls } from '@/components/wiki/WikiViewControls';
import { WikiListItem } from '@/components/wiki/WikiListItem';

interface FolderItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const folders: FolderItem[] = [
  { title: 'Processos Gerais', icon: Brain, href: '/wiki/processos/gerais' },
  { title: 'Processos Liderança', icon: Users, href: '/wiki/processos/lideranca' },
];

export default function WikiProcessos() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortAlphabetically, setSortAlphabetically] = useState(false);

  const sortedFolders = useMemo(() => {
    if (!sortAlphabetically) return folders;
    return [...folders].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }, [sortAlphabetically]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/wiki')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Cog className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Processos - Braúna</h1>
              <p className="text-muted-foreground">Documentação de processos internos</p>
            </div>
          </div>
        </div>
        <WikiViewControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortAlphabetically={sortAlphabetically}
          onSortChange={setSortAlphabetically}
        />
      </div>

      {/* Folders */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedFolders.map((folder) => {
            const Icon = folder.icon;
            return (
              <Card 
                key={folder.title}
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 group"
                onClick={() => navigate(folder.href)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-foreground">{folder.title}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg bg-card">
          {sortedFolders.map((folder) => (
            <WikiListItem
              key={folder.title}
              title={folder.title}
              icon={folder.icon}
              onClick={() => navigate(folder.href)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
