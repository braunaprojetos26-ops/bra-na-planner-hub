import { CheckCircle, FileText, TrendingUp, Users } from 'lucide-react';

const DELIVERABLES = [
  {
    phase: 'Fase 1',
    title: 'Análise Macro',
    icon: <FileText className="w-6 h-6 print:w-4 print:h-4" />,
    items: [
      'Diagnóstico completo da situação financeira',
      'Identificação de gaps e oportunidades',
      'Definição de prioridades estratégicas',
      'Alinhamento do método para alcançar objetivos',
    ],
  },
  {
    phase: 'Fase 2',
    title: 'Implementação',
    icon: <TrendingUp className="w-6 h-6 print:w-4 print:h-4" />,
    items: [
      'Implementação do Plano de ação definido',
      'Definição de metas e marcos intermediários',
      'Organização financeira completa',
      'Estruturação de proteção patrimonial',
      'Alinhamento de investimentos aos objetivos',
    ],
  },
  {
    phase: 'Fase 3',
    title: 'Acompanhamento',
    icon: <Users className="w-6 h-6 print:w-4 print:h-4" />,
    items: [
      'Reuniões periódicas de monitoramento',
      'Ajustes conforme mudanças de vida',
      'Rebalanceamento de carteira',
      'Suporte contínuo',
    ],
  },
];

export function DeliverablesSection() {
  return (
    <section className="space-y-8 print:space-y-3">
      {/* Section Title */}
      <div className="text-center space-y-2 print:space-y-1">
        <p className="text-gold text-sm print:text-[8pt] tracking-[0.2em] uppercase font-medium">
          O que você vai receber
        </p>
        <h2 className="text-3xl print:text-[12pt] font-light text-foreground">
          Entregáveis do Planejamento
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-gold via-gold-400 to-gold hidden md:block print:hidden" />

        <div className="space-y-8 print:space-y-2">
          {DELIVERABLES.map((deliverable, index) => (
            <div 
              key={index} 
              className={`flex flex-col md:flex-row print:flex-row gap-6 print:gap-2 items-center ${
                index % 2 === 1 ? 'md:flex-row-reverse print:flex-row-reverse' : ''
              }`}
            >
              {/* Content Card */}
              <div className="flex-1 bg-card border rounded-xl p-6 print:p-2 print:rounded-lg shadow-sm">
                <div className="flex items-center gap-3 print:gap-2 mb-4 print:mb-1">
                  <div className="w-12 h-12 print:w-6 print:h-6 rounded-full bg-gradient-to-br from-gold to-gold-500 flex items-center justify-center text-white">
                    {deliverable.icon}
                  </div>
                  <div>
                    <p className="text-xs print:text-[7pt] text-gold font-medium">{deliverable.phase}</p>
                    <h3 className="text-lg print:text-[9pt] font-semibold text-foreground">{deliverable.title}</h3>
                  </div>
                </div>
                <ul className="space-y-2 print:space-y-0">
                  {deliverable.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 print:gap-1 text-sm print:text-[7pt] text-muted-foreground print:leading-tight">
                      <CheckCircle className="w-4 h-4 print:w-2.5 print:h-2.5 text-green-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Center Dot */}
              <div className="hidden md:flex print:hidden w-4 h-4 rounded-full bg-gold border-4 border-background shadow-lg flex-shrink-0 z-10" />

              {/* Spacer */}
              <div className="flex-1 hidden md:block print:hidden" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
