import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Check, ChevronsUpDown, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useContacts } from '@/hooks/useContacts';
import { useClients, useCreateClientPlan } from '@/hooks/useClients';
import type { ClientPlanFormData } from '@/types/clients';

const formSchema = z.object({
  contact_id: z.string().min(1, 'Selecione um contato'),
  contract_value: z.number().min(1, 'Valor obrigatório'),
  total_meetings: z.enum(['4', '6', '9', '12']),
  start_date: z.date({ required_error: 'Data de início obrigatória' }),
  meetings: z.array(
    z.object({
      meeting_number: z.number(),
      theme: z.string().min(1, 'Tema obrigatório'),
      scheduled_date: z.date({ required_error: 'Data obrigatória' }),
    })
  ),
});

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewClientModal({ open, onOpenChange }: NewClientModalProps) {
  const [openContactSelect, setOpenContactSelect] = useState(false);
  const { data: contacts } = useContacts();
  const { data: existingClients } = useClients();
  const createClient = useCreateClientPlan();

  // Filter out contacts that already have an active plan
  const existingClientContactIds = new Set(
    existingClients?.filter(c => c.status === 'active').map(c => c.contact_id) || []
  );
  const availableContacts = contacts?.filter(c => !existingClientContactIds.has(c.id)) || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contact_id: '',
      contract_value: 0,
      total_meetings: '12',
      start_date: new Date(),
      meetings: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'meetings',
  });

  const totalMeetings = form.watch('total_meetings');
  const startDate = form.watch('start_date');

  // Generate meeting fields when total_meetings changes
  useEffect(() => {
    const count = parseInt(totalMeetings);
    const monthInterval = Math.floor(12 / count);
    
    const newMeetings = Array.from({ length: count }, (_, i) => ({
      meeting_number: i + 1,
      theme: '',
      scheduled_date: addMonths(startDate || new Date(), i * monthInterval),
    }));
    
    replace(newMeetings);
  }, [totalMeetings, startDate, replace]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const formData: ClientPlanFormData = {
      contact_id: values.contact_id,
      contract_value: values.contract_value,
      total_meetings: parseInt(values.total_meetings) as 4 | 6 | 9 | 12,
      start_date: format(values.start_date, 'yyyy-MM-dd'),
      meetings: values.meetings.map(m => ({
        meeting_number: m.meeting_number,
        theme: m.theme,
        scheduled_date: format(m.scheduled_date, 'yyyy-MM-dd'),
      })),
    };

    await createClient.mutateAsync(formData);
    form.reset();
    onOpenChange(false);
  };

  const selectedContact = availableContacts.find(c => c.id === form.watch('contact_id'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Contact Selection */}
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Selecionar Contato *</FormLabel>
                    <Popover open={openContactSelect} onOpenChange={setOpenContactSelect}>
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
                            {selectedContact?.full_name || 'Buscar contato...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar contato..." />
                          <CommandList>
                            <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                            <CommandGroup>
                              {availableContacts.map((contact) => (
                                <CommandItem
                                  key={contact.id}
                                  value={contact.full_name}
                                  onSelect={() => {
                                    field.onChange(contact.id);
                                    setOpenContactSelect(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      contact.id === field.value ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <div>
                                    <p>{contact.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{contact.phone}</p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contract Value */}
              <FormField
                control={form.control}
                name="contract_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Contrato (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="12000"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                            <Label htmlFor={`meetings-${num}`}>{num} reuniões</Label>
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

              {/* Meetings Definition */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-t pt-4">
                  Definir Reuniões ({fields.length} reuniões)
                </h3>
                
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-[auto,1fr,auto] gap-3 items-end p-3 bg-muted/50 rounded-lg">
                      <div className="w-16 text-center">
                        <Label className="text-xs text-muted-foreground">Reunião</Label>
                        <p className="font-semibold">{index + 1}</p>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name={`meetings.${index}.theme`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Tema</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Análise Patrimonial" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`meetings.${index}.scheduled_date`}
                        render={({ field }) => (
                          <FormItem className="w-36">
                            <FormLabel className="text-xs">Data</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                      'w-full pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value
                                      ? format(field.value, 'dd/MM/yyyy')
                                      : 'Selecione'}
                                    <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
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
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createClient.isPending}>
                  {createClient.isPending ? 'Cadastrando...' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
