export type TicketDepartment = 'investimentos' | 'administrativo' | 'treinamentos' | 'recursos_humanos' | 'marketing' | 'aquisicao_bens' | 'patrimonial';
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
  contact_id: string | null;
  ticket_type_id: string | null;
  dynamic_fields: Record<string, any> | null;
  sla_deadline: string | null;
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
  contact?: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    client_code: string | null;
  } | null;
  contract?: {
    id: string;
    product: {
      name: string;
    };
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
  administrativo: 'Administrativo/Financeiro',
  treinamentos: 'Treinamentos',
  recursos_humanos: 'Recursos Humanos',
  marketing: 'Marketing',
  aquisicao_bens: 'Aquisição de Bens',
  patrimonial: 'Patrimonial',
};

export const DEPARTMENTS_REQUIRING_CONTACT: TicketDepartment[] = [
  'investimentos',
  'aquisicao_bens',
  'patrimonial',
];

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

// Mapeamento de departamento para posição de operações
export const DEPARTMENT_TO_OPERATIONS_POSITION: Record<TicketDepartment, string> = {
  investimentos: 'operacoes_investimentos',
  administrativo: 'operacoes_administrativo',
  treinamentos: 'operacoes_treinamentos',
  recursos_humanos: 'operacoes_rh',
  marketing: 'operacoes_marketing',
  aquisicao_bens: 'operacoes_aquisicao_bens',
  patrimonial: 'operacoes_patrimonial',
};

// Mapeamento inverso: posição de operações para departamento
export const OPERATIONS_POSITION_TO_DEPARTMENT: Record<string, TicketDepartment> = {
  operacoes_investimentos: 'investimentos',
  operacoes_administrativo: 'administrativo',
  operacoes_treinamentos: 'treinamentos',
  operacoes_rh: 'recursos_humanos',
  operacoes_marketing: 'marketing',
  operacoes_aquisicao_bens: 'aquisicao_bens',
  operacoes_patrimonial: 'patrimonial',
};
