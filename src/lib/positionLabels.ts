export type UserPosition = 
  | 'planejador_financeiro'
  | 'planejador_prime'
  | 'planejador_exclusive'
  | 'lider_comercial'
  | 'especialista'
  | 'especialista_private'
  | 'coordenador_comercial'
  | 'coordenador_executivo'
  | 'gerente_comercial'
  | 'superintendente'
  | 'operacoes_administrativo'
  | 'operacoes_investimentos'
  | 'operacoes_treinamentos'
  | 'operacoes_rh';

export const positionLabels: Record<UserPosition, { label: string; short: string }> = {
  'planejador_financeiro': { label: 'Planejador Financeiro', short: 'PF' },
  'planejador_prime': { label: 'Planejador Prime', short: 'PP' },
  'planejador_exclusive': { label: 'Planejador Exclusive', short: 'PE' },
  'lider_comercial': { label: 'Líder Comercial', short: 'LC' },
  'especialista': { label: 'Especialista', short: 'E' },
  'especialista_private': { label: 'Especialista Private', short: 'EP' },
  'coordenador_comercial': { label: 'Coordenador Comercial', short: 'CC' },
  'coordenador_executivo': { label: 'Coordenador Executivo', short: 'CE' },
  'gerente_comercial': { label: 'Gerente Comercial', short: 'G' },
  'superintendente': { label: 'Superintendente', short: 'S' },
  'operacoes_administrativo': { label: 'Operações - Administrativo', short: 'OA' },
  'operacoes_investimentos': { label: 'Operações - Investimentos', short: 'OI' },
  'operacoes_treinamentos': { label: 'Operações - Treinamentos', short: 'OT' },
  'operacoes_rh': { label: 'Operações - RH', short: 'ORH' },
};

export const positionOptions: { value: UserPosition; label: string }[] = [
  { value: 'superintendente', label: 'Superintendente' },
  { value: 'gerente_comercial', label: 'Gerente Comercial' },
  { value: 'coordenador_executivo', label: 'Coordenador Executivo' },
  { value: 'coordenador_comercial', label: 'Coordenador Comercial' },
  { value: 'lider_comercial', label: 'Líder Comercial' },
  { value: 'especialista_private', label: 'Especialista Private' },
  { value: 'especialista', label: 'Especialista' },
  { value: 'planejador_exclusive', label: 'Planejador Exclusive' },
  { value: 'planejador_prime', label: 'Planejador Prime' },
  { value: 'planejador_financeiro', label: 'Planejador Financeiro' },
  { value: 'operacoes_administrativo', label: 'Operações - Administrativo' },
  { value: 'operacoes_investimentos', label: 'Operações - Investimentos' },
  { value: 'operacoes_treinamentos', label: 'Operações - Treinamentos' },
  { value: 'operacoes_rh', label: 'Operações - RH' },
];

export function getPositionLabel(position: string | null): string {
  if (!position) return 'Sem cargo';
  return positionLabels[position as UserPosition]?.label || position;
}

export function getPositionShort(position: string | null): string {
  if (!position) return '-';
  return positionLabels[position as UserPosition]?.short || position;
}
