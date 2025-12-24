import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, 
  ArrowLeft,
  Building2,
  Users,
  Crown,
  UserCheck,
  CalendarDays,
  Coins,
  Megaphone,
  FileBarChart,
  Package,
  Share2,
  Smartphone,
  Mic2,
  Video,
  BookMarked,
  Cog,
  Award
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WikiViewControls } from '@/components/wiki/WikiViewControls';
import { WikiListItem } from '@/components/wiki/WikiListItem';

interface FolderItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const folders: FolderItem[] = [
  { title: 'Matriz', icon: Building2 },
  { title: 'Coaching - Líderes em Formação', icon: Users },
  { title: 'Liderança', icon: Crown },
  { title: 'Mentoria - Ativação Sênior', icon: UserCheck },
  { title: 'Agendamentos', icon: CalendarDays },
  { title: 'Comissionamento', icon: Coins },
  { title: 'Marketing', icon: Megaphone },
  { title: 'Materiais Análise e Planejamento', icon: FileBarChart },
  { title: 'Produtos', icon: Package },
  { title: 'Redes Sociais', icon: Share2 },
  { title: 'Braúna App', icon: Smartphone },
  { title: 'Comitê de Palestras', icon: Mic2 },
  { title: 'Gravações', icon: Video },
  { title: 'Playbooks', icon: BookMarked },
  { title: 'Processos', icon: Cog },
  { title: 'Provas de Promoção', icon: Award },
];

export default function WikiArquivos() {
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
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Arquivos</h1>
              <p className="text-muted-foreground">Central de arquivos da empresa</p>
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
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
