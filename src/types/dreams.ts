export type DreamCategory = 
  | 'travel'       // Viagem
  | 'vehicle'      // Veículo
  | 'home'         // Casa
  | 'family'       // Família
  | 'electronics'  // Eletrônico
  | 'education'    // Educação
  | 'hobby'        // Hobby
  | 'professional' // Profissional
  | 'health'       // Saúde
  | 'other'        // Outro
  | 'adjustment'   // Ajuste da meta
  | 'contribution'; // Aportes financeiros

export type RepetitionType = 
  | 'none'        // Sem repetição
  | 'quarterly'   // Trimestral
  | 'semiannual'  // Semestral
  | 'annual'      // Anual
  | '2years'      // A cada 2 anos
  | '3years'      // A cada 3 anos
  | '4years';     // A cada 4 anos

export interface Dream {
  id: string;
  category: DreamCategory;
  name: string;
  startDate: Date;
  realizationDate: Date;
  totalValue: number;
  isInstallment: boolean;
  installments?: number;
  repetitionType: RepetitionType;
  repetitionCount?: number;
  isPositive: boolean; // true = aporte, false = gasto
}

export interface DreamCategoryOption {
  value: DreamCategory;
  label: string;
  icon: string;
}

export const DREAM_CATEGORIES: DreamCategoryOption[] = [
  { value: 'travel', label: 'Viagem', icon: 'Plane' },
  { value: 'vehicle', label: 'Veículo', icon: 'Car' },
  { value: 'home', label: 'Casa', icon: 'Home' },
  { value: 'family', label: 'Família', icon: 'Users' },
  { value: 'electronics', label: 'Eletrônico', icon: 'Laptop' },
  { value: 'education', label: 'Educação', icon: 'GraduationCap' },
  { value: 'hobby', label: 'Hobby', icon: 'Dumbbell' },
  { value: 'professional', label: 'Profissional', icon: 'Briefcase' },
  { value: 'health', label: 'Saúde', icon: 'Heart' },
  { value: 'other', label: 'Outro', icon: 'Cloud' },
  { value: 'adjustment', label: 'Ajuste', icon: 'Target' },
  { value: 'contribution', label: 'Aporte', icon: 'PiggyBank' },
];

export interface ContributionStep {
  id: string;
  durationYears: number;
  monthlyAmount: number;
}

export const REPETITION_OPTIONS: { value: RepetitionType; label: string }[] = [
  { value: 'none', label: 'Sem repetição' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: '2years', label: 'A cada 2 anos' },
  { value: '3years', label: 'A cada 3 anos' },
  { value: '4years', label: 'A cada 4 anos' },
];
