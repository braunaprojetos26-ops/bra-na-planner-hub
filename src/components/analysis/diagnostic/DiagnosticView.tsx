import { useEffect } from 'react';
import { RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DiagnosticCategoryCard } from './DiagnosticCategoryCard';
import { useContactDiagnostic } from '@/hooks/useContactDiagnostic';
import { useDiagnosticCategories } from '@/hooks/useContactDiagnostic';

interface DiagnosticViewProps {
  contactId: string;
  onComplete?: () => void;
}

export function DiagnosticView({ contactId, onComplete }: DiagnosticViewProps) {
  const { 
    data: diagnostic, 
    isLoading: diagnosticLoading,
    error: diagnosticError,
  } = useContactDiagnostic(contactId);

  const {
    data: categories,
    isLoading: categoriesLoading,
  } = useDiagnosticCategories();

  const { 
    mutate: generateDiagnostic, 
    isPending: isGenerating,
    error: generateError,
  } = useContactDiagnostic(contactId, true);

  // Auto-generate if no diagnostic exists
  useEffect(() => {
    if (!diagnosticLoading && !diagnostic && !isGenerating && categories?.length) {
      generateDiagnostic({ contactId });
    }
  }, [diagnosticLoading, diagnostic, isGenerating, categories, contactId, generateDiagnostic]);

  const isLoading = diagnosticLoading || categoriesLoading || isGenerating;
  const error = diagnosticError || generateError;

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Erro ao gerar diagnóstico'}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => generateDiagnostic({ contactId })}
          disabled={isGenerating}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="w-5 h-5 animate-pulse text-primary" />
          <span>Gerando diagnóstico com IA...</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-3 p-4 border rounded-lg">
              <Skeleton className="h-4 w-24 mx-auto" />
              <Skeleton className="h-24 w-24 rounded-full mx-auto" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!diagnostic || !categories) {
    return null;
  }

  const categoryScores = diagnostic.category_scores as Record<string, { score: number; insight: string }>;

  // Map categories with their icons
  const categoryIconMap: Record<string, string> = {
    reserva_emergencia: 'Shield',
    gestao_gastos: 'Wallet',
    protecao_patrimonial: 'Lock',
    investimentos: 'TrendingUp',
    milhas_beneficios: 'Plane',
    planejamento_aposentadoria: 'Clock',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Diagnóstico Financeiro
          </h2>
          <p className="text-sm text-muted-foreground">
            Análise inicial baseada nos dados coletados
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateDiagnostic({ contactId })}
          disabled={isGenerating}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          Regenerar
        </Button>
      </div>

      {/* Overall score card */}
      <div className="flex justify-center">
        <div className="w-full max-w-xs">
          <DiagnosticCategoryCard
            title="Nota Geral"
            score={Number(diagnostic.overall_score)}
            insight="Avaliação ponderada considerando todas as categorias analisadas."
            icon="Target"
            isOverall
          />
        </div>
      </div>

      {/* Category cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((category) => {
          const catScore = categoryScores[category.key];
          if (!catScore) return null;

          return (
            <DiagnosticCategoryCard
              key={category.id}
              title={category.name}
              score={catScore.score}
              insight={catScore.insight}
              icon={categoryIconMap[category.key] || category.icon || 'Activity'}
            />
          );
        })}
      </div>

      {/* Action button */}
      {onComplete && (
        <div className="flex justify-center pt-4">
          <Button onClick={onComplete}>
            Continuar para Apresentação
          </Button>
        </div>
      )}
    </div>
  );
}
