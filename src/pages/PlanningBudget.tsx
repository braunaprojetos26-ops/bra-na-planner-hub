import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Plus, Trash2, Edit2, Check, X, Lightbulb, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useContactDataCollection, getValueByPath } from '@/hooks/useContactDataCollection';
import { cn } from '@/lib/utils';

interface BudgetItem {
  id: string;
  name: string;
  value: number;
}

interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  items: BudgetItem[];
}

const DEFAULT_CATEGORIES: BudgetCategory[] = [
  { id: 'moradia', name: 'Moradia', icon: '🏠', items: [] },
  { id: 'transporte', name: 'Transporte', icon: '🚗', items: [] },
  { id: 'alimentacao', name: 'Alimentação', icon: '🍽️', items: [] },
  { id: 'saude', name: 'Saúde', icon: '🏥', items: [] },
  { id: 'educacao', name: 'Educação', icon: '📚', items: [] },
  { id: 'lazer', name: 'Lazer', icon: '🎮', items: [] },
  { id: 'pessoal', name: 'Pessoal', icon: '👤', items: [] },
  { id: 'dividas', name: 'Dívidas', icon: '💳', items: [] },
  { id: 'outros', name: 'Outros', icon: '📦', items: [] },
];

function generateId() {
  return crypto.randomUUID();
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function BudgetCategoryCard({
  category,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: {
  category: BudgetCategory;
  onAddItem: (categoryId: string) => void;
  onRemoveItem: (categoryId: string, itemId: string) => void;
  onUpdateItem: (categoryId: string, itemId: string, field: 'name' | 'value', value: string | number) => void;
}) {
  const total = category.items.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span>{category.icon}</span>
            {category.name}
          </CardTitle>
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(total)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {category.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              value={item.name}
              onChange={(e) => onUpdateItem(category.id, item.id, 'name', e.target.value)}
              placeholder="Descrição"
              className="flex-1 h-8 text-sm"
            />
            <div className="w-36">
              <CurrencyInput
                value={item.value}
                onChange={(v) => onUpdateItem(category.id, item.id, 'value', v ?? 0)}
                className="h-8 text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onRemoveItem(category.id, item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={() => onAddItem(category.id)}
        >
          <Plus className="h-3 w-3" />
          Adicionar item
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PlanningBudget() {
  const { clientId } = useParams();
  const { data: dataCollection } = useContactDataCollection(clientId);

  const [activeTab, setActiveTab] = useState<'atual' | 'sugerido'>('atual');
  const [currentBudget, setCurrentBudget] = useState<BudgetCategory[]>(
    DEFAULT_CATEGORIES.map(c => ({ ...c, items: [] }))
  );
  const [suggestedBudget, setSuggestedBudget] = useState<BudgetCategory[]>(
    DEFAULT_CATEGORIES.map(c => ({ ...c, items: [] }))
  );
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);

  // Pull income and expenses from data collection (cash_flow structure)
  useEffect(() => {
    if (!dataCollection?.data_collection) return;
    const dc = dataCollection.data_collection;

    // --- Income ---
    const incomeList = getValueByPath(dc, 'cash_flow.income') as Array<{ name: string; value_monthly_brl: number | null }> | undefined;
    if (Array.isArray(incomeList)) {
      const totalIncome = incomeList.reduce((sum, item) => sum + (item.value_monthly_brl ?? 0), 0);
      if (totalIncome > 0) setMonthlyIncome(totalIncome);
    }

    // --- Expenses: always rebuild from data collection ---
    const fixedExpenses = getValueByPath(dc, 'cash_flow.fixed_expenses') as Array<{ name: string; value_monthly_brl: number | null }> | undefined;
    const variableExpenses = getValueByPath(dc, 'cash_flow.variable_expenses') as Array<{ name: string; value_monthly_brl: number | null }> | undefined;

    const mapToItems = (list: Array<{ name: string; value_monthly_brl: number | null }> | undefined) =>
      (list ?? [])
        .filter(i => i.name && i.value_monthly_brl != null && i.value_monthly_brl > 0)
        .map(i => ({ id: generateId(), name: i.name, value: i.value_monthly_brl ?? 0 }));

    const expenseNameToCategory: Record<string, string> = {
      // Moradia
      'Aluguel': 'moradia', 'Condomínio': 'moradia', 'IPTU': 'moradia',
      'Financiamento Imobiliário': 'moradia', 'Energia Elétrica': 'moradia',
      'Água / Esgoto': 'moradia', 'Água': 'moradia', 'Gás': 'moradia',
      'Internet': 'moradia', 'Telefone / Celular': 'moradia', 'Telefone': 'moradia',
      'TV a Cabo / Streaming': 'moradia', 'Streaming (Netflix, Spotify, etc)': 'moradia',
      'Empregada / Diarista': 'moradia', 'Empregada/Diarista': 'moradia',
      'Babá': 'moradia', 'Seguro Residencial': 'moradia',
      'Manutenção da Casa': 'moradia', 'Móveis / Decoração': 'moradia',
      // Transporte
      'Combustível': 'transporte', 'Transporte': 'transporte',
      'Transporte (Uber/Táxi)': 'transporte', 'Transporte Público': 'transporte',
      'Financiamento de Veículo': 'transporte', 'Seguro do Carro': 'transporte',
      'Seguro Carro': 'transporte', 'IPVA': 'transporte', 'Licenciamento': 'transporte',
      'Manutenção do Carro': 'transporte', 'Estacionamento Mensal': 'transporte',
      'Transporte Escolar': 'transporte',
      // Alimentação
      'Supermercado': 'alimentacao', 'Alimentação': 'alimentacao',
      'Alimentação Fora de Casa': 'alimentacao', 'Feira / Hortifruti': 'alimentacao',
      'Delivery / Aplicativos de Comida': 'alimentacao',
      // Saúde
      'Plano de Saúde': 'saude', 'Plano Odontológico': 'saude',
      'Farmácia': 'saude', 'Consultas Médicas': 'saude',
      'Medicamentos Contínuos': 'saude', 'Terapia / Psicólogo': 'saude',
      // Educação
      'Escola / Faculdade': 'educacao', 'Escola/Faculdade': 'educacao',
      'Curso / Pós-graduação': 'educacao', 'Material Escolar': 'educacao',
      'Livros / Revistas': 'educacao',
      // Lazer
      'Lazer': 'lazer', 'Lazer / Entretenimento': 'lazer',
      'Viagens': 'lazer', 'Festas / Eventos': 'lazer',
      'Hobbies': 'lazer',
      // Pessoal
      'Academia': 'pessoal', 'Academia / Esporte': 'pessoal',
      'Vestuário': 'pessoal', 'Calçados': 'pessoal',
      'Cuidados Pessoais (salão, barbearia)': 'pessoal',
      'Cosméticos / Perfumaria': 'pessoal', 'Presentes': 'pessoal',
      'Assinaturas Diversas': 'pessoal', 'Eletrônicos / Tecnologia': 'pessoal',
      'Despesas com Pet': 'pessoal', 'Pet (ração/plano)': 'pessoal',
      'Doações / Caridade': 'pessoal',
      // Dívidas / Financeiro
      'Pensão Alimentícia': 'dividas', 'Pensão Alimentícia Paga': 'dividas',
      'Parcela de Empréstimo': 'dividas', 'Parcela de Cartão de Crédito': 'dividas',
      'Consórcio': 'dividas', 'Previdência Privada': 'dividas',
      'Seguro de Vida': 'dividas',
      'Dízimo / Contribuição Religiosa': 'outros',
      'Clube / Associação': 'outros',
      'Sindicato / Associação Profissional': 'outros',
    };

    const allExpenseItems = [...mapToItems(fixedExpenses), ...mapToItems(variableExpenses)];

    if (allExpenseItems.length > 0) {
      const updated = DEFAULT_CATEGORIES.map(c => ({ ...c, items: [] as BudgetItem[] }));
      for (const item of allExpenseItems) {
        const catId = expenseNameToCategory[item.name] || 'outros';
        const cat = updated.find(c => c.id === catId);
        if (cat) cat.items.push(item);
      }
      setCurrentBudget(updated);
    }
  }, [dataCollection]);

  const budget = activeTab === 'atual' ? currentBudget : suggestedBudget;
  const setBudget = activeTab === 'atual' ? setCurrentBudget : setSuggestedBudget;

  const totalExpenses = useMemo(() => budget.reduce((sum, cat) => sum + cat.items.reduce((s, i) => s + i.value, 0), 0), [budget]);
  const balance = monthlyIncome - totalExpenses;

  const currentTotal = useMemo(() => currentBudget.reduce((sum, cat) => sum + cat.items.reduce((s, i) => s + i.value, 0), 0), [currentBudget]);
  const suggestedTotal = useMemo(() => suggestedBudget.reduce((sum, cat) => sum + cat.items.reduce((s, i) => s + i.value, 0), 0), [suggestedBudget]);

  const handleAddItem = (categoryId: string) => {
    setBudget(prev => prev.map(cat =>
      cat.id === categoryId
        ? { ...cat, items: [...cat.items, { id: generateId(), name: '', value: 0 }] }
        : cat
    ));
  };

  const handleRemoveItem = (categoryId: string, itemId: string) => {
    setBudget(prev => prev.map(cat =>
      cat.id === categoryId
        ? { ...cat, items: cat.items.filter(i => i.id !== itemId) }
        : cat
    ));
  };

  const handleUpdateItem = (categoryId: string, itemId: string, field: 'name' | 'value', value: string | number) => {
    setBudget(prev => prev.map(cat =>
      cat.id === categoryId
        ? {
          ...cat,
          items: cat.items.map(i =>
            i.id === itemId ? { ...i, [field]: value } : i
          ),
        }
        : cat
    ));
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Orçamento
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monte o orçamento atual do cliente e crie uma sugestão otimizada.
        </p>
      </div>

      {/* Income */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Renda Mensal</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(monthlyIncome)}</p>
              </div>
            </div>
            <div className="w-48">
              <CurrencyInput value={monthlyIncome} onChange={(v) => setMonthlyIncome(v ?? 0)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'atual' | 'sugerido')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="atual" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Orçamento Atual
            </TabsTrigger>
            <TabsTrigger value="sugerido" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Orçamento Sugerido
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="atual" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentBudget.map((cat) => (
              <BudgetCategoryCard
                key={cat.id}
                category={cat}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
                onUpdateItem={handleUpdateItem}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sugerido" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedBudget.map((cat) => (
              <BudgetCategoryCard
                key={cat.id}
                category={cat}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
                onUpdateItem={handleUpdateItem}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn(
          'border-2',
          activeTab === 'atual' ? 'border-primary/30 bg-primary/5' : 'border-border/50'
        )}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Despesas (Atual)</p>
            <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(currentTotal)}</p>
            <p className={cn('text-sm mt-1', monthlyIncome - currentTotal >= 0 ? 'text-green-600' : 'text-destructive')}>
              Sobra: {formatCurrency(monthlyIncome - currentTotal)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
              <ArrowRightLeft className="h-3 w-3" />
              Comparação
            </p>
            <p className={cn(
              'text-xl font-bold mt-1',
              suggestedTotal - currentTotal <= 0 ? 'text-green-600' : 'text-destructive'
            )}>
              {suggestedTotal - currentTotal <= 0 ? '−' : '+'}{formatCurrency(Math.abs(suggestedTotal - currentTotal))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Diferença sugerido vs atual</p>
          </CardContent>
        </Card>

        <Card className={cn(
          'border-2',
          activeTab === 'sugerido' ? 'border-primary/30 bg-primary/5' : 'border-border/50'
        )}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Despesas (Sugerido)</p>
            <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(suggestedTotal)}</p>
            <p className={cn('text-sm mt-1', monthlyIncome - suggestedTotal >= 0 ? 'text-green-600' : 'text-destructive')}>
              Sobra: {formatCurrency(monthlyIncome - suggestedTotal)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
