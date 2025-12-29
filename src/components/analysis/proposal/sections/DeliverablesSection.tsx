import { CheckCircle, FileText, TrendingUp, Users } from 'lucide-react';

const DELIVERABLES = [
  {
    phase: 'Fase 1',
    title: 'Análise Macro',
    icon: <FileText className="w-6 h-6" />,
    items: [
      'Diagnóstico completo da situação financeira',
      'Identificação de gaps e oportunidades',
      'Definição de prioridades estratégicas',
    ],
  },
  {
    phase: 'Fase 2',
    title: 'Implementação',
    icon: <TrendingUp className="w-6 h-6" />,
    items: [
      'Plano de ação detalhado',
      'Reorganização de investimentos',
      'Estruturação de proteção patrimonial',
      'Otimização tributária',
    ],
  },
  {
    phase: 'Fase 3',
    title: 'Acompanhamento',
    icon: <Users className="w-6 h-6" />,
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
    <section className="space-y-8">
      {/* Section Title */}
      <div className="text-center space-y-2">
        <p className="text-amber-600 text-sm tracking-[0.2em] uppercase font-medium">
          O que você vai receber
        </p>
        <h2 className="text-3xl font-light text-foreground">
          Entregáveis do Planejamento
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto" />
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500 via-amber-400 to-amber-500 hidden md:block" />

        <div className="space-y-8">
          {DELIVERABLES.map((deliverable, index) => (
            <div 
              key={index} 
              className={`flex flex-col md:flex-row gap-6 items-center ${
                index % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Content Card */}
              <div className="flex-1 bg-card border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white">
                    {deliverable.icon}
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium">{deliverable.phase}</p>
                    <h3 className="text-lg font-semibold text-foreground">{deliverable.title}</h3>
                  </div>
                </div>
                <ul className="space-y-2">
                  {deliverable.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Center Dot */}
              <div className="hidden md:flex w-4 h-4 rounded-full bg-amber-500 border-4 border-background shadow-lg flex-shrink-0 z-10" />

              {/* Spacer */}
              <div className="flex-1 hidden md:block" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
