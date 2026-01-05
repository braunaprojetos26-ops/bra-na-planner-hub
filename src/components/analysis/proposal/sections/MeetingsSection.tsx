import { Calendar, CheckCircle2 } from 'lucide-react';

interface MeetingsSectionProps {
  meetings: number;
}

const MANDATORY_MEETINGS = [
  'Planejamento Macro',
  'Gestão Financeira e Fluxo de Caixa',
  'Planejamento Patrimonial e Gestão de Riscos',
  'Investimentos alinhados aos objetivos',
  'Milhas e cartões de crédito',
  'Planejamento de Independência Financeira',
];

function generateMeetingTopics(totalMeetings: number): string[] {
  // Para contratos com até 6 reuniões, usar apenas as mandatórias necessárias
  if (totalMeetings <= 6) {
    return MANDATORY_MEETINGS.slice(0, totalMeetings);
  }
  
  // Para 9 ou 12 reuniões, usar as 6 mandatórias + extras flexíveis
  const topics = [...MANDATORY_MEETINGS];
  const extraMeetings = totalMeetings - 6;
  
  for (let i = 0; i < extraMeetings; i++) {
    topics.push('A definir conforme andamento do planejamento');
  }
  
  return topics;
}

export function MeetingsSection({ meetings }: MeetingsSectionProps) {
  const topics = generateMeetingTopics(meetings);

  return (
    <section className="space-y-8 print:space-y-2">
      {/* Section Title */}
      <div className="text-center space-y-2 print:space-y-1">
        <p className="text-gold text-sm print:text-[8pt] tracking-[0.2em] uppercase font-medium">
          Sua Jornada
        </p>
        <h2 className="text-3xl print:text-[12pt] font-light text-foreground">
          Pauta das Reuniões
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
      </div>

      {/* Meetings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-3 gap-4 print:gap-1.5">
        {topics.map((topic, index) => (
          <div
            key={index}
            className="flex items-center gap-4 print:gap-2 p-4 print:p-1.5 bg-card border rounded-xl print:rounded-lg hover:border-gold/50 transition-colors"
          >
            <div className="w-10 h-10 print:w-5 print:h-5 rounded-full bg-gradient-to-br from-gold to-gold-500 flex items-center justify-center text-white font-bold text-sm print:text-[7pt] flex-shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground print:text-[7pt] print:leading-tight truncate">{topic}</p>
              <p className="text-xs print:text-[6pt] text-muted-foreground">Reunião {index + 1}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-muted-foreground/30 print:hidden" />
          </div>
        ))}
      </div>

      {/* Info Note */}
      <div className="flex items-center gap-3 print:gap-2 p-4 print:p-2 bg-muted/50 rounded-lg">
        <Calendar className="w-5 h-5 print:w-3 print:h-3 text-gold flex-shrink-0" />
        <p className="text-sm print:text-[7pt] text-muted-foreground">
          A ordem das reuniões pode sofrer alterações de acordo com os objetivos financeiros e com a necessidade do planejamento.
        </p>
      </div>
    </section>
  );
}
