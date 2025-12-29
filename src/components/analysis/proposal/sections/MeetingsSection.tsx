import { Calendar, CheckCircle2 } from 'lucide-react';

interface MeetingsSectionProps {
  meetings: number;
}

const MEETING_TOPICS: Record<number, string[]> = {
  4: [
    'Diagnóstico e Prioridades',
    'Fluxo de Caixa e Investimentos',
    'Proteção e Sucessão',
    'Revisão e Ajustes',
  ],
  6: [
    'Diagnóstico Completo',
    'Fluxo de Caixa',
    'Investimentos',
    'Proteção Patrimonial',
    'Planejamento de Metas',
    'Revisão Geral',
  ],
  9: [
    'Diagnóstico Inicial',
    'Análise de Fluxo de Caixa',
    'Estruturação de Investimentos',
    'Proteção Familiar',
    'Planejamento Tributário',
    'Metas de Curto Prazo',
    'Metas de Médio Prazo',
    'Sucessão Patrimonial',
    'Revisão e Planejamento Futuro',
  ],
  12: [
    'Diagnóstico Financeiro',
    'Fluxo de Caixa Mensal',
    'Reserva de Emergência',
    'Investimentos em Renda Fixa',
    'Investimentos em Renda Variável',
    'Proteção Pessoal',
    'Proteção Patrimonial',
    'Planejamento Tributário',
    'Metas de Curto Prazo',
    'Metas de Longo Prazo',
    'Aposentadoria',
    'Revisão Anual',
  ],
};

export function MeetingsSection({ meetings }: MeetingsSectionProps) {
  const topics = MEETING_TOPICS[meetings] || MEETING_TOPICS[6];

  return (
    <section className="space-y-8">
      {/* Section Title */}
      <div className="text-center space-y-2">
        <p className="text-amber-600 text-sm tracking-[0.2em] uppercase font-medium">
          Sua Jornada
        </p>
        <h2 className="text-3xl font-light text-foreground">
          Pauta das Reuniões
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto" />
      </div>

      {/* Meetings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topics.map((topic, index) => (
          <div
            key={index}
            className="flex items-center gap-4 p-4 bg-card border rounded-xl hover:border-amber-500/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{topic}</p>
              <p className="text-xs text-muted-foreground">Reunião {index + 1}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-muted-foreground/30" />
          </div>
        ))}
      </div>

      {/* Info Note */}
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
        <Calendar className="w-5 h-5 text-amber-600" />
        <p className="text-sm text-muted-foreground">
          As reuniões são agendadas conforme sua disponibilidade, com intervalos recomendados de 15 a 30 dias.
        </p>
      </div>
    </section>
  );
}
