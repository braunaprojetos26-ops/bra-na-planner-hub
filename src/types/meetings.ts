export const MEETING_TYPES = [
  'Análise',
  'Gestão de Riscos',
  'Planejamento Macro',
  'Acompanhamento',
  'Independência Financeira',
  'Investimentos',
  'Renovação',
  'Fechamento',
  'Aquisição de Bens',
  'Montagem de Planejamento',
] as const;

export type MeetingType = typeof MEETING_TYPES[number];

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  contact_id: string;
  opportunity_id: string | null;
  scheduled_by: string;
  meeting_type: MeetingType;
  scheduled_at: string;
  duration_minutes: number;
  participants: string[];
  allows_companion: boolean;
  notes: string | null;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  contact?: {
    id: string;
    full_name: string;
    email: string | null;
  };
  scheduled_by_profile?: {
    full_name: string;
    email: string;
  };
}

export interface MeetingFormData {
  meeting_type: MeetingType;
  scheduled_at: Date;
  duration_minutes: number;
  participants: string[];
  allows_companion: boolean;
  notes?: string;
}
