import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { DataCollectionField } from '@/types/dataCollection';
import { Badge } from '@/components/ui/badge';

interface DynamicFieldProps {
  field: DataCollectionField;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function DynamicField({ field, value, onChange }: DynamicFieldProps) {
  const renderField = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ''}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder || ''}
          />
        );

      case 'currency':
        return (
          <Input
            type="number"
            step="0.01"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder="0,00"
            className="text-right"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ''}
            rows={3}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={onChange}
            />
            <span className="text-sm text-muted-foreground">
              {value ? 'Sim' : 'Não'}
            </span>
          </div>
        );

      case 'select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={onChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.items?.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi_select':
        const selectedItems = (value as string[]) || [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {selectedItems.map((item) => (
                <Badge 
                  key={item} 
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => onChange(selectedItems.filter(i => i !== item))}
                >
                  {item} ×
                </Badge>
              ))}
            </div>
            <Select
              value=""
              onValueChange={(val) => {
                if (!selectedItems.includes(val)) {
                  onChange([...selectedItems, val]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Adicionar..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.items?.filter(i => !selectedItems.includes(i)).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'list':
        const items = (value as Record<string, unknown>[]) || [];
        const itemSchema = field.options?.itemSchema || {};
        
        return (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-muted/50">
                <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${Object.keys(itemSchema).length}, 1fr)` }}>
                  {Object.entries(itemSchema).map(([key, type]) => (
                    <Input
                      key={key}
                      type={type === 'currency' || type === 'number' ? 'number' : 'text'}
                      step={type === 'currency' ? '0.01' : undefined}
                      placeholder={key}
                      value={(item[key] as string | number) ?? ''}
                      onChange={(e) => {
                        const newItems = [...items];
                        const val = (type === 'currency' || type === 'number') && e.target.value
                          ? Number(e.target.value)
                          : e.target.value;
                        newItems[index] = { ...item, [key]: val };
                        onChange(newItems);
                      }}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange([...items, {}])}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        );

      default:
        return <Input value={String(value || '')} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {field.label}
        {field.is_required && <span className="text-destructive">*</span>}
      </Label>
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      {renderField()}
    </div>
  );
}
