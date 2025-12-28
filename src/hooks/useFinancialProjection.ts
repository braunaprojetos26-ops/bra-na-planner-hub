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
  aporteIdealMensal: number;
  patrimonioFinalAposentadoria: number;
  capitalNecessario: number;
  idadeFinalIdeal: number;
}

const IDADE_MAXIMA = 100;
const IDADE_FINAL_IDEAL = 90; // Idade onde o patrimônio ideal zera

// Função auxiliar para calcular aporte necessário
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

    const mesesAteAposentadoria = (idadeAposentadoria - idadeAtual) * 12;
    const mesesAte100Anos = (IDADE_MAXIMA - idadeAtual) * 12;
    
    // Período de usufruto dinâmico (baseado na idade de aposentadoria escolhida)
    const mesesUsufruto = (IDADE_FINAL_IDEAL - idadeAposentadoria) * 12;

    // Renda líquida mensal necessária (desejada - outras fontes)
    const rendaLiquidaMensal = Math.max(0, rendaDesejada - outrasFontesRenda);

    // Capital necessário = Valor presente de uma anuidade com duração variável
    // Fórmula: PV = PMT × [(1 - (1+r)^-n) / r]
    const capitalNecessario = rendaLiquidaMensal > 0 && taxaMensalUsufruto > 0 && mesesUsufruto > 0
      ? rendaLiquidaMensal * ((1 - Math.pow(1 + taxaMensalUsufruto, -mesesUsufruto)) / taxaMensalUsufruto)
      : 0;

    // Aporte ideal mensal para atingir o capital necessário
    const aporteIdealMensal = calcularAporteNecessario(
      capitalNecessario,
      patrimonioInicial,
      taxaMensalAcumulo,
      mesesAteAposentadoria
    );

    // Aporte necessário para atingir capital necessário (para comparação com aporte atual)
    const aporteNecessario = aporteIdealMensal;

    const data: ProjectionDataPoint[] = [];
    let patrimonioProjetado = patrimonioInicial;
    let patrimonioInvestido = patrimonioInicial;
    let aposentadoriaIdealAtual = patrimonioInicial;
    let idadePatrimonioAcaba: number | null = null;

    // Data inicial
    const dataInicial = new Date();
    
    for (let mes = 0; mes <= mesesAte100Anos; mes++) {
      const idadeDecimal = idadeAtual + mes / 12;
      const idade = Math.floor(idadeDecimal);
      
      const dataAtual = new Date(dataInicial);
      dataAtual.setMonth(dataAtual.getMonth() + mes);
      const anoMes = `${dataAtual.toLocaleString('pt-BR', { month: 'short' })}/${dataAtual.getFullYear()}`;

      if (mes <= mesesAteAposentadoria) {
        // FASE DE ACÚMULO
        if (mes > 0) {
          // Patrimônio projetado (com aporte atual do usuário)
          patrimonioProjetado = patrimonioProjetado * (1 + taxaMensalAcumulo) + aporteMensal;
          patrimonioInvestido += aporteMensal;
          
          // Aposentadoria ideal (com aporte ideal calculado)
          aposentadoriaIdealAtual = aposentadoriaIdealAtual * (1 + taxaMensalAcumulo) + aporteIdealMensal;
        }
      } else {
        // FASE DE USUFRUTO
        const rendaLiquida = Math.max(0, rendaDesejada - outrasFontesRenda);
        
        // Patrimônio projetado do usuário
        patrimonioProjetado = patrimonioProjetado * (1 + taxaMensalUsufruto) - rendaLiquida;
        
        if (rendaLiquida > 0) {
          patrimonioInvestido = Math.max(0, patrimonioInvestido - rendaLiquida);
        }

        if (patrimonioProjetado <= 0 && idadePatrimonioAcaba === null) {
          idadePatrimonioAcaba = idade;
        }

        // Aposentadoria ideal - decresce até zerar aos 90 anos
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
