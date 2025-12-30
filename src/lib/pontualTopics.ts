// Pontual Proposal Topics and Pricing Logic

export interface PontualTopic {
  key: string;
  name: string;
  icon: string;
  subtopics: string[];
}

export const PONTUAL_TOPICS: PontualTopic[] = [
  {
    key: 'endividamento',
    name: 'Endividamento',
    icon: 'CreditCard',
    subtopics: [
      'Fluxo de caixa atual e sugerido',
      'Análise das dívidas',
      'Sugestão de troca de dívida',
    ],
  },
  {
    key: 'viagens_planejamento',
    name: 'Viagens - Planejamento',
    icon: 'Plane',
    subtopics: [
      'Orçamento das passagens',
      'Organização de custos para passeio, estadia e alimentação',
      'Estratégia de acúmulo',
    ],
  },
  {
    key: 'viagens_milhas',
    name: 'Viagens - Só Milhas',
    icon: 'Award',
    subtopics: [
      'Análise do cartão de crédito atual',
      'Sugestão de novos cartões de crédito',
      'Maximização do acúmulo de pontos',
    ],
  },
  {
    key: 'organizacao_financeira',
    name: 'Organização Financeira',
    icon: 'PieChart',
    subtopics: [
      'Fluxo de caixa atual e sugerido',
      'Estratégia de acúmulo',
      'Ferramentas de controle orçamentário',
    ],
  },
  {
    key: 'quitacao_financiamento',
    name: 'Quitação Financiamento',
    icon: 'Home',
    subtopics: [
      'Análise do crédito atual',
      'Estratégias de quitação da dívida',
      'Definição da estratégia sugerida',
    ],
  },
  {
    key: 'troca_divida',
    name: 'Troca de Dívida',
    icon: 'ArrowRightLeft',
    subtopics: [
      'Análise do crédito atual',
      'Opções de troca de dívida',
      'Definição da estratégia sugerida',
    ],
  },
  {
    key: 'seguro_vida',
    name: 'Reestruturação Seguro de Vida',
    icon: 'Shield',
    subtopics: [
      'Análise do seguro atual',
      'Análise da renda e patrimônio atual e dependentes',
      'Sugestão de seguro ideal',
    ],
  },
  {
    key: 'aposentadoria',
    name: 'Planejamento de Aposentadoria Completo',
    icon: 'Sunset',
    subtopics: [
      'Situação atual (INSS, fundos previdenciários trabalho ou complementar)',
      'Identificação da fase (acúmulo ou usufruto)',
      'Sugestão de planejamento de aposentadoria',
    ],
  },
  {
    key: 'aquisicao_bens',
    name: 'Aquisição de Bens',
    icon: 'Car',
    subtopics: [
      'Apresentação das estratégias de aquisição de bens',
      'Definição da estratégia sugerida',
      'Apresentação de cotações',
    ],
  },
  {
    key: 'carteira_investimentos',
    name: 'Avaliação Carteira de Investimentos',
    icon: 'BarChart3',
    subtopics: [
      'Introdução a Investimentos',
      'Definição de uma carteira sugerida',
      'Comparação de rentabilidade histórica da carteira atual x sugerida',
    ],
  },
  {
    key: 'fundos_previdenciarios',
    name: 'Reestruturação Fundos Previdenciários',
    icon: 'Landmark',
    subtopics: [
      'Introdução a Investimentos',
      'Definição de uma carteira previdenciária sugerida',
      'Comparação de rentabilidade histórica da carteira atual x sugerida',
    ],
  },
  {
    key: 'ensinamento_investimentos',
    name: 'Ensinamento Investimentos',
    icon: 'GraduationCap',
    subtopics: [
      'Introdução a Investimentos',
      'Ensinamento das classes de ativos',
      'Interligação entre investimentos e objetivos',
    ],
  },
  {
    key: 'vantagem_tributaria',
    name: 'Vantagem Tributária',
    icon: 'Receipt',
    subtopics: [
      'Diferença entre declaração completa e simplificada',
      'Diferença entre VGBL e PGBL',
      'Avaliação das despesas dedutíveis e sugestão de implementação',
    ],
  },
  {
    key: 'planejamento_sucessorio',
    name: 'Planejamento Sucessório',
    icon: 'FileText',
    subtopics: [
      'O que é um inventário',
      'Quais os custos de um inventário',
      'Sugestão de estratégia para planejamento sucessório',
    ],
  },
];

export interface SelectedTopic {
  topic: string;
  meetings: number;
}

export interface PontualPricing {
  meetingValue: number;
  totalMeetings: number;
  totalValue: number;
  installmentTable: { installments: number; installmentValue: number; total: number }[];
}

/**
 * Calculate pricing for Pontual proposals
 * Formula: max(R$500, monthlyIncome * 7.5%) * totalMeetings
 * Max installments: 6
 */
export function calculatePontualPricing(
  monthlyIncome: number,
  totalMeetings: number,
  selectedInstallments: number = 1
): PontualPricing {
  // Value per meeting: 7.5% of income, minimum R$500
  const meetingValue = Math.max(500, monthlyIncome * 0.075);
  
  // Total value
  const totalValue = meetingValue * totalMeetings;
  
  // Generate installment table (1x to 6x only for Pontual)
  const installmentTable = Array.from({ length: 6 }, (_, i) => {
    const numInstallments = i + 1;
    return {
      installments: numInstallments,
      installmentValue: totalValue / numInstallments,
      total: totalValue,
    };
  });

  return {
    meetingValue,
    totalMeetings,
    totalValue,
    installmentTable,
  };
}

/**
 * Get total meetings from selected topics
 */
export function getTotalMeetingsFromTopics(selectedTopics: SelectedTopic[]): number {
  return selectedTopics.reduce((sum, topic) => sum + topic.meetings, 0);
}

/**
 * Validate topic selection
 * Rules: Max 3 topics, max 3 meetings total
 */
export function validateTopicSelection(selectedTopics: SelectedTopic[]): {
  valid: boolean;
  error?: string;
} {
  if (selectedTopics.length > 3) {
    return { valid: false, error: 'Máximo de 3 tópicos permitidos' };
  }
  
  const totalMeetings = getTotalMeetingsFromTopics(selectedTopics);
  if (totalMeetings > 3) {
    return { valid: false, error: 'Máximo de 3 reuniões no total' };
  }
  
  if (selectedTopics.length === 0) {
    return { valid: false, error: 'Selecione pelo menos 1 tópico' };
  }
  
  return { valid: true };
}
