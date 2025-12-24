import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Brain,
  Percent,
  TrendingDown,
  Pause,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Coins,
  Shield,
  Settings,
  Send,
  Trophy
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WikiViewControls } from '@/components/wiki/WikiViewControls';
import { WikiListItem } from '@/components/wiki/WikiListItem';

interface ProcessItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const processes: ProcessItem[] = [
  { title: 'Desconto Planejamento', icon: Percent },
  { title: 'Redução de Parcelas', icon: TrendingDown },
  { title: 'Congelamento de Contrato', icon: Pause },
  { title: 'Inadimplência e Congelamento Compulsório', icon: AlertTriangle },
  { title: 'Cancelamento de Contrato', icon: XCircle },
  { title: 'Reversão de Churn', icon: RotateCcw },
  { title: 'Regras de Comissionamento - Recebimento de Leads', icon: Coins },
  { title: 'Manutenção de Seguros', icon: Shield },
  { title: 'Regra de Ajuste de Comissão', icon: Settings },
  { title: 'Envio da Base Provisória', icon: Send },
  { title: 'Fechamento de B4', icon: Trophy },
];

export default function WikiProcessosGerais() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortAlphabetically, setSortAlphabetically] = useState(false);

  const sortedProcesses = useMemo(() => {
    if (!sortAlphabetically) return processes;
    return [...processes].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }, [sortAlphabetically]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/wiki/processos')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10">
              <Brain className="h-8 w-8 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Processos Gerais</h1>
              <p className="text-muted-foreground">Documentação de processos gerais da empresa</p>
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

      {/* Processes */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProcesses.map((process) => {
            const Icon = process.icon;
            return (
              <Card 
                key={process.title}
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 group"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-foreground">{process.title}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg bg-card">
          {sortedProcesses.map((process) => (
            <WikiListItem
              key={process.title}
              title={process.title}
              icon={process.icon}
            />
          ))}
        </div>
      )}
    </div>
  );
}
