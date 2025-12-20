export type ContactStatus = 'active' | 'lost' | 'won';

export interface Funnel {
  id: string;
  name: string;
  order_position: number;
  is_active: boolean;
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
  owner_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  income: number | null;
  source: string | null;
  campaign: string | null;
  is_dirty_base: boolean;
  status: ContactStatus;
  current_funnel_id: string;
  current_stage_id: string;
  stage_entered_at: string;
  lost_at: string | null;
  lost_from_stage_id: string | null;
  lost_reason_id: string | null;
  converted_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  owner?: {
    full_name: string;
    email: string;
  };
  current_stage?: FunnelStage;
  current_funnel?: Funnel;
  lost_reason?: LostReason;
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
  current_funnel_id: string;
  current_stage_id: string;
}
