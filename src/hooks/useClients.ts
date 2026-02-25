import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActingUser } from '@/contexts/ActingUserContext';
import { useToast } from '@/hooks/use-toast';
import type { ClientPlan, ClientPlanFormData, ClientMetrics } from '@/types/clients';
import { startOfMonth, endOfMonth, addMonths, format } from 'date-fns';

export function useClients(status?: ClientPlan['status'], ownerIds?: string[]) {
  const { user } = useAuth();
  const { actingUser, isImpersonating } = useActingUser();

  const targetUserId = isImpersonating && actingUser ? actingUser.id : null;

  return useQuery({
    queryKey: ['clients', targetUserId, status, ownerIds],
    queryFn: async () => {
      let query = supabase
        .from('client_plans')
        .select(`
          *,
          contact:contacts(id, full_name, phone, email, client_code),
          plan_meetings:client_plan_meetings(*)
        `)
        .order('created_at', { ascending: false });

      if (targetUserId) {
        query = query.eq('owner_id', targetUserId);
      } else if (ownerIds && ownerIds.length > 0) {
        query = query.in('owner_id', ownerIds);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar contagem de contratos ativos e dados de pagamento para cada cliente
      const contactIds = [...new Set(data?.map(p => p.contact_id) || [])];
      const ownerIdsSet = [...new Set(data?.map(p => p.owner_id) || [])];

      // Fetch owner names
      let ownerNameMap = new Map<string, string>();
      if (ownerIdsSet.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', ownerIdsSet);
        profiles?.forEach(p => ownerNameMap.set(p.user_id, p.full_name));
      }
      
      if (contactIds.length === 0) {
        return (data?.map(plan => ({
          ...plan,
          owner: { full_name: ownerNameMap.get(plan.owner_id) || '', email: '' },
        })) || []) as ClientPlan[];
      }

      const { data: contractsData, error: contractError } = await supabase
        .from('contracts')
        .select('contact_id, installments, vindi_status, custom_data')
        .eq('status', 'active')
        .in('contact_id', contactIds);

      if (contractError) throw contractError;

      // Contar contratos e extrair dados de pagamento por contact_id
      const countMap = new Map<string, number>();
      const paymentMap = new Map<string, { paidInstallments: number; totalInstallments: number; vindiStatus: string | null }>();
      
      contractsData?.forEach(c => {
        countMap.set(c.contact_id, (countMap.get(c.contact_id) || 0) + 1);
        
        if (!paymentMap.has(c.contact_id)) {
          const customData = c.custom_data as Record<string, unknown> | null;
          const paidInstallments = (customData?.paid_installments as number) || 0;
          paymentMap.set(c.contact_id, {
            paidInstallments,
            totalInstallments: c.installments || 1,
            vindiStatus: c.vindi_status || null,
          });
        }
      });

      const plansWithData = data?.map(plan => ({
        ...plan,
        owner: { full_name: ownerNameMap.get(plan.owner_id) || '', email: '' },
        productCount: countMap.get(plan.contact_id) || 0,
        paymentProgress: paymentMap.get(plan.contact_id) || null,
      })) || [];

      return plansWithData as ClientPlan[];
    },
    enabled: !!user,
  });
}

// Hook para buscar contatos elegíveis para cliente (com contrato PF ativo, sem plano ativo)
export function useEligibleContactsForClient() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['eligible-contacts-for-client'],
    queryFn: async () => {
      // Buscar contratos de Planejamento Financeiro (pelo nome do produto ou funil de origem)
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          contact_id,
          contract_value,
          product:products!inner(id, name),
          contact:contacts(id, full_name, phone, email)
        `)
        .eq('status', 'active')
        .ilike('product.name', '%Planejamento%');

      if (contractsError) throw contractsError;

      // Buscar planos de cliente ativos
      const { data: existingPlans, error: plansError } = await supabase
        .from('client_plans')
        .select('contact_id, contract_id')
        .eq('status', 'active');

      if (plansError) throw plansError;

      const existingPlanContactIds = new Set(existingPlans?.map(p => p.contact_id) || []);
      const usedContractIds = new Set(existingPlans?.map(p => p.contract_id).filter(Boolean) || []);

      // Filtrar contratos que ainda não têm plano vinculado
      const eligibleContracts = contracts?.filter(c => 
        !existingPlanContactIds.has(c.contact_id) && !usedContractIds.has(c.id)
      ) || [];

      return eligibleContracts;
    },
    enabled: !!user,
  });
}

export function useClientPlan(planId: string) {
  return useQuery({
    queryKey: ['client-plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_plans')
        .select(`
          *,
          contact:contacts(id, full_name, phone, email, client_code),
          plan_meetings:client_plan_meetings(*)
        `)
        .eq('id', planId)
        .maybeSingle();

      if (error) throw error;
      return data as ClientPlan | null;
    },
    enabled: !!planId,
  });
}

// Categorias de crédito para agrupar
const CREDIT_CATEGORIES = [
  'Home Equity',
  'Financiamento Imobiliário',
  'Financiamento Auto',
  'Carta Contemplada Auto',
  'Carta Contemplada Imobiliário',
  'Crédito com Colateral XP',
  'Consórcio',
];

export function useClientMetrics(plannerIds?: string[]) {
  const { user } = useAuth();
  const { actingUser, isImpersonating } = useActingUser();
  const { role } = useAuth();

  // For leaders: show all clients (no filter). For planners or impersonating: filter by target user.
  const isLeaderOrAbove = role && ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role);
  const targetUserId = isImpersonating && actingUser ? actingUser.id : (!isLeaderOrAbove ? user?.id : null);

  // If specific plannerIds are selected, use those instead of targetUserId
  const effectivePlannerIds = plannerIds && plannerIds.length > 0 ? plannerIds : null;

  return useQuery({
    queryKey: ['client-metrics', targetUserId, isLeaderOrAbove, effectivePlannerIds],
    queryFn: async () => {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      // Get active clients count and total portfolio value
      let plansQuery = supabase
        .from('client_plans')
        .select('id, contract_value, owner_id')
        .eq('status', 'active');

      if (effectivePlannerIds) {
        plansQuery = plansQuery.in('owner_id', effectivePlannerIds);
      } else if (targetUserId) {
        plansQuery = plansQuery.eq('owner_id', targetUserId);
      }

      const { data: plans, error: plansError } = await plansQuery;
      if (plansError) throw plansError;

      const activeClients = plans?.length || 0;
      const totalPortfolioValue = plans?.reduce((sum, p) => sum + Number(p.contract_value), 0) || 0;

      // Get plan IDs for meetings query
      const planIds = plans?.map(p => p.id) || [];

      // Buscar contratos ativos com categoria do produto
      let contractsQuery = supabase
        .from('contracts')
        .select(`
          id,
          contract_value,
          owner_id,
          product:products(
            id,
            name,
            category:product_categories(id, name)
          )
        `)
        .eq('status', 'active');

      if (effectivePlannerIds) {
        contractsQuery = contractsQuery.in('owner_id', effectivePlannerIds);
      } else if (targetUserId) {
        contractsQuery = contractsQuery.eq('owner_id', targetUserId);
      }

      const { data: contracts, error: contractsError } = await contractsQuery;
      if (contractsError) throw contractsError;

      // Calcular valores por categoria
      let activePlanejamentoValue = 0;
      let activeSeguroValue = 0;
      let investimentosValue = 0;
      let creditoRealizadoValue = 0;

      contracts?.forEach(contract => {
        const categoryName = (contract.product as any)?.category?.name || '';
        const productName = (contract.product as any)?.name || '';
        const value = Number(contract.contract_value) || 0;

        // Planejamento Financeiro
        if (categoryName.toLowerCase().includes('planejamento') || 
            productName.toLowerCase().includes('planejamento financeiro')) {
          activePlanejamentoValue += value;
        }
        // Seguro de Vida
        else if (categoryName.toLowerCase().includes('seguro') || 
                 productName.toLowerCase().includes('seguro')) {
          activeSeguroValue += value;
        }
        // Investimentos (Prunus ou categoria Investimentos)
        else if (categoryName.toLowerCase().includes('investimento') || 
                 categoryName.toLowerCase().includes('prunus') ||
                 productName.toLowerCase().includes('prunus') ||
                 productName.toLowerCase().includes('investimento')) {
          investimentosValue += value;
        }
        // Crédito (várias categorias)
        else if (CREDIT_CATEGORIES.some(cat => 
          categoryName.toLowerCase().includes(cat.toLowerCase()) ||
          productName.toLowerCase().includes(cat.toLowerCase())
        )) {
          creditoRealizadoValue += value;
        }
      });

      // Buscar oportunidades ganhas do funil PRUNUS para investimentos
      let wonQuery = supabase
        .from('opportunities')
        .select(`
          id,
          proposal_value,
          current_funnel:funnels!opportunities_current_funnel_id_fkey(id, name),
          contact:contacts!opportunities_contact_id_fkey(owner_id)
        `)
        .eq('status', 'won');

      const { data: wonOpportunities, error: wonError } = await wonQuery;

      if (!wonError && wonOpportunities) {
        wonOpportunities.forEach(opp => {
          const funnelName = (opp.current_funnel as any)?.name || '';
          const contactOwnerId = (opp.contact as any)?.owner_id;
          // Filter by owner if needed (planejador sees only their own, or planner filter active)
          if (effectivePlannerIds && !effectivePlannerIds.includes(contactOwnerId)) return;
          if (!effectivePlannerIds && targetUserId && contactOwnerId !== targetUserId) return;
          if (funnelName.toLowerCase().includes('prunus') && opp.proposal_value) {
            investimentosValue += Number(opp.proposal_value);
          }
        });
      }

      if (planIds.length === 0) {
        return {
          activeClients: 0,
          meetingsCompletedThisMonth: 0,
          meetingsPendingThisMonth: 0,
          totalPortfolioValue: 0,
          activePlanejamentoValue,
          activeSeguroValue,
          investimentosValue,
          creditoRealizadoValue,
        } as ClientMetrics;
      }

      // Get meetings completed this month
      const { count: completedCount, error: completedError } = await supabase
        .from('client_plan_meetings')
        .select('*', { count: 'exact', head: true })
        .in('plan_id', planIds)
        .eq('status', 'completed')
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', monthEnd);

      if (completedError) throw completedError;

      // Get meetings pending this month (pending or scheduled)
      const { count: pendingCount, error: pendingError } = await supabase
        .from('client_plan_meetings')
        .select('*', { count: 'exact', head: true })
        .in('plan_id', planIds)
        .in('status', ['pending', 'scheduled'])
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', monthEnd);

      if (pendingError) throw pendingError;

      return {
        activeClients,
        meetingsCompletedThisMonth: completedCount || 0,
        meetingsPendingThisMonth: pendingCount || 0,
        totalPortfolioValue,
        activePlanejamentoValue,
        activeSeguroValue,
        investimentosValue,
        creditoRealizadoValue,
      } as ClientMetrics;
    },
    enabled: !!user,
  });
}

export function useCreateClientPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: ClientPlanFormData & { contract_id?: string }) => {
      const endDate = format(addMonths(new Date(data.start_date), 12), 'yyyy-MM-dd');

      // Create the plan
      const { data: plan, error: planError } = await supabase
        .from('client_plans')
        .insert({
          contact_id: data.contact_id,
          owner_id: user?.id,
          contract_value: data.contract_value,
          total_meetings: data.total_meetings,
          start_date: data.start_date,
          end_date: endDate,
          notes: data.notes || null,
          created_by: user?.id,
          contract_id: data.contract_id || null,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create all plan meetings
      const meetingsToInsert = data.meetings.map(m => ({
        plan_id: plan.id,
        meeting_number: m.meeting_number,
        theme: m.theme,
        scheduled_date: m.scheduled_date,
      }));

      const { error: meetingsError } = await supabase
        .from('client_plan_meetings')
        .insert(meetingsToInsert);

      if (meetingsError) throw meetingsError;

      // Update contact with client_code if not already set
      const { data: contact } = await supabase
        .from('contacts')
        .select('client_code')
        .eq('id', data.contact_id)
        .single();

      if (!contact?.client_code) {
        await supabase
          .from('contacts')
          .update({ client_code: `C${Date.now().toString().slice(-6)}` })
          .eq('id', data.contact_id);
      }

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['eligible-contacts-for-client'] });
      toast({ title: 'Cliente cadastrado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cadastrar cliente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateClientPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ planId, data }: { planId: string; data: Partial<ClientPlan> }) => {
      const { error } = await supabase
        .from('client_plans')
        .update(data)
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-plan'] });
      queryClient.invalidateQueries({ queryKey: ['client-metrics'] });
      toast({ title: 'Planejamento atualizado!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar planejamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook para buscar clientes inadimplentes
export function useDelinquentClients(plannerIds?: string[]) {
  const { user } = useAuth();
  const { actingUser, isImpersonating } = useActingUser();
  const { role } = useAuth();

  // Same logic as useClientMetrics: leaders see all, planners see only their own
  const isLeaderOrAbove = role && ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role);
  const targetUserId = isImpersonating && actingUser ? actingUser.id : (!isLeaderOrAbove ? user?.id : null);

  const effectivePlannerIds = plannerIds && plannerIds.length > 0 ? plannerIds : null;

  return useQuery({
    queryKey: ['delinquent-clients', targetUserId, isLeaderOrAbove, effectivePlannerIds],
    queryFn: async () => {
      // Buscar contratos com vindi_status = 'overdue' ou similar
      let query = supabase
        .from('contracts')
        .select(`
          id,
          contact_id,
          installment_value,
          installments,
          vindi_status,
          billing_date,
          custom_data,
          contact:contacts(id, full_name)
        `)
        .eq('status', 'active')
        .in('vindi_status', ['overdue', 'pending']);

      if (effectivePlannerIds) {
        query = query.in('owner_id', effectivePlannerIds);
      } else if (targetUserId) {
        query = query.eq('owner_id', targetUserId);
      }

      const { data: contracts, error } = await query;
      if (error) throw error;

      // Buscar planos de cliente para mapear contact_id para client plan id
      let plansQuery = supabase
        .from('client_plans')
        .select('id, contact_id')
        .eq('status', 'active');

      if (effectivePlannerIds) {
        plansQuery = plansQuery.in('owner_id', effectivePlannerIds);
      } else if (targetUserId) {
        plansQuery = plansQuery.eq('owner_id', targetUserId);
      }

      const { data: plans, error: plansError } = await plansQuery;
      if (plansError) throw plansError;

      const planByContact = new Map(plans?.map(p => [p.contact_id, p.id]) || []);

      // Filtrar apenas contratos com atraso (vindi_status = 'overdue')
      const delinquentContracts = contracts?.filter(c => c.vindi_status === 'overdue') || [];

      if (delinquentContracts.length === 0) return [];

      // Buscar dados reais de pagamento da Vindi para cada contato inadimplente
      const uniqueContactIds = [...new Set(delinquentContracts.map(c => c.contact_id))];
      
      const paymentResults = await Promise.allSettled(
        uniqueContactIds.map(contactId =>
          supabase.functions.invoke('get-vindi-payments', { body: { contactId } })
            .then(res => ({ contactId, data: res.data }))
        )
      );

      const paymentsByContact = new Map<string, { overdueCount: number; overdueAmount: number; lastDueDate: string }>();
      paymentResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.data) {
          const { contactId, data } = result.value;
          const overdueInstallments = data.installments?.filter((i: any) => i.status === 'overdue') || [];
          const overdueAmount = overdueInstallments.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
          const lastDueDate = overdueInstallments.length > 0 
            ? overdueInstallments[overdueInstallments.length - 1].dueDate || ''
            : '';
          paymentsByContact.set(contactId, {
            overdueCount: overdueInstallments.length,
            overdueAmount,
            lastDueDate,
          });
        }
      });

      // Agrupar por contato
      const clientsMap = new Map<string, {
        clientId: string;
        clientName: string;
        contactId: string;
        overdueInstallments: number;
        overdueAmount: number;
        lastDueDate: string;
      }>();

      delinquentContracts.forEach(contract => {
        const contactId = contract.contact_id;
        const clientId = planByContact.get(contactId) || contactId;
        const clientName = (contract.contact as any)?.full_name || 'Cliente';
        
        const vindiData = paymentsByContact.get(contactId);
        const overdueInstallments = vindiData?.overdueCount || 1;
        const overdueAmount = vindiData?.overdueAmount || 0;
        const lastDueDate = vindiData?.lastDueDate || contract.billing_date || '';

        const existing = clientsMap.get(contactId);
        if (existing) {
          // Already added from another contract for same contact, skip duplicate
        } else {
          clientsMap.set(contactId, {
            clientId,
            clientName,
            contactId,
            overdueInstallments,
            overdueAmount,
            lastDueDate,
          });
        }
      });

      return Array.from(clientsMap.values());
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
