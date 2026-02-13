import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, TrendingUp, AlertTriangle, Pencil, Check, X, Layers } from "lucide-react";
import { ContributionStep } from "@/types/dreams";

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
  aporteIdealMensal: number;
  capitalNecessario: number;
  patrimonioFinalAposentadoria: number;
  idadePatrimonioAcaba: number | null;
  idadeFinalIdeal: number;
  onSalvar: () => void;
  contributionSteps: ContributionStep[];
  onOpenStepsModal: () => void;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

interface EditableValueProps {
  value: number;
  onChange: (value: number) => void;
  formatFn: (value: number) => string;
  suffix?: string;
  min?: number;
  max?: number;
  isCurrency?: boolean;
}

function EditableValue({ value, onChange, formatFn, suffix = "", min = 0, max = Infinity, isCurrency = false }: EditableValueProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState("");

  const handleEdit = () => {
    setTempValue(String(value));
    setIsEditing(true);
  };

  const handleConfirm = () => {
    const parsed = parseFloat(tempValue.replace(/\D/g, "")) || 0;
    const clamped = Math.max(min, Math.min(max, parsed));
    onChange(clamped);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-6 w-24 text-right text-sm px-2"
          autoFocus
        />
        <button onClick={handleConfirm} className="p-0.5 text-emerald-500 hover:text-emerald-600">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleCancel} className="p-0.5 text-destructive hover:text-destructive/80">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-semibold text-primary">
        {formatFn(value)}{suffix}
      </span>
      <button onClick={handleEdit} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

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
  aporteIdealMensal,
  capitalNecessario,
  patrimonioFinalAposentadoria,
  idadePatrimonioAcaba,
  idadeFinalIdeal,
  onSalvar,
  contributionSteps,
  onOpenStepsModal,
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
                    Para a aposentadoria ideal, você precisa investir{" "}
                    <span className="font-semibold text-orange-600">{formatCurrency(aporteIdealMensal)}/mês</span>{" "}
                    para acumular{" "}
                    <span className="font-semibold">{formatCurrency(capitalNecessario)}</span>{" "}
                    aos {idadeAposentadoria} anos.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No cenário ideal, o patrimônio durará até os {idadeFinalIdeal} anos.
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
            <EditableValue
              value={idadeAposentadoria}
              onChange={onIdadeAposentadoriaChange}
              formatFn={(v) => String(v)}
              suffix=" anos"
              min={18}
              max={90}
            />
          </div>
          <Slider
            value={[idadeAposentadoria]}
            onValueChange={(v) => onIdadeAposentadoriaChange(v[0])}
            min={18}
            max={90}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>18 anos</span>
            <span>90 anos</span>
          </div>
        </div>

        {/* Renda desejada */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Renda desejada (mensal)</Label>
            <EditableValue
              value={rendaDesejada}
              onChange={onRendaDesejadaChange}
              formatFn={formatCurrency}
              min={0}
              max={100000}
              isCurrency
            />
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
            <EditableValue
              value={outrasFontesRenda}
              onChange={onOutrasFontesRendaChange}
              formatFn={formatCurrency}
              min={0}
              max={50000}
              isCurrency
            />
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
            <div className="flex items-center gap-1.5">
              <Label className="text-sm font-medium">Investimento mensal</Label>
              <button
                onClick={onOpenStepsModal}
                className="p-0.5 text-muted-foreground hover:text-primary transition-colors"
                title="Aportes escalonados"
              >
                <Layers className="h-3.5 w-3.5" />
              </button>
            </div>
            {contributionSteps.length > 0 ? (
              <Badge variant="secondary" className="text-xs cursor-pointer" onClick={onOpenStepsModal}>
                Escalonado ({contributionSteps.length} faixas)
              </Badge>
            ) : (
              <EditableValue
                value={investimentoMensal}
                onChange={onInvestimentoMensalChange}
                formatFn={formatCurrency}
                min={0}
                max={100000}
                isCurrency
              />
            )}
          </div>
          {contributionSteps.length === 0 && (
            <>
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
            </>
          )}
          {contributionSteps.length > 0 && (
            <div className="space-y-1 text-xs text-muted-foreground">
              {contributionSteps.map((step, idx) => (
                <div key={step.id} className="flex justify-between">
                  <span>{step.durationYears} {step.durationYears === 1 ? "ano" : "anos"}</span>
                  <span>{formatCurrency(step.monthlyAmount)}/mês</span>
                </div>
              ))}
            </div>
          )}
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
