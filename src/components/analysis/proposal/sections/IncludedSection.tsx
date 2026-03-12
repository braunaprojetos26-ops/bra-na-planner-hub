import { Check, FileText, Users, MessageCircle } from 'lucide-react';

interface IncludedSectionProps {
  meetings: number;
}

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

      {/* Cards Grid - Highlighting unique differentiators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
        {/* Reuniões de Acompanhamento */}
        <div className="flex items-start gap-3 p-4 print:p-2 bg-card border rounded-xl print:rounded-lg">
          <div className="w-10 h-10 print:w-6 print:h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 print:w-3 print:h-3 text-gold" />
          </div>
          <div>
            <h3 className="font-medium text-foreground print:text-[8pt]">
              Reuniões de Acompanhamento
            </h3>
            <p className="text-2xl print:text-[10pt] font-bold text-gold mt-1">
              {Math.max(0, meetings - 1)}x
            </p>
          </div>
        </div>

        {/* Reunião de Fechamento Anual */}
        <div className="flex items-start gap-3 p-4 print:p-2 bg-card border rounded-xl print:rounded-lg">
          <div className="w-10 h-10 print:w-6 print:h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 print:w-3 print:h-3 text-gold" />
          </div>
          <div>
            <h3 className="font-medium text-foreground print:text-[8pt]">
              Reunião de Fechamento Anual
            </h3>
            <p className="text-2xl print:text-[10pt] font-bold text-gold mt-1">
              1x
            </p>
          </div>
        </div>

        {/* Material de Apoio */}
        <div className="flex items-start gap-3 p-4 print:p-2 bg-card border rounded-xl print:rounded-lg">
          <div className="w-10 h-10 print:w-6 print:h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 print:w-3 print:h-3 text-gold" />
          </div>
          <div>
            <h3 className="font-medium text-foreground print:text-[8pt]">
              Material de Apoio
            </h3>
            <p className="text-sm print:text-[7pt] text-muted-foreground mt-1">
              Planilhas, templates e recursos exclusivos
            </p>
          </div>
        </div>

        {/* Suporte via WhatsApp */}
        <div className="flex items-start gap-3 p-4 print:p-2 bg-card border rounded-xl print:rounded-lg">
          <div className="w-10 h-10 print:w-6 print:h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 print:w-3 print:h-3 text-gold" />
          </div>
          <div>
            <h3 className="font-medium text-foreground print:text-[8pt]">
              Suporte via WhatsApp
            </h3>
            <p className="text-sm print:text-[7pt] text-muted-foreground mt-1">
              Durante todo o período de acompanhamento
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
