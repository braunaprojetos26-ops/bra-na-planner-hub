import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Target, Save } from 'lucide-react';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';

interface DashboardGoals {
  monthlyRevenueGoal: number;
}

export function GoalsTab() {
  const { data: setting, isLoading } = useSystemSetting('dashboard_goals');
  const updateSetting = useUpdateSystemSetting();
  
  const [monthlyRevenueGoal, setMonthlyRevenueGoal] = useState<string>('');

  useEffect(() => {
    if (setting?.value) {
      const goals = setting.value as unknown as DashboardGoals;
      setMonthlyRevenueGoal(goals.monthlyRevenueGoal?.toString() || '');
    }
  }, [setting]);

  const handleSave = () => {
    const goalValue = parseFloat(monthlyRevenueGoal.replace(/\D/g, '')) / 100;
    
    updateSetting.mutate({
      key: 'dashboard_goals',
      value: {
        monthlyRevenueGoal: goalValue || 0,
      } as unknown as Record<string, unknown>,
      description: 'Metas do dashboard'
    });
  };

  const formatCurrencyInput = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    // Convert to number and format
    const number = parseInt(digits, 10) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(number);
  };

  const handleRevenueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setMonthlyRevenueGoal(formatted);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Metas de Faturamento</CardTitle>
          </div>
          <CardDescription>
            Configure as metas de faturamento que serão exibidas no dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monthlyRevenueGoal">Meta de Faturamento Mensal</Label>
            <Input
              id="monthlyRevenueGoal"
              placeholder="R$ 0,00"
              value={monthlyRevenueGoal}
              onChange={handleRevenueChange}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Valor da meta de faturamento para o mês atual
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={updateSetting.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateSetting.isPending ? 'Salvando...' : 'Salvar Metas'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
