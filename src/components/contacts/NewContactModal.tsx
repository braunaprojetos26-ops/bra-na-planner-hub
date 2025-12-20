import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StarRating } from '@/components/ui/star-rating';
import { useFunnels, useFunnelStages } from '@/hooks/useFunnels';
import { useCreateContact } from '@/hooks/useContacts';
import { useOwnerContacts } from '@/hooks/useOwnerContacts';
import { fetchAddressByCep } from '@/lib/viaCep';
import type { ContactFormData, ContactTemperature } from '@/types/contacts';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  income: z.coerce.number().optional(),
  profession: z.string().optional(),
  gender: z.string().optional(),
  source: z.string().optional(),
  referred_by: z.string().optional(),
  qualification: z.coerce.number().min(1).max(5).optional(),
  temperature: z.enum(['cold', 'warm', 'hot']).optional(),
  notes: z.string().optional(),
  current_funnel_id: z.string().min(1, 'Selecione um funil'),
  current_stage_id: z.string().min(1, 'Selecione uma etapa'),
  // Expanded fields
  source_detail: z.string().optional(),
  campaign: z.string().optional(),
  rg: z.string().optional(),
  rg_issuer: z.string().optional(),
  rg_issue_date: z.string().optional(),
  cpf: z.string().optional(),
  birth_date: z.string().optional(),
  marital_status: z.string().optional(),
  zip_code: z.string().optional(),
  address: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
});

interface NewContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sources = [
  'Instagram',
  'Facebook',
  'Threads',
  'WhatsApp',
  'Indicação',
  'Site',
  'Outro',
];

const genderOptions = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'outro', label: 'Outro' },
  { value: 'prefiro_nao_informar', label: 'Prefiro não informar' },
];

const maritalStatusOptions = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
];

export function NewContactModal({ open, onOpenChange }: NewContactModalProps) {
  const { data: funnels } = useFunnels();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const { data: stages } = useFunnelStages(selectedFunnelId);
  const { data: ownerContacts } = useOwnerContacts();
  const createContact = useCreateContact();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      income: undefined,
      profession: '',
      gender: '',
      source: '',
      referred_by: '',
      qualification: undefined,
      temperature: undefined,
      notes: '',
      current_funnel_id: '',
      current_stage_id: '',
      source_detail: '',
      campaign: '',
      rg: '',
      rg_issuer: '',
      rg_issue_date: '',
      cpf: '',
      birth_date: '',
      marital_status: '',
      zip_code: '',
      address: '',
      address_number: '',
      address_complement: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const data: ContactFormData = {
      full_name: values.full_name,
      phone: values.phone,
      current_funnel_id: values.current_funnel_id,
      current_stage_id: values.current_stage_id,
      email: values.email || undefined,
      income: values.income,
      profession: values.profession || undefined,
      gender: values.gender || undefined,
      source: values.source || undefined,
      referred_by: values.referred_by || undefined,
      qualification: values.qualification,
      temperature: values.temperature as ContactTemperature,
      notes: values.notes || undefined,
      source_detail: values.source_detail || undefined,
      campaign: values.campaign || undefined,
      rg: values.rg || undefined,
      rg_issuer: values.rg_issuer || undefined,
      rg_issue_date: values.rg_issue_date || undefined,
      cpf: values.cpf || undefined,
      birth_date: values.birth_date || undefined,
      marital_status: values.marital_status || undefined,
      zip_code: values.zip_code || undefined,
      address: values.address || undefined,
      address_number: values.address_number || undefined,
      address_complement: values.address_complement || undefined,
    };

    await createContact.mutateAsync(data);
    form.reset();
    setIsExpanded(false);
    onOpenChange(false);
  };

  const handleFunnelChange = (funnelId: string) => {
    setSelectedFunnelId(funnelId);
    form.setValue('current_funnel_id', funnelId);
    form.setValue('current_stage_id', '');
  };

  const handleCepSearch = async () => {
    const cep = form.getValues('zip_code');
    if (!cep) return;

    setIsLoadingCep(true);
    const addressData = await fetchAddressByCep(cep);
    setIsLoadingCep(false);

    if (addressData) {
      form.setValue('address', addressData.logradouro);
      toast({ title: 'Endereço encontrado!' });
    } else {
      toast({ 
        title: 'CEP não encontrado', 
        description: 'Verifique o CEP informado',
        variant: 'destructive' 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contato</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
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
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} />
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
                    <FormLabel>Renda Estimada</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0,00" 
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissão</FormLabel>
                    <FormControl>
                      <Input placeholder="Profissão" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gênero</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genderOptions.map(option => (
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sources.map(source => (
                          <SelectItem key={source} value={source}>
                            {source}
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
                name="referred_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indicado por</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um contato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ownerContacts?.map(contact => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.full_name} - {contact.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Qualification */}
            <FormField
              control={form.control}
              name="qualification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualificação</FormLabel>
                  <FormControl>
                    <StarRating 
                      value={field.value ?? null} 
                      onChange={field.onChange} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Temperature */}
            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cold" id="cold" />
                        <Label htmlFor="cold" className="text-blue-500">Frio</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="warm" id="warm" />
                        <Label htmlFor="warm" className="text-yellow-500">Morno</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hot" id="hot" />
                        <Label htmlFor="hot" className="text-red-500">Quente</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anotações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações sobre o contato..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Funnel & Stage */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="current_funnel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funil *</FormLabel>
                    <Select 
                      onValueChange={handleFunnelChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {funnels?.map(funnel => (
                          <SelectItem key={funnel.id} value={funnel.id}>
                            {funnel.name}
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
                name="current_stage_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etapa *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedFunnelId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages?.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Expandable Section */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full justify-between">
                  {isExpanded ? 'Ver Menos' : 'Ver Mais'}
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="source_detail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fonte</FormLabel>
                        <FormControl>
                          <Input placeholder="Detalhe da fonte" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="campaign"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campanha</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da campanha" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RG</FormLabel>
                        <FormControl>
                          <Input placeholder="Número do RG" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rg_issuer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Órgão Emissor</FormLabel>
                        <FormControl>
                          <Input placeholder="SSP/SP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rg_issue_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Expedição</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input placeholder="000.000.000-00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="birth_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
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
                </div>

                {/* Address Section */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="zip_code"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>CEP</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="00000-000" {...field} />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={handleCepSearch}
                            disabled={isLoadingCep}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Avenida..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
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
                          <Input placeholder="Apto, Bloco..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createContact.isPending}>
                {createContact.isPending ? 'Criando...' : 'Criar Contato'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
