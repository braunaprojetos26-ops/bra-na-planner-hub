import { useMemo } from "react";
import { Dream, RepetitionType, ContributionStep } from "@/types/dreams";

export interface FinancialProjectionParams {
  idadeAtual: number;
  patrimonioInicial: number;
  aporteMensal: number;
  idadeAposentadoria: number;
  rendaDesejada: number;
  outrasFontesRenda: number;
  taxaAcumuloAnual: number;
  taxaUsufruteAnual: number;
  dreams?: Dream[];
  contributionSteps?: ContributionStep[];
}

export interface ProjectionDataPoint {
  idade: number;
  mes: number;
  anoMes: string;
  patrimonioProjetado: number;
  patrimonioInvestido: number;
  aposentadoriaIdeal: number;
}

export interface FinancialProjectionResult {
  data: ProjectionDataPoint[];
  idadePatrimonioAcaba: number | null;
  aporteNecessario: number;
  aporteIdealMensal: number;
  patrimonioFinalAposentadoria: number;
  capitalNecessario: number;
  idadeFinalIdeal: number;
}

interface ExpandedDreamEvent {
  date: Date;
  value: number;
  isPositive: boolean;
  dreamId: string;
}

const IDADE_MAXIMA = 100;
const IDADE_FINAL_IDEAL = 90;

function calcularAporteNecessario(
  fv: number,
  pv: number,
  r: number,
  n: number
): number {
  if (n <= 0 || r <= 0) return 0;
  
  const fvPv = fv - pv * Math.pow(1 + r, n);
  const divisor = (Math.pow(1 + r, n) - 1) / r;
  
  return Math.max(0, fvPv / divisor);
}

function getRepetitionMonths(type: RepetitionType): number {
  switch (type) {
    case 'quarterly': return 3;
    case 'semiannual': return 6;
    case 'annual': return 12;
    case '2years': return 24;
    case '3years': return 36;
    case '4years': return 48;
    default: return 0;
  }
}

function expandDreamsToEvents(dreams: Dream[]): ExpandedDreamEvent[] {
  const events: ExpandedDreamEvent[] = [];
  
  for (const dream of dreams) {
    const baseDate = new Date(dream.realizationDate);
    const totalRepetitions = dream.repetitionType !== 'none' && dream.repetitionCount 
      ? dream.repetitionCount 
      : 1;
    const repetitionMonths = getRepetitionMonths(dream.repetitionType);
    
    for (let rep = 0; rep < totalRepetitions; rep++) {
      const repDate = new Date(baseDate);
      if (rep > 0 && repetitionMonths > 0) {
        repDate.setMonth(repDate.getMonth() + (rep * repetitionMonths));
      }
      
      if (dream.isInstallment && dream.installments && dream.installments > 1) {
        const installmentValue = dream.totalValue / dream.installments;
        for (let inst = 0; inst < dream.installments; inst++) {
          const instDate = new Date(repDate);
          instDate.setMonth(instDate.getMonth() + inst);
          events.push({
            date: instDate,
            value: installmentValue,
            isPositive: dream.isPositive,
            dreamId: dream.id,
          });
        }
      } else {
        events.push({
          date: repDate,
          value: dream.totalValue,
          isPositive: dream.isPositive,
          dreamId: dream.id,
        });
      }
    }
  }
  
  return events;
}

function getEventsForMonth(
  events: ExpandedDreamEvent[],
  targetDate: Date
): ExpandedDreamEvent[] {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  
  return events.filter((e) => {
    const eventYear = e.date.getFullYear();
    const eventMonth = e.date.getMonth();
    return eventYear === targetYear && eventMonth === targetMonth;
  });
}

export function useFinancialProjection(params: FinancialProjectionParams): FinancialProjectionResult {
  return useMemo(() => {
    const {
      idadeAtual,
      patrimonioInicial,
      aporteMensal,
      idadeAposentadoria,
      rendaDesejada,
      outrasFontesRenda,
      taxaAcumuloAnual,
      taxaUsufruteAnual,
      dreams = [],
      contributionSteps = [],
    } = params;

    // Build month-based step lookup
    const stepRanges: { startMonth: number; endMonth: number; amount: number }[] = [];
    if (contributionSteps.length > 0) {
      let cumMonths = 0;
      for (const step of contributionSteps) {
        const months = step.durationYears * 12;
        stepRanges.push({ startMonth: cumMonths, endMonth: cumMonths + months - 1, amount: step.monthlyAmount });
        cumMonths += months;
      }
    }

    function getMonthlyContribution(month: number): number {
      if (stepRanges.length === 0) return aporteMensal;
      for (const range of stepRanges) {
        if (month >= range.startMonth && month <= range.endMonth) return range.amount;
      }
      // Beyond defined steps, use last step's amount
      return stepRanges[stepRanges.length - 1].amount;
    }

    const taxaMensalAcumulo = Math.pow(1 + taxaAcumuloAnual / 100, 1 / 12) - 1;
    const taxaMensalUsufruto = Math.pow(1 + taxaUsufruteAnual / 100, 1 / 12) - 1;

    const mesesAteAposentadoria = (idadeAposentadoria - idadeAtual) * 12;
    const mesesAte100Anos = (IDADE_MAXIMA - idadeAtual) * 12;
    const mesesUsufruto = (IDADE_FINAL_IDEAL - idadeAposentadoria) * 12;

    const rendaLiquidaMensal = Math.max(0, rendaDesejada - outrasFontesRenda);

    const capitalNecessario = rendaLiquidaMensal > 0 && taxaMensalUsufruto > 0 && mesesUsufruto > 0
      ? rendaLiquidaMensal * ((1 - Math.pow(1 + taxaMensalUsufruto, -mesesUsufruto)) / taxaMensalUsufruto)
      : 0;

    const aporteIdealMensal = calcularAporteNecessario(
      capitalNecessario,
      patrimonioInicial,
      taxaMensalAcumulo,
      mesesAteAposentadoria
    );

    const aporteNecessario = aporteIdealMensal;

    // Expandir todos os sonhos em eventos mensais
    const dreamEvents = expandDreamsToEvents(dreams);

    const data: ProjectionDataPoint[] = [];
    let patrimonioProjetado = patrimonioInicial;
    let patrimonioInvestido = patrimonioInicial;
    let aposentadoriaIdealAtual = patrimonioInicial;
    let idadePatrimonioAcaba: number | null = null;

    const dataInicial = new Date();
    
    for (let mes = 0; mes <= mesesAte100Anos; mes++) {
      const idadeDecimal = idadeAtual + mes / 12;
      const idade = Math.floor(idadeDecimal);
      
      const dataAtual = new Date(dataInicial);
      dataAtual.setMonth(dataAtual.getMonth() + mes);
      const anoMes = `${dataAtual.toLocaleString('pt-BR', { month: 'short' })}/${dataAtual.getFullYear()}`;

      // Buscar eventos de sonhos para este mês
      const monthEvents = getEventsForMonth(dreamEvents, dataAtual);
      let dreamImpact = 0;
      for (const evt of monthEvents) {
        if (evt.isPositive) {
          dreamImpact += evt.value;
        } else {
          dreamImpact -= evt.value;
        }
      }

      if (mes <= mesesAteAposentadoria) {
        // FASE DE ACÚMULO
        if (mes > 0) {
          const aporteDoMes = getMonthlyContribution(mes);
          patrimonioProjetado = patrimonioProjetado * (1 + taxaMensalAcumulo) + aporteDoMes;
          patrimonioInvestido += aporteDoMes;
          
          aposentadoriaIdealAtual = aposentadoriaIdealAtual * (1 + taxaMensalAcumulo) + aporteIdealMensal;
        }
        
        // Aplicar impacto dos sonhos (positivo = aporte extra, negativo = retirada)
        patrimonioProjetado += dreamImpact;
        if (dreamImpact > 0) {
          patrimonioInvestido += dreamImpact;
        }
      } else {
        // FASE DE USUFRUTO
        const rendaLiquida = Math.max(0, rendaDesejada - outrasFontesRenda);
        
        patrimonioProjetado = patrimonioProjetado * (1 + taxaMensalUsufruto) - rendaLiquida;
        
        // Aplicar impacto dos sonhos durante usufruto
        patrimonioProjetado += dreamImpact;
        
        if (rendaLiquida > 0) {
          patrimonioInvestido = Math.max(0, patrimonioInvestido - rendaLiquida);
        }

        if (patrimonioProjetado <= 0 && idadePatrimonioAcaba === null) {
          idadePatrimonioAcaba = idade;
        }

        if (idade <= IDADE_FINAL_IDEAL) {
          aposentadoriaIdealAtual = aposentadoriaIdealAtual * (1 + taxaMensalUsufruto) - rendaLiquida;
          aposentadoriaIdealAtual = Math.max(0, aposentadoriaIdealAtual);
        } else {
          aposentadoriaIdealAtual = 0;
        }
      }

      data.push({
        idade,
        mes,
        anoMes,
        patrimonioProjetado: Math.max(0, patrimonioProjetado),
        patrimonioInvestido: Math.max(0, patrimonioInvestido),
        aposentadoriaIdeal: aposentadoriaIdealAtual,
      });
    }

    const patrimonioFinalAposentadoria = data.find(d => d.idade === idadeAposentadoria)?.patrimonioProjetado || 0;

    return {
      data,
      idadePatrimonioAcaba,
      aporteNecessario,
      aporteIdealMensal,
      patrimonioFinalAposentadoria,
      capitalNecessario,
      idadeFinalIdeal: IDADE_FINAL_IDEAL,
    };
  }, [params]);
}
