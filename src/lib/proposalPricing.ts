// Pricing logic for Planejamento Completo
// Based on the provided code from the user

export interface PricingInput {
  monthlyIncome: number;
  monthsOfIncome: number;
  complexity: number; // 1-5
  meetings: 4 | 6 | 9 | 12;
  discountApplied: boolean;
}

export interface InstallmentRow {
  installments: number;
  installmentValue: number;
  total: number;
}

export interface PricingResult {
  baseValue: number; // Value for 1x payment
  finalValue: number; // After discount if applied
  installmentValue: number; // For selected installments
  installmentTable: InstallmentRow[];
}

// Complexity multipliers
const COMPLEXITY_MULTIPLIERS: Record<number, number> = {
  1: 0.8,
  2: 0.9,
  3: 1.0,
  4: 1.1,
  5: 1.2,
};

// Meeting multipliers (adjustment based on number of meetings)
const MEETING_MULTIPLIERS: Record<number, number> = {
  4: 0.85,
  6: 1.0,
  9: 1.25,
  12: 1.5,
};

// Installment fee multipliers (increases total for more installments)
const INSTALLMENT_FEES: Record<number, number> = {
  1: 1.0,
  2: 1.02,
  3: 1.04,
  4: 1.06,
  5: 1.08,
  6: 1.10,
  7: 1.12,
  8: 1.14,
  9: 1.16,
  10: 1.18,
  11: 1.20,
  12: 1.22,
};

export function calculateProposalPricing(
  input: PricingInput,
  selectedInstallments: number = 1
): PricingResult {
  const { monthlyIncome, monthsOfIncome, complexity, meetings, discountApplied } = input;

  // Base calculation: monthly income * months * complexity factor * meeting factor
  const complexityMultiplier = COMPLEXITY_MULTIPLIERS[complexity] || 1.0;
  const meetingMultiplier = MEETING_MULTIPLIERS[meetings] || 1.0;

  const baseValue = monthlyIncome * monthsOfIncome * complexityMultiplier * meetingMultiplier;

  // Apply discount if selected
  const finalValue = discountApplied ? baseValue * 0.9 : baseValue;

  // Calculate installment table
  const installmentTable: InstallmentRow[] = [];
  for (let n = 1; n <= 12; n++) {
    const fee = INSTALLMENT_FEES[n] || 1.0;
    const total = finalValue * fee;
    const installmentValue = total / n;
    installmentTable.push({
      installments: n,
      installmentValue: Math.round(installmentValue * 100) / 100,
      total: Math.round(total * 100) / 100,
    });
  }

  // Get selected installment value
  const selectedRow = installmentTable.find(r => r.installments === selectedInstallments);
  const installmentValue = selectedRow?.installmentValue || finalValue;

  return {
    baseValue: Math.round(baseValue * 100) / 100,
    finalValue: Math.round(finalValue * 100) / 100,
    installmentValue: Math.round(installmentValue * 100) / 100,
    installmentTable,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function parseCurrencyInput(value: string): number {
  const numbers = value.replace(/\D/g, '');
  if (numbers === '') return 0;
  return parseFloat(numbers) / 100;
}

export function formatCurrencyInput(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
