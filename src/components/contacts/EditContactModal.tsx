import { useState, useEffect } from 'react';
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
import { useUpdateContact } from '@/hooks/useContacts';
import { useOwnerContacts } from '@/hooks/useOwnerContacts';
import { fetchAddressByCep } from '@/lib/viaCep';
import type { Contact, ContactFormData, ContactTemperature } from '@/types/contacts';
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
}).superRefine((data, ctx) => {
  if (data.source === 'Indicação' && !data.referred_by) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecione quem indicou este contato',
      path: ['referred_by'],
    });
  }
});

interface EditContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

const sources = ['Instagram', 'Facebook', 'Threads', 'WhatsApp', 'Indicação', 'Site', 'Outro'];

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

export function EditContactModal({ open, onOpenChange, contact }: EditContactModalProps) {
  const { data: ownerContacts } = useOwnerContacts();
  const updateContact = useUpdateContact();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [referrerSearch, setReferrerSearch] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: contact.full_name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      income: contact.income ?? undefined,
      profession: contact.profession || '',
      gender: contact.gender || '',
      source: contact.source || '',
      referred_by: contact.referred_by || '',
      qualification: contact.qualification ?? undefined,
      temperature: (contact.temperature as 'cold' | 'warm' | 'hot') || undefined,
      notes: contact.notes || '',
      source_detail: contact.source_detail || '',
      campaign: contact.campaign || '',
      rg: contact.rg || '',
      rg_issuer: contact.rg_issuer || '',
      rg_issue_date: contact.rg_issue_date || '',
      cpf: contact.cpf || '',
      birth_date: contact.birth_date || '',
      marital_status: contact.marital_status || '',
      zip_code: contact.zip_code || '',
      address: contact.address || '',
      address_number: contact.address_number || '',
      address_complement: contact.address_complement || '',
    },
  });

  // Reset form when contact changes
  useEffect(() => {
    form.reset({
      full_name: contact.full_name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      income: contact.income ?? undefined,
      profession: contact.profession || '',
      gender: contact.gender || '',
      source: contact.source || '',
      referred_by: contact.referred_by || '',
      qualification: contact.qualification ?? undefined,
      temperature: (contact.temperature as 'cold' | 'warm' | 'hot') || undefined,
      notes: contact.notes || '',
      source_detail: contact.source_detail || '',
      campaign: contact.campaign || '',
      rg: contact.rg || '',
      rg_issuer: contact.rg_issuer || '',
      rg_issue_date: contact.rg_issue_date || '',
      cpf: contact.cpf || '',
      birth_date: contact.birth_date || '',
      marital_status: contact.marital_status || '',
      zip_code: contact.zip_code || '',
      address: contact.address || '',
      address_number: contact.address_number || '',
      address_complement: contact.address_complement || '',
    });
  }, [contact, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const data: Partial<ContactFormData> = {
      full_name: values.full_name,
      phone: values.phone,
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

    try {
      await updateContact.mutateAsync({ contactId: contact.id, data });
      setIsExpanded(false);
      onOpenChange(false);
    } catch (error: any) {
      // Check for duplicate phone error
      if (error.message?.includes('contacts_phone_key') || error.code === '23505') {
        toast({
          title: 'Telefone já cadastrado',
          description: 'Este número de telefone já está cadastrado para outro contato.',
          variant: 'destructive',
        });
      }
    }
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
      toast({ title: 'CEP não encontrado', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contato</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <Input type="number" placeholder="0,00" {...field} value={field.value ?? ''} />
                    </FormControl>
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
                          <SelectItem key={source} value={source}>{source}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('source') === 'Indicação' && (
                <FormField
                  control={form.control}
                  name="referred_by"
                  render={({ field }) => {
                    const filteredContacts = ownerContacts?.filter(c =>
                      c.full_name.toLowerCase().includes(referrerSearch.toLowerCase()) ||
                      c.phone.includes(referrerSearch)
                    ) ?? [];
                    const selectedContact = ownerContacts?.find(c => c.id === field.value);
                    
                    return (
                      <FormItem>
                        <FormLabel>Indicado por *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione quem indicou">
                                {selectedContact ? `${selectedContact.full_name}` : 'Selecione quem indicou'}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <div className="px-2 pb-2">
                              <Input
                                placeholder="Buscar contato..."
                                value={referrerSearch}
                                onChange={(e) => setReferrerSearch(e.target.value)}
                                className="h-8"
                              />
                            </div>
                            {filteredContacts.length === 0 ? (
                              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                Nenhum contato encontrado
                              </div>
                            ) : (
                              filteredContacts.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.full_name} - {c.phone}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="qualification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualificação</FormLabel>
                  <FormControl>
                    <StarRating value={field.value ?? null} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperatura</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cold" id="edit-cold" />
                        <Label htmlFor="edit-cold" className="text-blue-500">Frio</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="warm" id="edit-warm" />
                        <Label htmlFor="edit-warm" className="text-yellow-500">Morno</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hot" id="edit-hot" />
                        <Label htmlFor="edit-hot" className="text-red-500">Quente</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anotações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações sobre o contato..." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full justify-between">
                  {isExpanded ? 'Ver Menos' : 'Ver Mais'}
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="profession" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissão</FormLabel>
                      <FormControl><Input placeholder="Profissão" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {genderOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="cpf" render={({ field }) => (
                    <FormItem><FormLabel>CPF</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="birth_date" render={({ field }) => (
                    <FormItem><FormLabel>Data Nascimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="rg" render={({ field }) => (
                    <FormItem><FormLabel>RG</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="rg_issuer" render={({ field }) => (
                    <FormItem><FormLabel>Órgão Emissor</FormLabel><FormControl><Input placeholder="SSP/SP" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="rg_issue_date" render={({ field }) => (
                    <FormItem><FormLabel>Data Emissão</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="marital_status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado Civil</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {maritalStatusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="zip_code" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <div className="flex gap-1">
                        <FormControl><Input {...field} /></FormControl>
                        <Button type="button" size="icon" variant="outline" onClick={handleCepSearch} disabled={isLoadingCep}>
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="address_number" render={({ field }) => (
                    <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="address_complement" render={({ field }) => (
                    <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input placeholder="Apto, Bloco..." {...field} /></FormControl></FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateContact.isPending}>
                {updateContact.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
