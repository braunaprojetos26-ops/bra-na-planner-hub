export type AppRole = 'planejador' | 'lider' | 'supervisor' | 'gerente' | 'superadmin';

export const roleLabels: Record<AppRole, string> = {
  'planejador': 'Planejador',
  'lider': 'Líder',
  'supervisor': 'Supervisor',
  'gerente': 'Gerente',
  'superadmin': 'Super Admin',
};

export const roleOptions: { value: AppRole; label: string; description: string }[] = [
  { value: 'planejador', label: 'Planejador', description: 'Acesso básico ao sistema' },
  { value: 'lider', label: 'Líder', description: 'Pode ver contatos da equipe' },
  { value: 'supervisor', label: 'Supervisor', description: 'Pode ver contatos da equipe' },
  { value: 'gerente', label: 'Gerente', description: 'Pode ver contatos da equipe' },
  { value: 'superadmin', label: 'Super Admin', description: 'Acesso total ao sistema' },
];

export function getRoleLabel(role: AppRole | null): string {
  if (!role) return 'Sem papel';
  return roleLabels[role] || role;
}

export function getRoleBadgeVariant(role: AppRole | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'superadmin':
      return 'destructive';
    case 'gerente':
    case 'supervisor':
    case 'lider':
      return 'default';
    default:
      return 'secondary';
  }
}
