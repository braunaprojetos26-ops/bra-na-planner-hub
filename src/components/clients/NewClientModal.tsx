import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Info, AlertCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useEligibleContactsForClient, useCreateClientPlan } from '@/hooks/useClients';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ClientPlanFormData } from '@/types/clients';

const formSchema = z.object({
  contract_id: z.string().min(1, 'Selecione um contrato'),
  total_meetings: z.enum(['4', '6', '9', '12']),
  start_date: z.date({ required_error: 'Data de início obrigatória' }),
});

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewClientModal({ open, onOpenChange }: NewClientModalProps) {
  const [openContractSelect, setOpenContractSelect] = useState(false);
  const { data: eligibleContracts, isLoading: isLoadingContracts } = useEligibleContactsForClient();
  const createClient = useCreateClientPlan();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contract_id: '',
      total_meetings: '12',
      start_date: new Date(),
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        contract_id: '',
        total_meetings: '12',
        start_date: new Date(),
      });
    }
  }, [open, form]);

  const totalMeetings = form.watch('total_meetings');
  const startDate = form.watch('start_date');
  const selectedContractId = form.watch('contract_id');

  const selectedContract = eligibleContracts?.find(c => c.id === selectedContractId);

  // Generate placeholder meetings automatically
  const generateMeetings = (count: number, startDate: Date) => {
    const monthInterval = Math.floor(12 / count);
    
    return Array.from({ length: count }, (_, i) => ({
      meeting_number: i + 1,
      theme: `Reunião ${i + 1}`,
      scheduled_date: format(addMonths(startDate, i * monthInterval), 'yyyy-MM-dd'),
    }));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedContract) return;

    const count = parseInt(values.total_meetings);
    const meetings = generateMeetings(count, values.start_date);

    const formData: ClientPlanFormData & { contract_id: string } = {
      contact_id: selectedContract.contact_id,
      contract_value: selectedContract.contract_value,
      total_meetings: count as 4 | 6 | 9 | 12,
      start_date: format(values.start_date, 'yyyy-MM-dd'),
      meetings,
      contract_id: selectedContract.id,
    };

    await createClient.mutateAsync(formData);
    form.reset();
    onOpenChange(false);
  };

  // Preview of auto-generated meetings
  const previewMeetings = generateMeetings(
    parseInt(totalMeetings),
    startDate || new Date()
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const hasNoEligibleContracts = !isLoadingContracts && (!eligibleContracts || eligibleContracts.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          <DialogDescription>
            Cadastre um novo cliente de planejamento financeiro. As reuniões serão criadas automaticamente e você poderá editar os temas e datas posteriormente.
          </DialogDescription>
        </DialogHeader>

        {hasNoEligibleContracts ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Nenhum contrato elegível encontrado</p>
              <p className="text-sm">
                Para cadastrar um cliente, primeiro finalize uma venda de Planejamento Financeiro no Pipeline. 
                O contrato precisa estar ativo e ainda não vinculado a um cliente.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Contract Selection */}
              <FormField
                control={form.control}
                name="contract_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Selecionar Contrato de Planejamento *</FormLabel>
                    <Popover open={openContractSelect} onOpenChange={setOpenContractSelect}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'justify-between',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedContract?.contact?.full_name || 'Buscar contrato...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar por nome do contato..." />
                          <CommandList>
                            <CommandEmpty>Nenhum contrato encontrado.</CommandEmpty>
                            <CommandGroup>
                              {eligibleContracts?.map((contract) => (
                                <CommandItem
                                  key={contract.id}
                                  value={contract.contact?.full_name || ''}
                                  onSelect={() => {
                                    field.onChange(contract.id);
                                    setOpenContractSelect(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      contract.id === field.value ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <div className="flex-1">
                                    <p>{contract.contact?.full_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {contract.product?.name} • {formatCurrency(contract.contract_value)}
                                    </p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Apenas contratos de Planejamento Financeiro ativos e sem plano vinculado
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contract Value (Read-only) */}
              {selectedContract && (
                <FormItem>
                  <FormLabel>Valor do Contrato</FormLabel>
                  <FormControl>
                    <Input
                      value={formatCurrency(selectedContract.contract_value)}
                      disabled
                      className="bg-muted"
                    />
                  </FormControl>
                  <FormDescription>
                    Valor do contrato reportado na venda (não editável)
                  </FormDescription>
                </FormItem>
              )}

              {/* Number of Meetings */}
              <FormField
                control={form.control}
                name="total_meetings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Reuniões *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                      >
                        {['4', '6', '9', '12'].map((num) => (
                          <div key={num} className="flex items-center space-x-2">
                            <RadioGroupItem value={num} id={`meetings-${num}`} />
                            <Label htmlFor={`meetings-${num}`}>{num}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date */}
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Início *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value
                              ? format(field.value, 'dd/MM/yyyy')
                              : 'Selecione uma data'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      A primeira reunião será marcada para esta data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preview of auto-generated meetings */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Reuniões serão criadas automaticamente:</p>
                  <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {previewMeetings.slice(0, 4).map((m) => (
                      <div key={m.meeting_number} className="flex justify-between">
                        <span>{m.theme}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(m.scheduled_date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    ))}
                    {previewMeetings.length > 4 && (
                      <p className="text-muted-foreground italic">
                        +{previewMeetings.length - 4} reuniões...
                      </p>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Você poderá editar os temas e datas depois.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createClient.isPending || !selectedContract}>
                  {createClient.isPending ? 'Cadastrando...' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}