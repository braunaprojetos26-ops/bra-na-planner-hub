import type { ContractVariableKey, ProductConstantKey } from '@/lib/pbFormulaParser';

export interface ProductCategory {
  id: string;
  name: string;
  icon: string | null;
  is_active: boolean;
  order_position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCustomField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[]; // For select type
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  partner_name: string | null;
  base_value: number | null;
  pb_calculation_type: 'percentage' | 'fixed';
  pb_value: number;
  custom_fields: ProductCustomField[];
  has_validity: boolean;
  requires_payment_type: boolean;
  is_active: boolean;
  is_partner_product: boolean;
  order_position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // New formula-based fields
  pb_formula: string | null;
  pb_variables: ContractVariableKey[];
  pb_constants: Partial<Record<ProductConstantKey, number>>;
  // Joined
  category?: ProductCategory;
}

export interface FunnelSuggestedProduct {
  id: string;
  funnel_id: string;
  product_id: string;
  is_default: boolean;
  order_position: number;
  // Joined
  product?: Product;
}

export interface Contract {
  id: string;
  contact_id: string;
  opportunity_id: string | null;
  product_id: string;
  owner_id: string;
  contract_value: number;
  payment_type: string | null;
  installments: number | null;
  installment_value: number | null;
  custom_data: Record<string, unknown>;
  calculated_pbs: number;
  start_date: string | null;
  end_date: string | null;
  reported_at: string;
  status: 'pending' | 'active' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  product?: Product;
  contact?: {
    id: string;
    full_name: string;
    phone: string;
  };
  owner?: {
    full_name: string;
    email: string;
  };
}

export interface ContractFormData {
  product_id: string;
  contract_value: number;
  payment_type?: string;
  installments?: number;
  installment_value?: number;
  custom_data?: Record<string, unknown>;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export type PaymentType = 'avista' | 'mensal' | 'parcelado';

export const paymentTypeLabels: Record<PaymentType, string> = {
  avista: 'À vista',
  mensal: 'Mensal',
  parcelado: 'Parcelado',
};
