import { TrendingUp } from 'lucide-react';
import type { PlannerCase } from '@/hooks/usePlannerCases';
import { formatCurrency } from '@/lib/proposalPricing';

interface CasesSectionProps {
  cases: PlannerCase[];
}

export function CasesSection({ cases }: CasesSectionProps) {
  if (!cases || cases.length === 0) return null;

  return (
    <section className="space-y-8">
      {/* Section Title */}
      <div className="text-center space-y-2">
        <p className="text-gold text-sm tracking-[0.2em] uppercase font-medium">
          Resultados Reais
        </p>
        <h2 className="text-3xl font-light text-foreground">
          Cases de Sucesso
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cases.slice(0, 6).map((caseItem) => (
          <div
            key={caseItem.id}
            className="bg-card border rounded-xl p-6 space-y-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-500 flex items-center justify-center text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground">{caseItem.title}</h3>
            </div>

            {caseItem.description && (
              <p className="text-sm text-muted-foreground">{caseItem.description}</p>
            )}

            {(caseItem.initial_value || caseItem.final_value) && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                {caseItem.initial_value && (
                  <div>
                    <p className="text-xs text-muted-foreground">Situação Inicial</p>
                    <p className="font-medium text-foreground">
                      {formatCurrency(caseItem.initial_value)}
                    </p>
                  </div>
                )}
                {caseItem.final_value && (
                  <div>
                    <p className="text-xs text-muted-foreground">Com Braúna</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(caseItem.final_value)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {caseItem.advantage && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600">Vantagem</p>
                <p className="font-bold text-green-600">
                  +{formatCurrency(caseItem.advantage)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
