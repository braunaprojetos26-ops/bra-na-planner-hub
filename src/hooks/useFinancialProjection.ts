import { useMemo } from "react";

export interface FinancialProjectionParams {
  idadeAtual: number;
  patrimonioInicial: number;
  aporteMensal: number;
  idadeAposentadoria: number;
  rendaDesejada: number;
  outrasFontesRenda: number;
  taxaAcumuloAnual: number; // % a.a. real
  taxaUsufruteAnual: number; // % a.a. real
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
  patrimonioFinalAposentadoria: number;
  capitalNecessario: number;
}

const IDADE_MAXIMA = 100;

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
    } = params;

    // Converter taxas anuais para mensais
    const taxaMensalAcumulo = Math.pow(1 + taxaAcumuloAnual / 100, 1 / 12) - 1;
    const taxaMensalUsufruto = Math.pow(1 + taxaUsufruteAnual / 100, 1 / 12) - 1;

    // Capital necessário para aposentadoria ideal (regra baseada na taxa de usufruto)
    const capitalNecessario = rendaDesejada > 0 
      ? (rendaDesejada * 12) / (taxaUsufruteAnual / 100)
      : 0;

    const data: ProjectionDataPoint[] = [];
    let patrimonioProjetado = patrimonioInicial;
    let patrimonioInvestido = patrimonioInicial;
    let idadePatrimonioAcaba: number | null = null;

    const mesesAteAposentadoria = (idadeAposentadoria - idadeAtual) * 12;
    const mesesAte100Anos = (IDADE_MAXIMA - idadeAtual) * 12;

    // Data inicial
    const dataInicial = new Date();
    
    // FASE DE ACÚMULO (idade atual → idade aposentadoria)
    for (let mes = 0; mes <= mesesAte100Anos; mes++) {
      const idadeDecimal = idadeAtual + mes / 12;
      const idade = Math.floor(idadeDecimal);
      
      const dataAtual = new Date(dataInicial);
      dataAtual.setMonth(dataAtual.getMonth() + mes);
      const anoMes = `${dataAtual.toLocaleString('pt-BR', { month: 'short' })}/${dataAtual.getFullYear()}`;

      if (mes <= mesesAteAposentadoria) {
        // Fase de acúmulo
        if (mes > 0) {
          patrimonioProjetado = patrimonioProjetado * (1 + taxaMensalAcumulo) + aporteMensal;
          patrimonioInvestido += aporteMensal;
        }
      } else {
        // Fase de usufruto
        const rendaLiquida = Math.max(0, rendaDesejada - outrasFontesRenda);
        patrimonioProjetado = patrimonioProjetado * (1 + taxaMensalUsufruto) - rendaLiquida;
        
        if (rendaLiquida > 0) {
          patrimonioInvestido = Math.max(0, patrimonioInvestido - rendaLiquida);
        }

        if (patrimonioProjetado <= 0 && idadePatrimonioAcaba === null) {
          idadePatrimonioAcaba = idade;
        }
      }

      data.push({
        idade,
        mes,
        anoMes,
        patrimonioProjetado: Math.max(0, patrimonioProjetado),
        patrimonioInvestido: Math.max(0, patrimonioInvestido),
        aposentadoriaIdeal: capitalNecessario,
      });
    }

    // Calcular aporte necessário para atingir aposentadoria ideal
    // Fórmula: PMT = (FV - PV * (1+r)^n) / (((1+r)^n - 1) / r)
    let aporteNecessario = 0;
    if (capitalNecessario > 0 && mesesAteAposentadoria > 0) {
      const fv = capitalNecessario;
      const pv = patrimonioInicial;
      const r = taxaMensalAcumulo;
      const n = mesesAteAposentadoria;
      
      const fvPv = fv - pv * Math.pow(1 + r, n);
      const divisor = (Math.pow(1 + r, n) - 1) / r;
      
      aporteNecessario = Math.max(0, fvPv / divisor);
    }

    const patrimonioFinalAposentadoria = data.find(d => d.idade === idadeAposentadoria)?.patrimonioProjetado || 0;

    return {
      data,
      idadePatrimonioAcaba,
      aporteNecessario,
      patrimonioFinalAposentadoria,
      capitalNecessario,
    };
  }, [params]);
}
