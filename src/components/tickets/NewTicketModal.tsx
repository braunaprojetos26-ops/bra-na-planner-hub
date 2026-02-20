import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useCreateTicket } from '@/hooks/useTickets';
import { useContacts } from '@/hooks/useContacts';
import { useContracts } from '@/hooks/useContracts';
import { TicketDepartment, TicketPriority, departmentLabels, priorityLabels, DEPARTMENTS_REQUIRING_CONTACT } from '@/types/tickets';
import { InvestmentTicketFields } from '@/components/investments/InvestmentTicketFields';
import type { InvestmentTicketType } from '@/hooks/useInvestmentTicketTypes';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, User, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTicketModal({ open, onOpenChange }: NewTicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<TicketDepartment>('administrativo');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  // Investment-specific state
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<InvestmentTicketType | null>(null);
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});

  const createTicket = useCreateTicket();
  const { data: contacts = [] } = useContacts();
  const { data: contracts = [] } = useContracts();

  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.id === contactId);
  }, [contacts, contactId]);

  const selectedContactContract = useMemo(() => {
    if (!contactId) return null;
    return contracts.find((c) => c.contact_id === contactId && c.status === 'active');
  }, [contracts, contactId]);

  const isContactRequired = DEPARTMENTS_REQUIRING_CONTACT.includes(department);
  const isInvestment = department === 'investimentos';

  const handleDepartmentChange = (dept: TicketDepartment) => {
    setDepartment(dept);
    if (dept !== 'investimentos') {
      setSelectedTypeId(null);
      setSelectedType(null);
      setDynamicFields({});
    }
  };

  const handleTypeChange = (typeId: string, type: InvestmentTicketType) => {
    setSelectedTypeId(typeId);
    setSelectedType(type);
    setDynamicFields({});
  };

  const handleDynamicFieldChange = (key: string, value: any) => {
    setDynamicFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isContactRequired && !contactId) {
      toast.error('Para este departamento, é obrigatório selecionar um cliente.');
      return;
    }

    if (isInvestment && !selectedTypeId) {
      toast.error('Selecione o tipo de ação para chamados de investimento.');
      return;
    }

    // Validate required dynamic fields
    if (isInvestment && selectedType) {
      for (const field of selectedType.fields_schema) {
        if (field.required && !dynamicFields[field.key]) {
          toast.error(`O campo "${field.label}" é obrigatório.`);
          return;
        }
      }
    }

    // Calculate SLA deadline
    let slaDeadline: string | undefined;
    if (isInvestment && selectedType) {
      const deadline = new Date();
      deadline.setMinutes(deadline.getMinutes() + selectedType.sla_minutes);
      slaDeadline = deadline.toISOString();
    }

    await createTicket.mutateAsync({
      title,
      description,
      department,
      priority,
      contact_id: contactId,
      ticket_type_id: isInvestment ? selectedTypeId : undefined,
      dynamic_fields: isInvestment ? dynamicFields : undefined,
      sla_deadline: slaDeadline,
    });

    setTitle('');
    setDescription('');
    setDepartment('administrativo');
    setPriority('normal');
    setContactId(null);
    setSelectedTypeId(null);
    setSelectedType(null);
    setDynamicFields({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Chamado</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumo do seu chamado"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Select value={department} onValueChange={(v) => handleDepartmentChange(v as TicketDepartment)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(departmentLabels) as TicketDepartment[]).map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {departmentLabels[dept]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Investment dynamic fields */}
          {isInvestment && (
            <InvestmentTicketFields
              selectedTypeId={selectedTypeId}
              onTypeChange={handleTypeChange}
              dynamicFields={dynamicFields}
              onDynamicFieldChange={handleDynamicFieldChange}
              onPriorityChange={setPriority}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(priorityLabels) as TicketPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {priorityLabels[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Selector */}
          <div className="space-y-2">
            <Label>
              Cliente Relacionado {isContactRequired ? <span className="text-destructive">*</span> : '(opcional)'}
            </Label>
            <Popover open={contactOpen} onOpenChange={setContactOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={contactOpen}
                  className="w-full justify-between"
                >
                  {selectedContact ? (
                    <span className="flex items-center gap-2 truncate">
                      <User className="h-4 w-4 flex-shrink-0" />
                      {selectedContact.full_name}
                      {selectedContact.client_code && (
                        <span className="text-muted-foreground">({selectedContact.client_code})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Selecionar cliente...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {contacts.map((contact) => (
                        <CommandItem
                          key={contact.id}
                          value={`${contact.full_name} ${contact.phone} ${contact.client_code || ''}`}
                          onSelect={() => {
                            setContactId(contact.id);
                            setContactOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              contactId === contact.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{contact.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {contact.phone}
                              {contact.client_code && ` • ${contact.client_code}`}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected contact info with contract */}
            {selectedContact && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedContact.full_name}</span>
                    {selectedContact.client_code && (
                      <span className="text-muted-foreground">• {selectedContact.client_code}</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setContactId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {selectedContactContract && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>
                      Contrato: {(selectedContactContract as any).product?.name || 'Planejamento Financeiro'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o seu problema ou solicitação em detalhes..."
              rows={5}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? 'Criando...' : 'Criar Chamado'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
