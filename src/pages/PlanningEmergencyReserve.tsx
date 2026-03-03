import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, TrendingUp, Wallet, Target, Calendar, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Progress } from '@/components/ui/progress';
import { useContactDataCollection, getValueByPath } from '@/hooks/useContactDataCollection';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PlanningEmergencyReserve() {
  const { clientId } = useParams();
  const { data: dataCollection } = useContactDataCollection(clientId);

  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  const [targetMonths, setTargetMonths] = useState<number>(6);
  const [currentReserve, setCurrentReserve] = useState<number>(0);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0);
  const [annualRate, setAnnualRate] = useState<number>(100); // % do CDI

  // Pull data from collection
  useEffect(() => {
    if (dataCollection?.data_collection) {
      const expenses = getValueByPath(dataCollection.data_collection, 'financeiro.despesas_mensais');
      if (typeof expenses === 'number') setMonthlyExpenses(expenses);

      const reserve = getValueByPath(dataCollection.data_collection, 'financeiro.reserva_emergencia');
      if (typeof reserve === 'number') setCurrentReserve(reserve);
    }
  }, [dataCollection]);

  const targetValue = monthlyExpenses * targetMonths;
  const remaining = Math.max(0, targetValue - currentReserve);
  const progressPct = targetValue > 0 ? Math.min(100, (currentReserve / targetValue) * 100) : 0;

  // Estimate months to reach target with monthly contributions
  const monthsToTarget = useMemo(() => {
    if (remaining <= 0) return 0;
    if (monthlyContribution <= 0) return Infinity;

    const monthlyRate = Math.pow(1 + (annualRate / 100 * 0.1175), 1 / 12) - 1; // ~Selic * %CDI
    let accumulated = currentReserve;
    let months = 0;

    while (accumulated < targetValue && months < 600) {
      accumulated = accumulated * (1 + monthlyRate) + monthlyContribution;
      months++;
    }

    return months;
  }, [remaining, monthlyContribution, annualRate, currentReserve, targetValue]);

  const formatMonths = (m: number) => {
    if (m === 0) return 'Meta atingida! ✅';
    if (m === Infinity) return 'Defina um aporte mensal';
    const years = Math.floor(m / 12);
    const remainingMonths = m % 12;
    if (years === 0) return `${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
    if (remainingMonths === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    return `${years}a ${remainingMonths}m`;
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Reserva de Emergência
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Planeje a construção da reserva de emergência do cliente.
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Despesas Mensais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CurrencyInput value={monthlyExpenses} onChange={(v) => setMonthlyExpenses(v ?? 0)} />
            <p className="text-xs text-muted-foreground mt-2">Custo de vida mensal do cliente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Meses de Cobertura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-foreground">{targetMonths}</span>
                <span className="text-sm text-muted-foreground">meses</span>
              </div>
              <Slider
                value={[targetMonths]}
                onValueChange={([v]) => setTargetMonths(v)}
                min={3}
                max={12}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>3 meses</span>
                <span>6 meses</span>
                <span>12 meses</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Reserva Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CurrencyInput value={currentReserve} onChange={(v) => setCurrentReserve(v ?? 0)} />
            <p className="text-xs text-muted-foreground mt-2">Quanto o cliente já tem guardado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Aporte Mensal Sugerido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CurrencyInput value={monthlyContribution} onChange={(v) => setMonthlyContribution(v ?? 0)} />
            <p className="text-xs text-muted-foreground mt-2">Valor mensal para construir a reserva</p>
          </CardContent>
        </Card>
      </div>

      {/* Target Card */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Meta da Reserva</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(targetValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {targetMonths} meses × {formatCurrency(monthlyExpenses)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Já acumulado</p>
                <p className="text-2xl font-semibold text-foreground">{formatCurrency(currentReserve)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Faltam {formatCurrency(remaining)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium text-foreground">{progressPct.toFixed(1)}%</span>
              </div>
              <Progress value={progressPct} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tempo estimado para atingir a meta</p>
              <p className="text-2xl font-bold text-foreground">{formatMonths(monthsToTarget)}</p>
              {monthlyContribution > 0 && monthsToTarget !== Infinity && monthsToTarget > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Com aporte de {formatCurrency(monthlyContribution)}/mês a ~{annualRate}% CDI
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Recomendação</p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {targetMonths <= 3
                ? 'Para quem é CLT ou tem estabilidade de renda, 3 meses podem ser suficientes.'
                : targetMonths <= 6
                  ? 'Para a maioria dos perfis, 6 meses é uma reserva adequada e equilibrada.'
                  : 'Reservas acima de 6 meses são recomendadas para autônomos, empresários ou perfis com renda variável.'}
              {' '}A reserva deve estar em investimentos de alta liquidez (Tesouro Selic, CDBs de liquidez diária).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
