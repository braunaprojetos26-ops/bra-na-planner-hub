import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpdatePlanMeeting } from '@/hooks/useClientMeetings';
import { CLIENT_PLAN_MEETING_THEMES, type ClientPlanMeeting } from '@/types/clients';

const formSchema = z.object({
  theme: z.enum(CLIENT_PLAN_MEETING_THEMES, { 
    required_error: 'Selecione o tema da reunião' 
  }),
  scheduled_date: z.date({ required_error: 'Data obrigatória' }),
});

interface EditPlanMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: ClientPlanMeeting | null;
}

export function EditPlanMeetingModal({
  open,
  onOpenChange,
  meeting,
}: EditPlanMeetingModalProps) {
  const updateMeeting = useUpdatePlanMeeting();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      theme: undefined,
      scheduled_date: new Date(),
    },
  });

  useEffect(() => {
    if (meeting && open) {
      // Check if meeting theme is a valid theme option
      const isValidTheme = CLIENT_PLAN_MEETING_THEMES.includes(
        meeting.theme as typeof CLIENT_PLAN_MEETING_THEMES[number]
      );
      
      form.reset({
        theme: isValidTheme ? (meeting.theme as typeof CLIENT_PLAN_MEETING_THEMES[number]) : undefined,
        scheduled_date: parseISO(meeting.scheduled_date),
      });
    }
  }, [meeting, open, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!meeting) return;

    await updateMeeting.mutateAsync({
      meetingId: meeting.id,
      data: {
        theme: values.theme,
        scheduled_date: format(values.scheduled_date, 'yyyy-MM-dd'),
      },
    });

    onOpenChange(false);
  };

  if (!meeting) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Reunião {meeting.meeting_number}</DialogTitle>
          <DialogDescription>
            Selecione o tema e a data prevista para esta reunião do cronograma.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tema da Reunião *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tema" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {CLIENT_PLAN_MEETING_THEMES.map((theme) => (
                        <SelectItem key={theme} value={theme}>
                          {theme}
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
              name="scheduled_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Prevista *</FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMeeting.isPending}>
                {updateMeeting.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
