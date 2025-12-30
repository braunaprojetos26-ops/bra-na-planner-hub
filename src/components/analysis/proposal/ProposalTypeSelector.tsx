import { Calendar, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProposalTypeSelectorProps {
  onSelect: (type: 'completo' | 'pontual') => void;
}

export function ProposalTypeSelector({ onSelect }: ProposalTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Escolha o Tipo de Proposta</h2>
        <p className="text-muted-foreground">
          Selecione o modelo de planejamento mais adequado para este cliente
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Planejamento Completo */}
        <Card
          className={cn(
            'relative cursor-pointer transition-all duration-200 hover:border-primary hover:shadow-lg',
            'border-2 hover:scale-[1.02]'
          )}
          onClick={() => onSelect('completo')}
        >
          <Badge className="absolute -top-3 left-4 bg-primary text-primary-foreground">
            Recomendado
          </Badge>
          <CardContent className="p-6 space-y-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-7 h-7 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Planejamento Completo</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Acompanhamento contínuo com 4 a 12 reuniões ao longo do ano. 
                Ideal para clientes que buscam uma transformação financeira completa.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>4 a 12 reuniões programadas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>Acompanhamento contínuo</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>Suporte via WhatsApp</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>Parcelamento em até 12x</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planejamento Pontual */}
        <Card
          className={cn(
            'cursor-pointer transition-all duration-200 hover:border-accent hover:shadow-lg',
            'border-2 hover:scale-[1.02]'
          )}
          onClick={() => onSelect('pontual')}
        >
          <CardContent className="p-6 space-y-4">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center">
              <Target className="w-7 h-7 text-accent" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Planejamento Pontual</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Foco em até 3 tópicos específicos, sem acompanhamento contínuo. 
                Ideal para demandas objetivas e resolução rápida.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Até 3 tópicos específicos</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Até 3 reuniões no total</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                <span className="text-muted-foreground">Sem acompanhamento contínuo</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Parcelamento em até 6x</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
