// Pricing logic for Planejamento Completo
// Based on the user's pricing spreadsheet

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
  baseValue: number; // Value before discount
  finalValue: number; // After discount if applied
  installmentValue: number; // For selected installments
  installmentTable: InstallmentRow[];
  totalPercentage: number; // Sum of meeting + complexity percentages
}

// Percentages by number of meetings
const MEETING_PERCENTAGES: Record<number, number> = {
  4: 0.016,   // 1.60%
  6: 0.019,   // 1.90%
  9: 0.022,   // 2.20%
  12: 0.025,  // 2.50%
};

// Percentages by complexity
const COMPLEXITY_PERCENTAGES: Record<number, number> = {
  1: 0.016,   // 1.60%
  2: 0.019,   // 1.90%
  3: 0.022,   // 2.20%
  4: 0.025,   // 2.50%
  5: 0.028,   // 2.80%
};

// Minimums
const MIN_MONTHLY = 250;      // R$250 minimum per installment
const MIN_ABSOLUTE = 3000;    // R$3,000 absolute minimum

export function calculateProposalPricing(
  input: PricingInput,
  selectedInstallments: number = 1
): PricingResult {
  const { monthlyIncome, monthsOfIncome, complexity, meetings, discountApplied } = input;

  // 1. Calculate annual income
  const annualIncome = monthlyIncome * monthsOfIncome;

  // 2. Sum percentages (meetings + complexity)
  const meetingPercentage = MEETING_PERCENTAGES[meetings] || 0.016;
  const complexityPercentage = COMPLEXITY_PERCENTAGES[complexity] || 0.016;
  const totalPercentage = meetingPercentage + complexityPercentage;

  // 3. Calculate base value
  let baseValue = annualIncome * totalPercentage;

  // 4. Apply minimums
  // Minimum by installments: R$250 × number of selected installments
  const minByInstallments = MIN_MONTHLY * selectedInstallments;
  // Absolute minimum: R$3,000
  baseValue = Math.max(baseValue, minByInstallments, MIN_ABSOLUTE);

  // 5. Apply discount if selected (10%)
  const finalValue = discountApplied ? baseValue * 0.9 : baseValue;

  // 6. Calculate installment table (simple division, no interest)
  const installmentTable: InstallmentRow[] = [];
  for (let n = 1; n <= 12; n++) {
    let installmentValue = finalValue / n;

    // Ensure minimum installment value of R$250
    if (installmentValue < MIN_MONTHLY) {
      installmentValue = MIN_MONTHLY;
    }

    installmentTable.push({
      installments: n,
      installmentValue: Math.round(installmentValue * 100) / 100,
      total: Math.round(finalValue * 100) / 100,
    });
  }

  // 7. Get selected installment value
  const selectedRow = installmentTable.find(r => r.installments === selectedInstallments);
  const installmentValue = selectedRow?.installmentValue || finalValue;

  return {
    baseValue: Math.round(baseValue * 100) / 100,
    finalValue: Math.round(finalValue * 100) / 100,
    installmentValue: Math.round(installmentValue * 100) / 100,
    installmentTable,
    totalPercentage,
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
