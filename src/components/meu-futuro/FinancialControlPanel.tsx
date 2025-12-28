import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Save, TrendingUp, AlertTriangle } from "lucide-react";

interface FinancialControlPanelProps {
  idadeAposentadoria: number;
  rendaDesejada: number;
  outrasFontesRenda: number;
  investimentoMensal: number;
  onIdadeAposentadoriaChange: (value: number) => void;
  onRendaDesejadaChange: (value: number) => void;
  onOutrasFontesRendaChange: (value: number) => void;
  onInvestimentoMensalChange: (value: number) => void;
  aporteNecessario: number;
  capitalNecessario: number;
  patrimonioFinalAposentadoria: number;
  idadePatrimonioAcaba: number | null;
  onSalvar: () => void;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export function FinancialControlPanel({
  idadeAposentadoria,
  rendaDesejada,
  outrasFontesRenda,
  investimentoMensal,
  onIdadeAposentadoriaChange,
  onRendaDesejadaChange,
  onOutrasFontesRendaChange,
  onInvestimentoMensalChange,
  aporteNecessario,
  capitalNecessario,
  patrimonioFinalAposentadoria,
  idadePatrimonioAcaba,
  onSalvar,
}: FinancialControlPanelProps) {
  const atingiuMeta = patrimonioFinalAposentadoria >= capitalNecessario;
  const temRendaDesejada = rendaDesejada > 0;

  return (
    <div className="space-y-4">
      {/* Card resumo */}
      <Card className={atingiuMeta && temRendaDesejada ? "border-emerald-500/50 bg-emerald-500/5" : "border-orange-500/50 bg-orange-500/5"}>
        <CardContent className="pt-4">
          {temRendaDesejada ? (
            atingiuMeta ? (
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-sm text-foreground">
                    Parabéns! Com as configurações atuais, você atingirá sua meta de aposentadoria com{" "}
                    <span className="font-semibold">{formatCurrency(patrimonioFinalAposentadoria)}</span>.
                  </p>
                  {idadePatrimonioAcaba && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Seu patrimônio durará até os {idadePatrimonioAcaba} anos.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm text-foreground">
                    Você precisa investir{" "}
                    <span className="font-semibold text-orange-600">{formatCurrency(aporteNecessario)}/mês</span>{" "}
                    para chegar na aposentadoria ideal com{" "}
                    <span className="font-semibold">{formatCurrency(capitalNecessario)}</span> acumulados.
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Defina uma renda desejada para calcular sua meta de aposentadoria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sliders */}
      <div className="space-y-6">
        {/* Idade aposentadoria */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Idade de aposentadoria</Label>
            <span className="text-sm font-semibold text-primary">{idadeAposentadoria} anos</span>
          </div>
          <Slider
            value={[idadeAposentadoria]}
            onValueChange={(v) => onIdadeAposentadoriaChange(v[0])}
            min={50}
            max={80}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50 anos</span>
            <span>80 anos</span>
          </div>
        </div>

        {/* Renda desejada */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Renda desejada (mensal)</Label>
            <span className="text-sm font-semibold text-primary">{formatCurrency(rendaDesejada)}</span>
          </div>
          <Slider
            value={[rendaDesejada]}
            onValueChange={(v) => onRendaDesejadaChange(v[0])}
            min={0}
            max={100000}
            step={500}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>R$ 0</span>
            <span>R$ 100.000</span>
          </div>
        </div>

        {/* Outras fontes de renda */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Outras fontes de renda</Label>
            <span className="text-sm font-semibold text-primary">{formatCurrency(outrasFontesRenda)}</span>
          </div>
          <Slider
            value={[outrasFontesRenda]}
            onValueChange={(v) => onOutrasFontesRendaChange(v[0])}
            min={0}
            max={50000}
            step={500}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>R$ 0</span>
            <span>R$ 50.000</span>
          </div>
        </div>

        {/* Investimento mensal */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Investimento mensal</Label>
            <span className="text-sm font-semibold text-primary">{formatCurrency(investimentoMensal)}</span>
          </div>
          <Slider
            value={[investimentoMensal]}
            onValueChange={(v) => onInvestimentoMensalChange(v[0])}
            min={0}
            max={100000}
            step={500}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>R$ 0</span>
            <span>R$ 100.000</span>
          </div>
        </div>
      </div>

      {/* Botão salvar */}
      <Button onClick={onSalvar} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        Salvar meta
      </Button>
    </div>
  );
}
