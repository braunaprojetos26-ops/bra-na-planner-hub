import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, 
  Megaphone, 
  Globe, 
  Flag, 
  TrendingUp, 
  Presentation, 
  Cog,
  Calendar,
  Gift,
  BookOpen
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WikiViewControls } from '@/components/wiki/WikiViewControls';
import { WikiListItem } from '@/components/wiki/WikiListItem';

interface WikiCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}

const timeCards: WikiCard[] = [
  { title: 'Arquivos', description: 'Central de arquivos da empresa', icon: FolderOpen, href: '/wiki/arquivos' },
  { title: 'Últimas notícias', description: 'Atualizações e comunicados', icon: Megaphone },
  { title: 'Links Rápidos', description: 'Links úteis e acessos rápidos', icon: Globe },
  { title: 'Missão, Visão, Valores', description: 'Cultura e propósito da empresa', icon: Flag },
  { title: 'Campanhas Ativas', description: 'Campanhas comerciais em vigor', icon: TrendingUp },
  { title: 'Palestras', description: 'Materiais de palestras e eventos', icon: Presentation },
  { title: 'Processos - Braúna', description: 'Documentação de processos internos', icon: Cog, href: '/wiki/processos' },
];

const politicasCards: WikiCard[] = [
  { title: 'Eventos internos', description: 'Informações sobre eventos da empresa', icon: Calendar },
  { title: 'Política de benefícios', description: 'Guia de benefícios dos colaboradores', icon: Gift },
];

function WikiCardItem({ card, onClick }: { card: WikiCard; onClick?: () => void }) {
  const Icon = card.icon;
  
  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle className="text-base">{card.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{card.description}</CardDescription>
      </CardContent>
    </Card>
  );
}

export default function Wiki() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortAlphabetically, setSortAlphabetically] = useState(false);

  const handleCardClick = (card: WikiCard) => {
    if (card.href) {
      navigate(card.href);
    }
  };

  const sortedTimeCards = useMemo(() => {
    if (!sortAlphabetically) return timeCards;
    return [...timeCards].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }, [sortAlphabetically]);

  const sortedPoliticasCards = useMemo(() => {
    if (!sortAlphabetically) return politicasCards;
    return [...politicasCards].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }, [sortAlphabetically]);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Wiki</h1>
            <p className="text-muted-foreground">Central de conhecimento e recursos da empresa</p>
          </div>
        </div>
        <WikiViewControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortAlphabetically={sortAlphabetically}
          onSortChange={setSortAlphabetically}
        />
      </div>

      {/* Seção Time */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground border-b pb-2">Time</h2>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedTimeCards.map((card) => (
              <WikiCardItem 
                key={card.title} 
                card={card} 
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg bg-card">
            {sortedTimeCards.map((card) => (
              <WikiListItem
                key={card.title}
                title={card.title}
                description={card.description}
                icon={card.icon}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Seção Políticas */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground border-b pb-2">Políticas</h2>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedPoliticasCards.map((card) => (
              <WikiCardItem 
                key={card.title} 
                card={card} 
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg bg-card">
            {sortedPoliticasCards.map((card) => (
              <WikiListItem
                key={card.title}
                title={card.title}
                description={card.description}
                icon={card.icon}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
