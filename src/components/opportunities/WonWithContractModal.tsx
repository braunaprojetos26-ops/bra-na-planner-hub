import { useState, useMemo } from 'react';
import { PartyPopper, Plus, Trash2, Calculator, Package, Users } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProducts } from '@/hooks/useProducts';
import { useFunnelSuggestedProducts } from '@/hooks/useFunnelProducts';
import { useCreateContract } from '@/hooks/useContracts';
import { useMarkOpportunityWon } from '@/hooks/useOpportunities';
import { useCreateClientPlan } from '@/hooks/useClients';
import {
  CONTRACT_VARIABLES,
  calculatePBsWithFormula,
  type ContractVariableKey,
} from '@/lib/pbFormulaParser';
import type { Opportunity } from '@/types/opportunities';
import type { Product, ContractFormData, PaymentType } from '@/types/contracts';
import type { Funnel, FunnelStage } from '@/types/contacts';
import type { ClientPlanFormData } from '@/types/clients';

interface ContractEntry {
  id: string;
  product_id: string;
  product?: Product;
  contract_value: number;
  payment_type: PaymentType | '';
  installments?: number;
  notes?: string;
  calculated_pbs: number;
  // Dynamic variable values
  variable_values: Partial<Record<ContractVariableKey, number>>;
}

interface WonWithContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity;
  nextFunnel: Funnel | null;
  nextStage: FunnelStage | null;
  onSuccess?: () => void;
}

export function WonWithContractModal({
  open,
  onOpenChange,
  opportunity,
  nextFunnel,
  nextStage,
  onSuccess,
}: WonWithContractModalProps) {
  const [step, setStep] = useState<'ask' | 'contracts' | 'client_plan'>('ask');
  const [contracts, setContracts] = useState<ContractEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdContracts, setCreatedContracts] = useState<Array<{ id: string; product_name: string; is_planning: boolean; contact_id: string; contract_value: number }>>([]);
  const [clientPlanConfig, setClientPlanConfig] = useState<{ total_meetings: '4' | '6' | '9' | '12'; start_date: Date }>({
    total_meetings: '12',
    start_date: new Date(),
  });

  const { data: allProducts } = useProducts();
  const { data: suggestedProducts } = useFunnelSuggestedProducts(opportunity.current_funnel_id);
  const createContract = useCreateContract();
  const markWon = useMarkOpportunityWon();
  const createClientPlan = useCreateClientPlan();

  const funnelGeneratesContract = opportunity.current_funnel?.generates_contract ?? false;
  const promptText = opportunity.current_funnel?.contract_prompt_text || 'Essa negociação gerou algum contrato?';

  // Sort products: suggested first, then others
  const sortedProducts = useMemo(() => {
    if (!allProducts) return [];
    
    const suggestedIds = new Set(suggestedProducts?.map((sp) => sp.product_id) || []);
    const suggested = allProducts.filter((p) => suggestedIds.has(p.id));
    const others = allProducts.filter((p) => !suggestedIds.has(p.id));
    
    return [...suggested, ...others];
  }, [allProducts, suggestedProducts]);

  const suggestedProductIds = useMemo(
    () => new Set(suggestedProducts?.map((sp) => sp.product_id) || []),
    [suggestedProducts]
  );

  const totalPbs = useMemo(
    () => contracts.reduce((sum, c) => sum + c.calculated_pbs, 0),
    [contracts]
  );

  const totalValue = useMemo(
    () => contracts.reduce((sum, c) => sum + c.contract_value, 0),
    [contracts]
  );

  const recalculatePBs = (contract: ContractEntry): number => {
    if (!contract.product) return 0;
    
    // Use new formula system if available
    if (contract.product.pb_formula) {
      return calculatePBsWithFormula(
        contract.product.pb_formula,
        contract.variable_values,
        contract.product.pb_constants || {}
      );
    }
    
    // Legacy calculation
    if (contract.product.pb_calculation_type === 'fixed') {
      return contract.product.pb_value;
    }
    return contract.contract_value * contract.product.pb_value;
  };

  const handleAddContract = () => {
    setContracts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: '',
        contract_value: 0,
        payment_type: '',
        calculated_pbs: 0,
        variable_values: {},
      },
    ]);
  };

  const handleRemoveContract = (id: string) => {
    setContracts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleContractChange = (id: string, field: keyof ContractEntry, value: unknown) => {
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;

        const updated = { ...c, [field]: value };

        // Recalculate PBs when product changes
        if (field === 'product_id') {
          const product = allProducts?.find((p) => p.id === value);
          updated.product = product;
          updated.variable_values = {};
          updated.calculated_pbs = 0;
        }

        // Recalculate when contract_value changes (for legacy products without formula)
        if (field === 'contract_value' && updated.product && !updated.product.pb_formula) {
          updated.calculated_pbs = recalculatePBs(updated);
        }

        return updated;
      })
    );
  };

  const handleVariableChange = (contractId: string, variable: ContractVariableKey, value: number) => {
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id !== contractId) return c;

        const updated = {
          ...c,
          variable_values: { ...c.variable_values, [variable]: value },
        };
        
        // Also update contract_value to match valor_total if that's the variable
        if (variable === 'valor_total') {
          updated.contract_value = value;
        }
        
        updated.calculated_pbs = recalculatePBs(updated);
        return updated;
      })
    );
  };

  const handleMarkWonWithoutContract = async () => {
    setIsSubmitting(true);
    try {
      await markWon.mutateAsync({
        opportunityId: opportunity.id,
        fromStageId: opportunity.current_stage_id,
        nextFunnelId: nextFunnel?.id,
        nextStageId: nextStage?.id,
      });
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitWithContracts = async () => {
    const validContracts = contracts.filter((c) => c.product_id && c.calculated_pbs > 0);
    if (validContracts.length === 0) {
      await handleMarkWonWithoutContract();
      return;
    }

    setIsSubmitting(true);
    try {
      // First mark as won
      await markWon.mutateAsync({
        opportunityId: opportunity.id,
        fromStageId: opportunity.current_stage_id,
        nextFunnelId: nextFunnel?.id,
        nextStageId: nextStage?.id,
      });

      // Then create all contracts and track which are planning contracts
      const createdContractsList: Array<{ id: string; product_name: string; is_planning: boolean; contact_id: string; contract_value: number }> = [];
      
      for (const contract of validContracts) {
        if (!contract.product) continue;

        // Calculate contract_value from variable_values if not directly set
        const contractValue = contract.contract_value || 
          contract.variable_values.valor_total ||
          contract.variable_values.valor_mensal ||
          contract.variable_values.credito ||
          contract.variable_values.premio_mensal ||
          contract.variable_values.valor_investido ||
          0;

        const data: ContractFormData = {
          product_id: contract.product_id,
          contract_value: contractValue,
          payment_type: contract.payment_type || undefined,
          installments: contract.installments,
          notes: contract.notes,
          custom_data: contract.variable_values as Record<string, unknown>,
        };

        const result = await createContract.mutateAsync({
          contactId: opportunity.contact_id,
          opportunityId: opportunity.id,
          product: contract.product,
          data,
          calculatedPbs: contract.calculated_pbs,
        });

        // Check if this is a planning product (by name containing "Planejamento")
        const isPlanningProduct = contract.product.name.toLowerCase().includes('planejamento');
        createdContractsList.push({
          id: result.id,
          product_name: contract.product.name,
          is_planning: isPlanningProduct,
          contact_id: opportunity.contact_id,
          contract_value: contractValue,
        });
      }

      // Check if any contract is a planning product
      const planningContracts = createdContractsList.filter(c => c.is_planning);
      
      if (planningContracts.length > 0) {
        // Show client plan configuration step
        setCreatedContracts(createdContractsList);
        setStep('client_plan');
        setIsSubmitting(false);
      } else {
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      setIsSubmitting(false);
      throw error;
    }
  };

  const handleCreateClientPlan = async () => {
    const planningContract = createdContracts.find(c => c.is_planning);
    if (!planningContract) return;

    setIsSubmitting(true);
    try {
      const count = parseInt(clientPlanConfig.total_meetings);
      const monthInterval = Math.floor(12 / count);
      
      const meetings = Array.from({ length: count }, (_, i) => ({
        meeting_number: i + 1,
        theme: `Reunião ${i + 1}`,
        scheduled_date: format(addMonths(clientPlanConfig.start_date, i * monthInterval), 'yyyy-MM-dd'),
      }));

      const formData: ClientPlanFormData & { contract_id: string } = {
        contact_id: planningContract.contact_id,
        contract_value: planningContract.contract_value,
        total_meetings: count as 4 | 6 | 9 | 12,
        start_date: format(clientPlanConfig.start_date, 'yyyy-MM-dd'),
        meetings,
        contract_id: planningContract.id,
      };

      await createClientPlan.mutateAsync(formData);
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipClientPlan = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // If funnel doesn't generate contracts, just mark as won directly
  if (!funnelGeneratesContract) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-green-500" />
              Confirmar Venda
            </DialogTitle>
            <DialogDescription>
              {nextFunnel 
                ? `A oportunidade será marcada como ganha e uma nova será criada no funil "${nextFunnel.name}".`
                : 'A oportunidade será marcada como ganha.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMarkWonWithoutContract} disabled={isSubmitting}>
              {isSubmitting ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 1: Ask if contract was generated
  if (step === 'ask') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-green-500" />
              Oportunidade Ganha!
            </DialogTitle>
            <DialogDescription>{promptText}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleMarkWonWithoutContract}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Processando...' : 'Não, apenas avançar'}
            </Button>
            <Button
              onClick={() => {
                setStep('contracts');
                if (contracts.length === 0) handleAddContract();
              }}
              className="flex-1"
            >
              Sim, reportar contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: Contract form
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Reportar Contratos
          </DialogTitle>
          <DialogDescription>
            Adicione os contratos gerados nessa negociação. Você pode adicionar múltiplos contratos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {contracts.map((contract, index) => (
              <div key={contract.id} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Contrato {index + 1}</span>
                  {contracts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveContract(contract.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">Produto *</Label>
                    <Select
                      value={contract.product_id}
                      onValueChange={(v) => handleContractChange(contract.id, 'product_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex items-center gap-2">
                              {product.name}
                              {suggestedProductIds.has(product.id) && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  Sugerido
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {contract.product?.category?.name && (
                      <p className="text-[10px] text-muted-foreground">
                        Categoria: {contract.product.category.name}
                        {contract.product.partner_name && ` • Parceiro: ${contract.product.partner_name}`}
                      </p>
                    )}
                  </div>

                  {/* Dynamic Variable Fields */}
                  {contract.product && contract.product.pb_formula && contract.product.pb_variables.length > 0 && (
                    <>
                      {contract.product.pb_variables.map((variable) => (
                        <div key={variable} className="space-y-1.5">
                          <Label className="text-xs">{CONTRACT_VARIABLES[variable].label} *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={contract.variable_values[variable] || ''}
                            onChange={(e) =>
                              handleVariableChange(contract.id, variable, parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      ))}
                    </>
                  )}

                  {/* Legacy: Show contract value field if no formula */}
                  {contract.product && !contract.product.pb_formula && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor do Contrato *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={contract.contract_value || ''}
                        onChange={(e) =>
                          handleContractChange(contract.id, 'contract_value', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  )}

                  {contract.product?.requires_payment_type && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Forma de Pagamento</Label>
                      <Select
                        value={contract.payment_type}
                        onValueChange={(v) => handleContractChange(contract.id, 'payment_type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="avista">À vista</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                          <SelectItem value="parcelado">Parcelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {contract.payment_type === 'parcelado' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Número de Parcelas</Label>
                      <Input
                        type="number"
                        min="2"
                        placeholder="12"
                        value={contract.installments || ''}
                        onChange={(e) =>
                          handleContractChange(contract.id, 'installments', parseInt(e.target.value) || undefined)
                        }
                      />
                    </div>
                  )}
                </div>

                {/* PB Calculation Preview */}
                {contract.product && contract.calculated_pbs > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                    <Calculator className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      Este contrato = <strong>{contract.calculated_pbs.toFixed(2)} PBs</strong>
                    </span>
                    {contract.product.pb_formula && (
                      <span className="text-xs text-muted-foreground ml-auto font-mono">
                        {contract.product.pb_formula.length > 25
                          ? contract.product.pb_formula.substring(0, 25) + '...'
                          : contract.product.pb_formula}
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    placeholder="Observações sobre o contrato..."
                    rows={2}
                    value={contract.notes || ''}
                    onChange={(e) => handleContractChange(contract.id, 'notes', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={handleAddContract} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Adicionar outro contrato
            </Button>
          </div>
        </ScrollArea>

        <Separator />

        {/* Totals */}
        <div className="flex items-center justify-between px-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Total:</span>{' '}
            <strong>{formatCurrency(totalValue)}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {totalPbs.toFixed(2)} PBs
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setStep('ask')}>
            Voltar
          </Button>
          <Button onClick={handleSubmitWithContracts} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar e Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Step 3: Client plan configuration (only shown if a planning product was sold)
  if (step === 'client_plan') {
    const planningContract = createdContracts.find(c => c.is_planning);
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Configurar Cliente de Planejamento
            </DialogTitle>
            <DialogDescription>
              Foi identificado um contrato de Planejamento Financeiro. Deseja configurar o cronograma de reuniões agora?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <p className="font-medium">Contrato: {planningContract?.product_name}</p>
                <p className="text-sm text-muted-foreground">
                  Valor: {formatCurrency(planningContract?.contract_value || 0)}
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Número de Reuniões</Label>
                <RadioGroup
                  value={clientPlanConfig.total_meetings}
                  onValueChange={(v) => setClientPlanConfig(prev => ({ ...prev, total_meetings: v as '4' | '6' | '9' | '12' }))}
                  className="flex gap-4"
                >
                  {['4', '6', '9', '12'].map((num) => (
                    <div key={num} className="flex items-center space-x-2">
                      <RadioGroupItem value={num} id={`plan-meetings-${num}`} />
                      <Label htmlFor={`plan-meetings-${num}`}>{num}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={format(clientPlanConfig.start_date, 'yyyy-MM-dd')}
                  onChange={(e) => setClientPlanConfig(prev => ({ ...prev, start_date: new Date(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground">
                  As reuniões serão distribuídas ao longo de 12 meses
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleSkipClientPlan}
              disabled={isSubmitting}
              className="flex-1"
            >
              Configurar depois
            </Button>
            <Button
              onClick={handleCreateClientPlan}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
