import { useEffect } from 'react';
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
import { useInvestmentTicketTypes, type InvestmentTicketType, type FieldSchema } from '@/hooks/useInvestmentTicketTypes';
import { TicketPriority } from '@/types/tickets';

interface InvestmentTicketFieldsProps {
  selectedTypeId: string | null;
  onTypeChange: (typeId: string, type: InvestmentTicketType) => void;
  dynamicFields: Record<string, any>;
  onDynamicFieldChange: (key: string, value: any) => void;
  onPriorityChange: (priority: TicketPriority) => void;
}

export function InvestmentTicketFields({
  selectedTypeId,
  onTypeChange,
  dynamicFields,
  onDynamicFieldChange,
  onPriorityChange,
}: InvestmentTicketFieldsProps) {
  const { data: ticketTypes = [] } = useInvestmentTicketTypes();

  const selectedType = ticketTypes.find(t => t.id === selectedTypeId);

  const handleTypeSelect = (typeId: string) => {
    const type = ticketTypes.find(t => t.id === typeId);
    if (type) {
      onTypeChange(typeId, type);
      onPriorityChange(type.default_priority as TicketPriority);
    }
  };

  const renderField = (field: FieldSchema) => {
    const value = dynamicFields[field.key] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              value={value}
              onChange={(e) => onDynamicFieldChange(field.key, e.target.value)}
              required={field.required}
              rows={3}
            />
          </div>
        );
      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select value={value} onValueChange={(v) => onDynamicFieldChange(field.key, v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'currency':
        return (
          <div key={field.key} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              type="text"
              value={value}
              onChange={(e) => onDynamicFieldChange(field.key, e.target.value)}
              placeholder="R$ 0,00"
              required={field.required}
            />
          </div>
        );
      case 'date':
        return (
          <div key={field.key} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              type="date"
              value={value}
              onChange={(e) => onDynamicFieldChange(field.key, e.target.value)}
              required={field.required}
            />
          </div>
        );
      default:
        return (
          <div key={field.key} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              value={value}
              onChange={(e) => onDynamicFieldChange(field.key, e.target.value)}
              required={field.required}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Ação <span className="text-destructive">*</span></Label>
        <Select value={selectedTypeId || ''} onValueChange={handleTypeSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de ação..." />
          </SelectTrigger>
          <SelectContent>
            {ticketTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedType && selectedType.fields_schema.map(renderField)}
    </div>
  );
}
