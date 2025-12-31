import { CreditCard, Banknote, QrCode } from 'lucide-react';
import { formatCurrency } from '@/lib/proposalPricing';

interface PricingSectionProps {
  finalValue: number;
  installments: number;
  installmentValue: number;
  discountApplied: boolean;
}

export function PricingSection({
  finalValue,
  installments,
  installmentValue,
  discountApplied,
}: PricingSectionProps) {
  return (
    <section className="space-y-8">
      {/* Section Title */}
      <div className="text-center space-y-2">
        <p className="text-gold text-sm tracking-[0.2em] uppercase font-medium">
          Investimento
        </p>
        <h2 className="text-3xl font-light text-foreground">
          Valores
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
      </div>

      {/* Pricing Card */}
      <div className="max-w-lg mx-auto">
        <div className="bg-gradient-to-br from-gold to-gold-500 rounded-2xl p-1">
          <div className="bg-card rounded-xl p-8 text-center space-y-6">
            {/* Main Price */}
            <div className="space-y-2">
              <p className="text-muted-foreground">Seu investimento</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-2xl text-muted-foreground">{installments}x de</span>
                <span className="text-5xl font-bold text-foreground">
                  {formatCurrency(installmentValue)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                ou {formatCurrency(finalValue)} à vista
              </p>
            </div>

            {/* Discount Badge */}
            {discountApplied && (
              <div className="inline-block bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2">
                <p className="text-sm font-medium text-green-600">
                  10% de desconto aplicado!
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="border-t" />

            {/* Payment Methods */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Formas de Pagamento</p>
              <div className="flex justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">Cartão</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">PIX</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">Boleto</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <p className="text-center text-sm text-muted-foreground max-w-md mx-auto">
        Após a aceitação da proposta, você receberá um contrato digital para assinatura e enviaremos as pendências para montagem do seu planejamento.
      </p>
    </section>
  );
}
