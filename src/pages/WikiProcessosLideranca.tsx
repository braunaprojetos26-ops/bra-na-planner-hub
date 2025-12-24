import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users,
  MessageSquare,
  XCircle,
  DollarSign,
  ClipboardCheck,
  UserPlus,
  FileText
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProcessItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const processes: ProcessItem[] = [
  { title: 'Processo de Desligamento - Até Conversa de Desligamento', icon: MessageSquare },
  { title: 'Processo de Desligamento - Pós Conversa de Desligamento', icon: XCircle },
  { title: 'Processo de Desligamento - Recebimento de Fixo e Comissões', icon: DollarSign },
  { title: 'Avaliações Comportamentais e de Desempenho', icon: ClipboardCheck },
  { title: 'Passagem de Clientes - Contagem de Clientes Ativos para Planejadores', icon: UserPlus },
  { title: 'Regras de Contratação por Cargo de Liderança', icon: FileText },
];

export default function WikiProcessosLideranca() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
          <div className="p-3 rounded-xl bg-sky-500/10">
            <Users className="h-8 w-8 text-sky-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Processos Liderança</h1>
            <p className="text-muted-foreground">Documentação de processos para liderança</p>
          </div>
        </div>
      </div>

      {/* Processes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {processes.map((process) => {
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
    </div>
  );
}
