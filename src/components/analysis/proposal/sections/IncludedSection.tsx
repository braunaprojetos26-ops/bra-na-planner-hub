import { Check, X } from 'lucide-react';

interface IncludedSectionProps {
  meetings: number;
}

const INCLUDED_ITEMS = [
  { item: 'Diagnóstico financeiro completo', included: true },
  { item: 'Análise de perfil de investidor', included: true },
  { item: 'Plano de investimentos personalizado', included: true },
  { item: 'Planejamento de aposentadoria', included: true },
  { item: 'Análise de proteção patrimonial', included: true },
  { item: 'Suporte via WhatsApp', included: true },
  { item: 'Acesso ao portal do cliente', included: true },
  { item: 'Relatórios trimestrais', included: true },
];

export function IncludedSection({ meetings }: IncludedSectionProps) {
  return (
    <section className="space-y-8">
      {/* Section Title */}
      <div className="text-center space-y-2">
        <p className="text-amber-600 text-sm tracking-[0.2em] uppercase font-medium">
          Tudo incluído
        </p>
        <h2 className="text-3xl font-light text-foreground">
          O que está Incluso
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto" />
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-4 font-medium text-foreground">Benefício</th>
              <th className="text-center p-4 font-medium text-foreground w-24">Incluso</th>
            </tr>
          </thead>
          <tbody>
            {INCLUDED_ITEMS.map((row, index) => (
              <tr key={index} className="border-t">
                <td className="p-4 text-muted-foreground">{row.item}</td>
                <td className="p-4 text-center">
                  {row.included ? (
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-red-500 mx-auto" />
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-t bg-amber-500/5">
              <td className="p-4 font-medium text-foreground">Reuniões de acompanhamento</td>
              <td className="p-4 text-center font-bold text-amber-600">{meetings}x</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
