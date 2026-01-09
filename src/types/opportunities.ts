export type OpportunityStatus = 'active' | 'lost' | 'won';
export type OpportunityTemperature = 'cold' | 'warm' | 'hot';

export interface Opportunity {
  id: string;
  contact_id: string;
  current_funnel_id: string;
  current_stage_id: string;
  stage_entered_at: string;
  status: OpportunityStatus;
  lost_at: string | null;
  lost_from_stage_id: string | null;
  lost_reason_id: string | null;
  converted_at: string | null;
  qualification: number | null;
  temperature: OpportunityTemperature | null;
  notes: string | null;
  proposal_value: number | null;
  total_contract_value?: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  contact?: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    owner_id: string | null;
    source: string | null;
    campaign: string | null;
    referred_by: string | null;
    is_dirty_base: boolean;
    owner?: {
      full_name: string;
      email: string;
    };
  };
  current_stage?: {
    id: string;
    name: string;
    color: string;
    sla_hours: number | null;
    order_position: number;
  };
  current_funnel?: {
    id: string;
    name: string;
    generates_contract?: boolean;
    contract_prompt_text?: string | null;
  };
  lost_reason?: {
    id: string;
    name: string;
  };
}

export interface OpportunityHistory {
  id: string;
  opportunity_id: string;
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
  from_stage?: {
    id: string;
    name: string;
  };
  to_stage?: {
    id: string;
    name: string;
  };
}

export interface OpportunityFormData {
  contact_id: string;
  current_funnel_id: string;
  current_stage_id: string;
  qualification?: number;
  temperature?: OpportunityTemperature;
  notes?: string;
  proposal_value?: number;
}
