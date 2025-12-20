import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { StarRating } from '@/components/ui/star-rating';
import { useFunnels, useFunnelStages } from '@/hooks/useFunnels';
import { useContacts } from '@/hooks/useContacts';
import { useCreateOpportunity } from '@/hooks/useOpportunities';
import type { OpportunityFormData, OpportunityTemperature } from '@/types/opportunities';

const formSchema = z.object({
  contact_id: z.string().min(1, 'Selecione um contato'),
  current_funnel_id: z.string().min(1, 'Selecione um funil'),
  current_stage_id: z.string().min(1, 'Selecione uma etapa'),
  qualification: z.coerce.number().min(1).max(5).optional(),
  temperature: z.enum(['cold', 'warm', 'hot']).optional(),
  notes: z.string().optional(),
});

interface NewOpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFunnelId?: string;
  defaultContactId?: string;
}

export function NewOpportunityModal({ 
  open, 
  onOpenChange, 
  defaultFunnelId,
  defaultContactId 
}: NewOpportunityModalProps) {
  const { data: funnels } = useFunnels();
  const { data: contacts } = useContacts();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(defaultFunnelId || '');
  const { data: stages } = useFunnelStages(selectedFunnelId);
  const createOpportunity = useCreateOpportunity();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contact_id: defaultContactId || '',
      current_funnel_id: defaultFunnelId || '',
      current_stage_id: '',
      qualification: undefined,
      temperature: undefined,
      notes: '',
    },
  });

  // Reset form when modal opens with new defaults
  useState(() => {
    if (open) {
      form.reset({
        contact_id: defaultContactId || '',
        current_funnel_id: defaultFunnelId || '',
        current_stage_id: '',
        qualification: undefined,
        temperature: undefined,
        notes: '',
      });
      setSelectedFunnelId(defaultFunnelId || '');
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const data: OpportunityFormData = {
      contact_id: values.contact_id,
      current_funnel_id: values.current_funnel_id,
      current_stage_id: values.current_stage_id,
      qualification: values.qualification,
      temperature: values.temperature as OpportunityTemperature,
      notes: values.notes || undefined,
    };

    await createOpportunity.mutateAsync(data);
    form.reset();
    onOpenChange(false);
  };

  const handleFunnelChange = (funnelId: string) => {
    setSelectedFunnelId(funnelId);
    form.setValue('current_funnel_id', funnelId);
    form.setValue('current_stage_id', '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Contact Selection */}
            {!defaultContactId && (
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contato *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um contato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contacts?.map(contact => (
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
            )}

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
                  <FormLabel>Temperatura</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cold" id="opp-cold" />
                        <Label htmlFor="opp-cold" className="text-blue-500">Frio</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="warm" id="opp-warm" />
                        <Label htmlFor="opp-warm" className="text-yellow-500">Morno</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hot" id="opp-hot" />
                        <Label htmlFor="opp-hot" className="text-red-500">Quente</Label>
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
                      placeholder="Observações sobre a oportunidade..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createOpportunity.isPending}>
                {createOpportunity.isPending ? 'Criando...' : 'Criar Oportunidade'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
