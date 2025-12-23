export type ContactTemperature = 'cold' | 'warm' | 'hot';
export type ContactGender = 'masculino' | 'feminino' | 'outro' | 'prefiro_nao_informar';
export type MaritalStatus = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel';

export interface Funnel {
  id: string;
  name: string;
  order_position: number;
  is_active: boolean;
  generates_contract: boolean;
  auto_create_next: boolean;
  contract_prompt_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface FunnelStage {
  id: string;
  funnel_id: string;
  name: string;
  order_position: number;
  sla_hours: number | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface LostReason {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  client_code: string | null;
  owner_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  income: number | null;
  source: string | null;
  campaign: string | null;
  is_dirty_base: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Additional fields
  profession: string | null;
  gender: string | null;
  referred_by: string | null;
  qualification: number | null;
  temperature: ContactTemperature | null;
  notes: string | null;
  source_detail: string | null;
  rg: string | null;
  rg_issuer: string | null;
  rg_issue_date: string | null;
  cpf: string | null;
  birth_date: string | null;
  marital_status: string | null;
  zip_code: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  // Joined fields
  owner?: {
    full_name: string;
    email: string;
  };
  referred_by_contact?: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
  // Computed fields
  active_opportunities_count?: number;
}

export interface ContactHistory {
  id: string;
  contact_id: string;
  action: string;
  from_stage_id: string | null;
  to_stage_id: string | null;
  changed_by: string;
  notes: string | null;
  created_at: string;
  // Joined fields
  changed_by_profile?: {
    full_name: string;
  };
  from_stage?: FunnelStage;
  to_stage?: FunnelStage;
}

export interface ContactFormData {
  full_name: string;
  phone: string;
  email?: string;
  income?: number;
  source?: string;
  campaign?: string;
  owner_id?: string;
  // Additional fields
  profession?: string;
  gender?: string;
  referred_by?: string;
  qualification?: number;
  temperature?: ContactTemperature;
  notes?: string;
  source_detail?: string;
  rg?: string;
  rg_issuer?: string;
  rg_issue_date?: string;
  cpf?: string;
  birth_date?: string;
  marital_status?: string;
  zip_code?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
}
