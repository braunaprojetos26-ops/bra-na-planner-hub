import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Kanban, TrendingUp, Clock } from 'lucide-react';

export default function Index() {
  const { profile, role } = useAuth();

  const roleLabels: Record<string, string> = {
    planejador: 'Planejador',
    lider: 'Líder Comercial',
    supervisor: 'Supervisor',
    gerente: 'Gerente',
    superadmin: 'Administrador',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bem-vindo, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
        </h1>
        <p className="text-muted-foreground">
          {role && roleLabels[role]} • Central do Planejador Financeiro
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contatos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Em breve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
            <Kanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Em breve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Em breve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Em breve</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fase 1 Concluída ✓</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2">
          <p>Sistema base implementado com sucesso:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Autenticação (login/signup)</li>
            <li>5 níveis hierárquicos com RLS</li>
            <li>Layout SaaS com sidebar escura</li>
            <li>Primeiro usuário vira Superadmin</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}