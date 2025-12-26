export type ClientPlanStatus = 'active' | 'suspended' | 'closed';
export type ClientPlanMeetingStatus = 'pending' | 'scheduled' | 'completed' | 'overdue';

export interface ClientPlan {
  id: string;
  contact_id: string;
  owner_id: string;
  contract_value: number;
  total_meetings: 4 | 6 | 9 | 12;
  start_date: string;
  end_date: string;
  status: ClientPlanStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  contact?: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    client_code: string | null;
  };
  owner?: {
    full_name: string;
    email: string;
  };
  plan_meetings?: ClientPlanMeeting[];
  // Computed field
  productCount?: number;
}

export interface ClientPlanMeeting {
  id: string;
  plan_id: string;
  meeting_number: number;
  theme: string;
  scheduled_date: string;
  meeting_id: string | null;
  status: ClientPlanMeetingStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  meeting?: {
    id: string;
    scheduled_at: string;
    status: string;
  };
}

export interface ClientPlanFormData {
  contact_id: string;
  contract_value: number;
  total_meetings: 4 | 6 | 9 | 12;
  start_date: string;
  notes?: string;
  meetings: {
    meeting_number: number;
    theme: string;
    scheduled_date: string;
  }[];
}

export interface ClientMetrics {
  activeClients: number;
  meetingsCompletedThisMonth: number;
  meetingsPendingThisMonth: number;
  totalPortfolioValue: number;
  // Novas métricas por categoria de produto
  activePlanejamentoValue: number;
  activeSeguroValue: number;
  investimentosValue: number;
  creditoRealizadoValue: number;
}
