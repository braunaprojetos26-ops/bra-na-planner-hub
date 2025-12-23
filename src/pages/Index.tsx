import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Kanban, TrendingUp, Banknote } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useMemo } from 'react';

export default function Index() {
  const { profile, role } = useAuth();
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();

  const roleLabels: Record<string, string> = {
    planejador: 'Planejador',
    lider: 'Líder Comercial',
    supervisor: 'Supervisor',
    gerente: 'Gerente',
    superadmin: 'Administrador',
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalContacts = contacts?.length || 0;
    const activeOpportunities = opportunities?.filter(o => o.status === 'active') || [];
    const wonOpportunities = opportunities?.filter(o => o.status === 'won') || [];
    
    // Total proposal value of active opportunities
    const totalProposalValue = activeOpportunities.reduce((sum, opp) => {
      return sum + (opp.proposal_value || 0);
    }, 0);

    // Conversion rate (won / total closed)
    const closedOpportunities = opportunities?.filter(o => o.status === 'won' || o.status === 'lost') || [];
    const conversionRate = closedOpportunities.length > 0 
      ? (wonOpportunities.length / closedOpportunities.length) * 100 
      : 0;

    return {
      totalContacts,
      activeOpportunities: activeOpportunities.length,
      totalProposalValue,
      conversionRate,
    };
  }, [contacts, opportunities]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      notation: value >= 1000000 ? 'compact' : 'standard',
      maximumFractionDigits: value >= 1000000 ? 1 : 2
    }).format(value);
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
            <div className="text-2xl font-bold">
              {contactsLoading ? '...' : metrics.totalContacts}
            </div>
            <p className="text-xs text-muted-foreground">contatos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negociações Ativas</CardTitle>
            <Kanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {opportunitiesLoading ? '...' : metrics.activeOpportunities}
            </div>
            <p className="text-xs text-muted-foreground">em andamento</p>
          </CardContent>
        </Card>

        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas em Aberto</CardTitle>
            <Banknote className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {opportunitiesLoading ? '...' : formatCurrency(metrics.totalProposalValue)}
            </div>
            <p className="text-xs text-muted-foreground">valor total em negociação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {opportunitiesLoading ? '...' : `${metrics.conversionRate.toFixed(0)}%`}
            </div>
            <p className="text-xs text-muted-foreground">das negociações fechadas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
