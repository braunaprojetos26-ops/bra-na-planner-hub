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
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Info } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useContacts } from '@/hooks/useContacts';
import { useClients, useCreateClientPlan } from '@/hooks/useClients';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ClientPlanFormData } from '@/types/clients';

const formSchema = z.object({
  contact_id: z.string().min(1, 'Selecione um contato'),
  contract_value: z.number().min(1, 'Valor obrigatório'),
  total_meetings: z.enum(['4', '6', '9', '12']),
  start_date: z.date({ required_error: 'Data de início obrigatória' }),
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
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        contact_id: '',
        contract_value: 0,
        total_meetings: '12',
        start_date: new Date(),
      });
    }
  }, [open, form]);

  const totalMeetings = form.watch('total_meetings');
  const startDate = form.watch('start_date');

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
    const count = parseInt(values.total_meetings);
    const meetings = generateMeetings(count, values.start_date);

    const formData: ClientPlanFormData = {
      contact_id: values.contact_id,
      contract_value: values.contract_value,
      total_meetings: count as 4 | 6 | 9 | 12,
      start_date: format(values.start_date, 'yyyy-MM-dd'),
      meetings,
    };

    await createClient.mutateAsync(formData);
    form.reset();
    onOpenChange(false);
  };

  const selectedContact = availableContacts.find(c => c.id === form.watch('contact_id'));

  // Preview of auto-generated meetings
  const previewMeetings = generateMeetings(
    parseInt(totalMeetings),
    startDate || new Date()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          <DialogDescription>
            Cadastre um novo cliente de planejamento financeiro. As reuniões serão criadas automaticamente e você poderá editar os temas e datas posteriormente.
          </DialogDescription>
        </DialogHeader>

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
              <Button type="submit" disabled={createClient.isPending}>
                {createClient.isPending ? 'Cadastrando...' : 'Cadastrar Cliente'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
