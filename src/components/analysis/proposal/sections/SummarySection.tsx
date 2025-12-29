import { CheckCircle, Star } from 'lucide-react';

interface SummarySectionProps {
  proposalType: string;
  meetings: number;
}

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  planejamento_completo: 'Planejamento Completo',
  planejamento_pontual: 'Planejamento Pontual',
};

export function SummarySection({ proposalType, meetings }: SummarySectionProps) {
  const typeLabel = PROPOSAL_TYPE_LABELS[proposalType] || proposalType;

  return (
    <section className="space-y-8">
      {/* Section Title */}
      <div className="text-center space-y-2">
        <p className="text-amber-600 text-sm tracking-[0.2em] uppercase font-medium">
          Sua Solução
        </p>
        <h2 className="text-3xl font-light text-foreground">
          Resumo da Proposta
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto" />
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left - Details */}
          <div className="space-y-6">
            <div>
              <p className="text-slate-400 text-sm mb-1">Tipo de Planejamento</p>
              <p className="text-xl font-medium text-amber-400">{typeLabel}</p>
            </div>

            <div>
              <p className="text-slate-400 text-sm mb-1">Reuniões Inclusas</p>
              <p className="text-xl font-medium">{meetings} reuniões</p>
            </div>

            <div className="space-y-2">
              <p className="text-slate-400 text-sm">Inclui:</p>
              <ul className="space-y-2">
                {[
                  'Diagnóstico financeiro completo',
                  'Plano de investimentos',
                  'Análise de proteção',
                  'Suporte contínuo',
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right - Rating */}
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-slate-300 text-sm max-w-xs">
              Mais de 500 clientes satisfeitos com nosso planejamento financeiro
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
