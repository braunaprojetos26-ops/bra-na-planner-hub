import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addMonths } from 'date-fns';
import { CalendarIcon, FileText, CreditCard, CheckCircle2, Loader2, AlertCircle, User, MapPin, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Separator } from '@/components/ui/separator';
import { useContractIntegration, ContractIntegrationData, ContactData } from '@/hooks/useContractIntegration';
import { useProducts } from '@/hooks/useProducts';
import { useContact } from '@/hooks/useContacts';
import { cn } from '@/lib/utils';
import { fetchAddressByCep } from '@/lib/viaCep';

const maritalStatusOptions = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
];

const paymentMethodOptions = {
  assinatura: [
    { value: 'credit_card', label: 'Cartão de Crédito' },
  ],
  fatura_avulsa: [
    { value: 'pix_bank_slip', label: 'BolePIX' },
    { value: 'bank_slip_yapay', label: 'Boleto Yapay' },
    { value: 'pix', label: 'PIX' },
    { value: 'credit_card', label: 'Cartão de Crédito' },
  ],
};

const formSchema = z.object({
  // Contact data
  full_name: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().min(11, 'CPF é obrigatório'),
  rg: z.string().optional(),
  rg_issuer: z.string().optional(),
  rg_issue_date: z.date().optional().nullable(),
  birth_date: z.date({ required_error: 'Data de nascimento é obrigatória' }),
  marital_status: z.string().optional(),
  profession: z.string().optional(),
  income: z.number().optional(),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  zip_code: z.string().optional(),
  address: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  
  // Payment data
  planType: z.enum(['novo_planejamento', 'planejamento_pontual'], {
    required_error: 'Selecione o produto',
  }),
  planValue: z.number().min(1, 'Valor deve ser maior que zero'),
  billingType: z.enum(['assinatura', 'fatura_avulsa'], {
    required_error: 'Selecione o tipo de cobrança',
  }),
  paymentMethodCode: z.enum(['credit_card', 'pix', 'pix_bank_slip', 'bank_slip_yapay'], {
    required_error: 'Selecione a forma de pagamento',
  }),
  installments: z.number().optional(),
  billingDate: z.date({ required_error: 'Selecione a data da cobrança' }),
  startDate: z.date({ required_error: 'Selecione a data de início' }),
  endDate: z.date({ required_error: 'Selecione a data de fim' }),
  meetingCount: z.number().min(1, 'Mínimo de 1 reunião'),
});

type FormData = z.infer<typeof formSchema>;

interface ContractingFormProps {
  contactId: string;
}

// Function to convert number to words (Brazilian Portuguese)
function numberToWords(num: number): string {
  const units = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (num === 0) return "zero";
  if (num === 100) return "cem";

  let words = "";
  
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    if (thousands === 1) {
      words += "mil";
    } else {
      words += numberToWords(thousands) + " mil";
    }
    num %= 1000;
    if (num > 0) words += " e ";
  }
  
  if (num >= 100) {
    words += hundreds[Math.floor(num / 100)];
    num %= 100;
    if (num > 0) words += " e ";
  }
  
  if (num >= 20) {
    words += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) words += " e ";
  } else if (num >= 10) {
    words += teens[num - 10];
    num = 0;
  }
  
  if (num > 0) {
    words += units[num];
  }

  return words.trim();
}

function formatValueInWords(value: number): string {
  if (!value || value <= 0) return "";
  
  const intPart = Math.floor(value);
  const centPart = Math.round((value - intPart) * 100);
  
  let result = numberToWords(intPart) + " reais";
  if (centPart > 0) {
    result += " e " + numberToWords(centPart) + " centavos";
  }
  
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function ContractingForm({ contactId }: ContractingFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    clicksignOk: boolean;
    vindiOk: boolean;
  } | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const { data: contact } = useContact(contactId);
  const { data: products } = useProducts();
  const contractIntegration = useContractIntegration();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      cpf: '',
      rg: '',
      rg_issuer: '',
      rg_issue_date: null,
      birth_date: undefined,
      marital_status: '',
      profession: '',
      income: 0,
      email: '',
      phone: '',
      zip_code: '',
      address: '',
      address_number: '',
      address_complement: '',
      city: '',
      state: '',
      planType: 'novo_planejamento',
      planValue: 0,
      billingType: 'fatura_avulsa',
      paymentMethodCode: 'pix',
      installments: 1,
      billingDate: new Date(),
      startDate: new Date(),
      endDate: addMonths(new Date(), 12),
      meetingCount: 12,
    },
  });

  // Load contact data into form when contact is fetched
  useEffect(() => {
    if (contact) {
      form.reset({
        full_name: contact.full_name || '',
        cpf: contact.cpf || '',
        rg: contact.rg || '',
        rg_issuer: contact.rg_issuer || '',
        rg_issue_date: contact.rg_issue_date ? new Date(contact.rg_issue_date) : null,
        birth_date: contact.birth_date ? new Date(contact.birth_date) : undefined,
        marital_status: contact.marital_status || '',
        profession: contact.profession || '',
        income: contact.income || 0,
        email: contact.email || '',
        phone: contact.phone || '',
        zip_code: contact.zip_code || '',
        address: contact.address || '',
        address_number: contact.address_number || '',
        address_complement: contact.address_complement || '',
        city: (contact as any).city || '',
        state: (contact as any).state || '',
        planType: 'novo_planejamento',
        planValue: 0,
        billingType: 'fatura_avulsa',
        paymentMethodCode: 'pix',
        installments: 1,
        billingDate: new Date(),
        startDate: new Date(),
        endDate: addMonths(new Date(), 12),
        meetingCount: 12,
      });
    }
  }, [contact, form]);

  const watchBillingType = form.watch('billingType');
  const watchPaymentMethodCode = form.watch('paymentMethodCode');
  const watchPlanValue = form.watch('planValue');
  const watchStartDate = form.watch('startDate');
  const watchMeetingCount = form.watch('meetingCount');

  // Reset payment method when billing type changes
  useEffect(() => {
    if (watchBillingType === 'assinatura') {
      form.setValue('paymentMethodCode', 'credit_card');
      form.setValue('installments', undefined);
    } else {
      form.setValue('paymentMethodCode', 'pix');
    }
  }, [watchBillingType, form]);

  // Auto-update end date based on meeting count
  useEffect(() => {
    if (watchStartDate && watchMeetingCount > 0) {
      form.setValue('endDate', addMonths(watchStartDate, watchMeetingCount));
    }
  }, [watchStartDate, watchMeetingCount, form]);

  // Handle CEP lookup
  const handleCepBlur = async (cep: string) => {
    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const addressData = await fetchAddressByCep(cleanedCep);
      if (addressData) {
        form.setValue('address', addressData.logradouro || '');
        form.setValue('city', addressData.localidade || '');
        form.setValue('state', addressData.uf || '');
      }
    } catch (error) {
      console.error('Error looking up CEP:', error);
    } finally {
      setIsLoadingCep(false);
    }
  };

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

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const numericValue = parseInt(value, 10) / 100 || 0;
    form.setValue('income', numericValue);
  };

  const onSubmit = async (data: FormData) => {
    const productId = getProductId(data.planType);
    if (!productId) {
      form.setError('root', {
        message: 'Produto não encontrado. Configure os produtos no sistema.',
      });
      return;
    }

    const contactData: ContactData = {
      full_name: data.full_name,
      cpf: data.cpf,
      rg: data.rg,
      rg_issuer: data.rg_issuer,
      rg_issue_date: data.rg_issue_date ? format(data.rg_issue_date, 'yyyy-MM-dd') : undefined,
      birth_date: data.birth_date ? format(data.birth_date, 'yyyy-MM-dd') : undefined,
      marital_status: data.marital_status,
      profession: data.profession,
      income: data.income,
      email: data.email,
      phone: data.phone,
      zip_code: data.zip_code,
      address: data.address,
      address_number: data.address_number,
      address_complement: data.address_complement,
      city: data.city,
      state: data.state,
    };

    const integrationData: ContractIntegrationData = {
      contactId,
      planType: data.planType,
      planValue: data.planValue,
      billingType: data.billingType,
      paymentMethodCode: data.paymentMethodCode,
      billingDate: format(data.billingDate, 'yyyy-MM-dd'),
      installments: data.billingType === 'fatura_avulsa' && data.installments ? data.installments : undefined,
      startDate: format(data.startDate, 'yyyy-MM-dd'),
      endDate: format(data.endDate, 'yyyy-MM-dd'),
      meetingCount: data.meetingCount,
      productId,
      contactData,
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
      <Card className="max-w-4xl mx-auto">
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
              {form.getValues('full_name')} receberá os links por email em {form.getValues('email')}.
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
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Contratação e Pagamento
        </CardTitle>
        <CardDescription>
          Preencha os dados do cliente e do pagamento para gerar o contrato e a cobrança.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            )}

            {/* Section 1: Personal Data */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <User className="w-5 h-5" />
                <h3>Dados Pessoais do Cliente</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="000.000.000-00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RG</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="rg_issuer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Órgão Expedidor</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="SSP/SP" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rg_issue_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Expedição</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ?? undefined}
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

                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione"}
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
                  name="marital_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Civil</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {maritalStatusOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissão</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="income"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renda Mensal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="R$ 0,00"
                          value={field.value ? formatCurrency(field.value) : ''}
                          onChange={handleIncomeChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormDescription>
                        Para receber o contrato e a cobrança
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-md font-medium text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>Endereço</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="zip_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="00000-000"
                            onBlur={(e) => handleCepBlur(e.target.value)}
                          />
                        </FormControl>
                        {isLoadingCep && <FormDescription>Buscando endereço...</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address_complement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="SP" maxLength={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Payment Data */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Wallet className="w-5 h-5" />
                <h3>Dados do Pagamento</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product */}
                <FormField
                  control={form.control}
                  name="planType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produto *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o produto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="novo_planejamento">Planejamento Financeiro Completo</SelectItem>
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
                      <FormLabel>Valor Total *</FormLabel>
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
              </div>

              {/* Value in Words Preview */}
              {watchPlanValue > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor por extenso:</p>
                  <p className="font-medium">{formatValueInWords(watchPlanValue)}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Billing Type */}
                <FormField
                  control={form.control}
                  name="billingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cobrança *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="assinatura">Assinatura (Recorrente)</SelectItem>
                          <SelectItem value="fatura_avulsa">Fatura Avulsa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {watchBillingType === 'assinatura' 
                          ? 'Débito automático mensal no cartão'
                          : 'Cobrança única ou parcelada'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Payment Method */}
                <FormField
                  control={form.control}
                  name="paymentMethodCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentMethodOptions[watchBillingType].map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Installments - only for fatura_avulsa */}
                {watchBillingType === 'fatura_avulsa' && (
                  <FormField
                    control={form.control}
                    name="installments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parcelas</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                          value={String(field.value || 1)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                              <SelectItem key={num} value={String(num)}>
                                {num}x {watchPlanValue > 0 && `de ${formatCurrency(watchPlanValue / num)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Billing Date */}
                <FormField
                  control={form.control}
                  name="billingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Cobrança *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione"}
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
                      <FormDescription>
                        {watchBillingType === 'assinatura' 
                          ? 'Data de início da assinatura'
                          : 'Data de vencimento da fatura'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-4" />

              {/* Contract Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início do Contrato *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione"}
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
                    <FormItem>
                      <FormLabel>Fim do Contrato</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione"}
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
                  name="meetingCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Reuniões *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={contractIntegration.isPending}
              size="lg"
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
