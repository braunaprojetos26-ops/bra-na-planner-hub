import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addMonths } from 'date-fns';
import { CalendarIcon, FileText, CreditCard, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useContractIntegration, ContractIntegrationData } from '@/hooks/useContractIntegration';
import { useProducts } from '@/hooks/useProducts';
import { useContact } from '@/hooks/useContacts';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  planType: z.enum(['novo_planejamento', 'planejamento_pontual'], {
    required_error: 'Selecione o tipo de plano',
  }),
  planValue: z.number().min(1, 'Valor deve ser maior que zero'),
  paymentMethod: z.enum(['pix', 'recorrente', 'parcelado'], {
    required_error: 'Selecione a forma de pagamento',
  }),
  installments: z.number().optional(),
  startDate: z.date({ required_error: 'Selecione a data de início' }),
  endDate: z.date({ required_error: 'Selecione a data de fim' }),
  meetingCount: z.number().min(1, 'Mínimo de 1 reunião'),
});

type FormData = z.infer<typeof formSchema>;

interface ContractingFormProps {
  contactId: string;
}

export function ContractingForm({ contactId }: ContractingFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    clicksignOk: boolean;
    vindiOk: boolean;
  } | null>(null);

  const { data: contact } = useContact(contactId);
  const { data: products } = useProducts();
  const contractIntegration = useContractIntegration();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      planType: 'novo_planejamento',
      planValue: 0,
      paymentMethod: 'pix',
      installments: 1,
      startDate: new Date(),
      endDate: addMonths(new Date(), 12),
      meetingCount: 12,
    },
  });

  const watchPaymentMethod = form.watch('paymentMethod');
  const watchStartDate = form.watch('startDate');

  // Auto-update end date based on meeting count and frequency
  useEffect(() => {
    const meetingCount = form.getValues('meetingCount');
    if (watchStartDate && meetingCount > 0) {
      form.setValue('endDate', addMonths(watchStartDate, meetingCount));
    }
  }, [watchStartDate, form]);

  // Find the product ID based on plan type
  const getProductId = (planType: string): string => {
    if (!products) return '';
    
    const productName = planType === 'novo_planejamento' 
      ? 'Novo Planejamento Financeiro'
      : 'Planejamento Financeiro Pontual';
    
    const product = products.find(p => 
      p.name.toLowerCase().includes(productName.toLowerCase()) ||
      productName.toLowerCase().includes(p.name.toLowerCase())
    );
    
    return product?.id || products[0]?.id || '';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const numericValue = parseInt(value, 10) / 100 || 0;
    form.setValue('planValue', numericValue);
  };

  const onSubmit = async (data: FormData) => {
    if (!contact?.email) {
      form.setError('root', {
        message: 'O contato precisa ter um email cadastrado para receber o contrato e a cobrança.',
      });
      return;
    }

    const productId = getProductId(data.planType);
    if (!productId) {
      form.setError('root', {
        message: 'Produto não encontrado. Configure os produtos no sistema.',
      });
      return;
    }

    const integrationData: ContractIntegrationData = {
      contactId,
      planType: data.planType,
      planValue: data.planValue,
      paymentMethod: data.paymentMethod,
      installments: data.paymentMethod === 'parcelado' ? data.installments : undefined,
      startDate: format(data.startDate, 'yyyy-MM-dd'),
      endDate: format(data.endDate, 'yyyy-MM-dd'),
      meetingCount: data.meetingCount,
      productId,
    };

    const result = await contractIntegration.mutateAsync(integrationData);
    
    setSubmissionResult({
      success: true,
      clicksignOk: result.clicksign.status === 'sent',
      vindiOk: result.vindi.status === 'sent',
    });
    setIsSubmitted(true);
  };

  if (isSubmitted && submissionResult) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className={cn(
              "w-16 h-16 rounded-full mx-auto flex items-center justify-center",
              submissionResult.clicksignOk && submissionResult.vindiOk
                ? "bg-green-100 text-green-600"
                : "bg-yellow-100 text-yellow-600"
            )}>
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-semibold">
              {submissionResult.clicksignOk && submissionResult.vindiOk
                ? 'Contrato e Cobrança Enviados!'
                : 'Processamento Parcial'}
            </h3>
            
            <p className="text-muted-foreground">
              {contact?.full_name} receberá os links por email.
            </p>

            <div className="flex justify-center gap-4 pt-4">
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                submissionResult.clicksignOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              )}>
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">
                  ClickSign: {submissionResult.clicksignOk ? 'Enviado' : 'Erro'}
                </span>
              </div>
              
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                submissionResult.vindiOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              )}>
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Vindi: {submissionResult.vindiOk ? 'Enviado' : 'Erro'}
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={() => {
                setIsSubmitted(false);
                setSubmissionResult(null);
                form.reset();
              }}
              className="mt-4"
            >
              Criar Novo Contrato
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Contratação e Pagamento
        </CardTitle>
        <CardDescription>
          Preencha os dados para gerar o contrato na ClickSign e a cobrança na Vindi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Contact Info */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <Label className="text-xs text-muted-foreground">Cliente</Label>
          <p className="font-medium">{contact?.full_name}</p>
          <p className="text-sm text-muted-foreground">{contact?.email || 'Email não cadastrado'}</p>
          {!contact?.email && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O contato precisa ter um email cadastrado.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            )}

            {/* Plan Type */}
            <FormField
              control={form.control}
              name="planType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Plano</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de plano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="novo_planejamento">Novo Planejamento Financeiro</SelectItem>
                      <SelectItem value="planejamento_pontual">Planejamento Financeiro Pontual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Plan Value */}
            <FormField
              control={form.control}
              name="planValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Plano</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="R$ 0,00"
                      value={field.value ? formatCurrency(field.value) : ''}
                      onChange={handleValueChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pix">À Vista (PIX)</SelectItem>
                      <SelectItem value="recorrente">Recorrente Mensal</SelectItem>
                      <SelectItem value="parcelado">Parcelado no Cartão</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    O cliente poderá escolher o método específico no link de pagamento.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Installments - only show if payment method is parcelado */}
            {watchPaymentMethod === 'parcelado' && (
              <FormField
                control={form.control}
                name="installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Parcelas</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                          <SelectItem key={num} value={String(num)}>
                            {num}x {form.getValues('planValue') > 0 && (
                              `de ${formatCurrency(form.getValues('planValue') / num)}`
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Início</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Fim</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Meeting Count */}
            <FormField
              control={form.control}
              name="meetingCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Reuniões</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                    />
                  </FormControl>
                  <FormDescription>
                    Quantidade de reuniões previstas no plano.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={contractIntegration.isPending || !contact?.email}
            >
              {contractIntegration.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Contrato e Cobrança
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
