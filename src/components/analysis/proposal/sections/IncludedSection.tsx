import { Check, X } from 'lucide-react';

interface IncludedSectionProps {
  meetings: number;
}

const INCLUDED_ITEMS = [
  { item: 'Diagnóstico Financeiro Completo', included: true },
  { item: 'Acompanhamento de especialistas financeiros', included: true },
  { item: 'Tenha as áreas da Braúna a sua disposição', included: true },
  { item: 'Suporte técnico sobre produtos financeiros e cotações', included: true },
  { item: 'Ajuste e inclusão de novos objetivos', included: true },
  { item: 'Suporte via WhatsApp', included: true },
  { item: 'Suporte via ligação', included: true },
];

export function IncludedSection({ meetings }: IncludedSectionProps) {
  return (
    <section className="space-y-8 print:space-y-2">
      {/* Section Title */}
      <div className="text-center space-y-2 print:space-y-1">
        <p className="text-gold text-sm print:text-[8pt] tracking-[0.2em] uppercase font-medium">
          Tudo incluído
        </p>
        <h2 className="text-3xl print:text-[12pt] font-light text-foreground">
          O que está Incluso
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl print:rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-4 print:p-1.5 print:text-[8pt] font-medium text-foreground">Benefício</th>
              <th className="text-center p-4 print:p-1.5 print:text-[8pt] font-medium text-foreground w-24 print:w-16">Incluso</th>
            </tr>
          </thead>
          <tbody>
            {INCLUDED_ITEMS.map((row, index) => (
              <tr key={index} className="border-t">
                <td className="p-4 print:p-1.5 print:text-[7pt] text-muted-foreground">{row.item}</td>
                <td className="p-4 print:p-1.5 text-center">
                  {row.included ? (
                    <Check className="w-5 h-5 print:w-3 print:h-3 text-green-500 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 print:w-3 print:h-3 text-red-500 mx-auto" />
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-t bg-gold/5">
              <td className="p-4 print:p-1.5 print:text-[7pt] font-medium text-foreground">Reuniões de acompanhamento</td>
              <td className="p-4 print:p-1.5 print:text-[8pt] text-center font-bold text-gold">{meetings}x</td>
            </tr>
            <tr className="border-t bg-gold/5">
              <td className="p-4 print:p-1.5 print:text-[7pt] font-medium text-foreground">Reunião de fechamento anual</td>
              <td className="p-4 print:p-1.5 print:text-[8pt] text-center font-bold text-gold">1x</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
