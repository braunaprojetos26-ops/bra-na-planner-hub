export type TicketDepartment = 'investimentos' | 'administrativo' | 'treinamentos' | 'recursos_humanos';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  department: TicketDepartment;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: string;
  assigned_to: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    full_name: string;
    email: string;
  };
  assignee?: {
    full_name: string;
    email: string;
  } | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  is_internal: boolean;
  created_by: string;
  created_at: string;
  creator?: {
    full_name: string;
    email: string;
  };
}

export const departmentLabels: Record<TicketDepartment, string> = {
  investimentos: 'Investimentos',
  administrativo: 'Administrativo',
  treinamentos: 'Treinamentos',
  recursos_humanos: 'Recursos Humanos',
};

export const statusLabels: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

export const priorityLabels: Record<TicketPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export const statusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

export const priorityColors: Record<TicketPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};
