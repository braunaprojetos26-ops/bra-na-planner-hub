export type TaskType = 'call' | 'email' | 'meeting' | 'follow_up' | 'proposal' | 'document' | 'whatsapp' | 'scheduling_analysis' | 'other';
export type TaskStatus = 'pending' | 'completed' | 'overdue';

export interface Task {
  id: string;
  opportunity_id: string;
  contact_id?: string | null;
  created_by: string;
  assigned_to?: string | null;
  title: string;
  description: string | null;
  task_type: TaskType;
  scheduled_at: string;
  status: TaskStatus;
  completed_at: string | null;
  reminder_sent_at: string | null;
  daily_reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  opportunity?: {
    id: string;
    contact?: {
      id: string;
      full_name: string;
    };
    current_funnel?: {
      id: string;
      name: string;
    };
  };
  created_by_profile?: {
    full_name: string;
  };
  assigned_to_profile?: {
    full_name: string;
  };
}

export interface TaskFormData {
  opportunity_id: string;
  title: string;
  description?: string;
  task_type: TaskType;
  scheduled_at: string;
}

export interface TeamTaskFormData {
  assigned_to: string;
  title: string;
  description?: string;
  task_type: TaskType;
  scheduled_at: string;
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  call: 'Ligação',
  email: 'E-mail',
  meeting: 'Reunião',
  follow_up: 'Follow-up',
  proposal: 'Envio de Proposta',
  document: 'Envio de Documento',
  whatsapp: 'WhatsApp',
  scheduling_analysis: 'Agendamento de Análise',
  other: 'Outro',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendente',
  completed: 'Concluída',
  overdue: 'Atrasada',
};
