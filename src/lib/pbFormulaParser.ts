/**
 * PB Formula Parser
 * Parses and calculates PB values based on flexible formulas with variables and constants
 */

// Contract variables that the planner fills in the contract modal
export const CONTRACT_VARIABLES = {
  valor_total: { label: 'Valor Total do Contrato', type: 'currency' as const },
  valor_mensal: { label: 'Valor Mensal', type: 'currency' as const },
  credito: { label: 'Valor do Crédito', type: 'currency' as const },
  premio_mensal: { label: 'Prêmio Mensal', type: 'currency' as const },
  valor_investido: { label: 'Valor Investido', type: 'currency' as const },
} as const;

// Product constants that the admin configures per product
export const PRODUCT_CONSTANTS = {
  comissao_pct: { label: '% Comissão', type: 'percentage' as const, defaultValue: 0 },
  taxa_admin_pct: { label: '% Taxa Administrativa', type: 'percentage' as const, defaultValue: 0 },
  fator_multiplicador: { label: 'Fator Multiplicador', type: 'number' as const, defaultValue: 1 },
} as const;

export type ContractVariableKey = keyof typeof CONTRACT_VARIABLES;
export type ProductConstantKey = keyof typeof PRODUCT_CONSTANTS;

export type VariableType = 'currency' | 'percentage' | 'number';

export interface PBVariableConfig {
  label: string;
  type: VariableType;
}

export interface PBConstantConfig extends PBVariableConfig {
  defaultValue: number;
}

/**
 * Validates a formula syntax and checks if all variables are recognized
 */
export function validateFormula(
  formula: string,
  selectedVariables: ContractVariableKey[] = [],
  selectedConstants: ProductConstantKey[] = []
): { valid: boolean; error?: string } {
  if (!formula || formula.trim() === '') {
    return { valid: false, error: 'Fórmula não pode estar vazia' };
  }

  // Extract all variables from the formula
  const variablePattern = /\{(\w+)\}/g;
  const usedVariables: string[] = [];
  let match;
  
  while ((match = variablePattern.exec(formula)) !== null) {
    usedVariables.push(match[1]);
  }

  // Check if all used variables are valid
  const allValidKeys = [
    ...Object.keys(CONTRACT_VARIABLES),
    ...Object.keys(PRODUCT_CONSTANTS),
  ];

  for (const variable of usedVariables) {
    if (!allValidKeys.includes(variable)) {
      return { valid: false, error: `Variável desconhecida: {${variable}}` };
    }
  }

  // Check if all used contract variables are in the selected list
  for (const variable of usedVariables) {
    if (variable in CONTRACT_VARIABLES && !selectedVariables.includes(variable as ContractVariableKey)) {
      return { 
        valid: false, 
        error: `A variável {${variable}} está na fórmula mas não foi selecionada nas variáveis do contrato` 
      };
    }
    if (variable in PRODUCT_CONSTANTS && !selectedConstants.includes(variable as ProductConstantKey)) {
      return { 
        valid: false, 
        error: `A constante {${variable}} está na fórmula mas não foi configurada` 
      };
    }
  }

  // Try to evaluate with test values
  try {
    const testValues: Record<string, number> = {};
    for (const v of usedVariables) {
      testValues[v] = 1;
    }
    
    const result = evaluateFormula(formula, testValues);
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      return { valid: false, error: 'Fórmula inválida - resultado não é um número válido' };
    }
  } catch (e) {
    return { valid: false, error: `Erro na fórmula: ${e instanceof Error ? e.message : 'Sintaxe inválida'}` };
  }

  return { valid: true };
}

/**
 * Safely evaluates a mathematical formula
 * Only allows: numbers, +, -, *, /, (), and pre-defined variables
 */
function evaluateFormula(formula: string, values: Record<string, number>): number {
  // Replace variables with their values
  let expression = formula;
  for (const [key, value] of Object.entries(values)) {
    expression = expression.replace(new RegExp(`\\{${key}\\}`, 'g'), value.toString());
  }

  // Validate that only allowed characters remain
  const allowedPattern = /^[\d\s+\-*/().]+$/;
  if (!allowedPattern.test(expression)) {
    throw new Error('Caracteres inválidos na fórmula');
  }

  // Check for balanced parentheses
  let depth = 0;
  for (const char of expression) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth < 0) throw new Error('Parênteses desbalanceados');
  }
  if (depth !== 0) throw new Error('Parênteses desbalanceados');

  // Safe evaluation using Function constructor (safer than eval for this use case)
  // We've already validated that only numbers and operators are present
  try {
    const fn = new Function(`return (${expression})`);
    const result = fn();
    return typeof result === 'number' ? result : NaN;
  } catch {
    throw new Error('Erro ao calcular a fórmula');
  }
}

/**
 * Calculates PBs using the product's formula, contract values, and product constants
 */
export function calculatePBsWithFormula(
  formula: string | null | undefined,
  contractValues: Partial<Record<ContractVariableKey, number>>,
  productConstants: Partial<Record<ProductConstantKey, number>>
): number {
  // Fallback to 0 if no formula
  if (!formula || formula.trim() === '') {
    return 0;
  }

  // Merge all values
  const allValues: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(contractValues)) {
    if (typeof value === 'number') {
      allValues[key] = value;
    }
  }
  
  for (const [key, value] of Object.entries(productConstants)) {
    if (typeof value === 'number') {
      allValues[key] = value;
    }
  }

  try {
    return evaluateFormula(formula, allValues);
  } catch {
    return 0;
  }
}

/**
 * Preview calculation with test values
 */
export function previewCalculation(
  formula: string,
  testValues: Record<string, number>
): { success: boolean; result?: number; error?: string } {
  try {
    const result = evaluateFormula(formula, testValues);
    return { success: true, result };
  } catch (e) {
    return { 
      success: false, 
      error: e instanceof Error ? e.message : 'Erro ao calcular' 
    };
  }
}

/**
 * Extract all variables used in a formula
 */
export function extractVariablesFromFormula(formula: string): {
  contractVariables: ContractVariableKey[];
  productConstants: ProductConstantKey[];
} {
  const variablePattern = /\{(\w+)\}/g;
  const contractVariables: ContractVariableKey[] = [];
  const productConstants: ProductConstantKey[] = [];
  
  let match;
  while ((match = variablePattern.exec(formula)) !== null) {
    const variable = match[1];
    if (variable in CONTRACT_VARIABLES) {
      contractVariables.push(variable as ContractVariableKey);
    }
    if (variable in PRODUCT_CONSTANTS) {
      productConstants.push(variable as ProductConstantKey);
    }
  }

  return {
    contractVariables: [...new Set(contractVariables)],
    productConstants: [...new Set(productConstants)],
  };
}

/**
 * Get formula examples for common product types
 */
export function getFormulaExamples(): Array<{
  name: string;
  formula: string;
  description: string;
  variables: ContractVariableKey[];
  constants: ProductConstantKey[];
}> {
  return [
    {
      name: 'Planejamento 12 meses',
      formula: '{valor_total} / 100',
      description: 'Valor anual dividido por 100',
      variables: ['valor_total'],
      constants: [],
    },
    {
      name: 'Planejamento Pontual',
      formula: '{valor_total} / 100',
      description: 'Valor da venda dividido por 100',
      variables: ['valor_total'],
      constants: [],
    },
    {
      name: 'Consórcio',
      formula: '({credito} * {taxa_admin_pct}) / 100',
      description: 'Valor do crédito × taxa administrativa ÷ 100',
      variables: ['credito'],
      constants: ['taxa_admin_pct'],
    },
    {
      name: 'Seguro de Vida',
      formula: '({premio_mensal} * 12 * {comissao_pct}) / 100',
      description: 'Prêmio mensal × 12 × % comissão ÷ 100',
      variables: ['premio_mensal'],
      constants: ['comissao_pct'],
    },
    {
      name: 'Investimento',
      formula: '{valor_investido} * {comissao_pct} / 100',
      description: 'Valor investido × % comissão ÷ 100',
      variables: ['valor_investido'],
      constants: ['comissao_pct'],
    },
  ];
}
