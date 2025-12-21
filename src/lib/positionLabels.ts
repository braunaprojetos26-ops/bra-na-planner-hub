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
  | 'superintendente';

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
];

export function getPositionLabel(position: string | null): string {
  if (!position) return 'Sem cargo';
  return positionLabels[position as UserPosition]?.label || position;
}

export function getPositionShort(position: string | null): string {
  if (!position) return '-';
  return positionLabels[position as UserPosition]?.short || position;
}
