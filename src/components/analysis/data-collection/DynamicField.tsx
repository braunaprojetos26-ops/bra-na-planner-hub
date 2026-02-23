import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { DataCollectionField } from '@/types/dataCollection';
import { Badge } from '@/components/ui/badge';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface DynamicFieldProps {
  field: DataCollectionField;
  value: unknown;
  data?: Record<string, unknown>;
  onChange: (value: unknown) => void;
}

// Helper to get nested value from data object
const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
};

// Check if list is "simple" (only name + currency value)
const isSimpleList = (itemSchema: Record<string, string>): boolean => {
  const keys = Object.keys(itemSchema);
  if (keys.length !== 2) return false;
  return keys.includes('name') && (keys.includes('value_monthly_brl') || keys.includes('market_value_brl'));
};

export function DynamicField({ field, value, data, onChange }: DynamicFieldProps) {
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
          <CurrencyInput
            value={(value as number) ?? null}
            onChange={onChange}
            placeholder="0,00"
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

      case 'searchable_select': {
        const selectOptions = (field.options?.items || []).map((item) => ({
          value: item,
          label: item,
        }));
        const currentValue = (value as string) || '';
        const isOtherCustom = currentValue !== '' && currentValue !== 'Outros' && !field.options?.items?.includes(currentValue);
        const showOtherInput = currentValue === 'Outros' || isOtherCustom;
        
        return (
          <div className="space-y-2">
            <SearchableSelect
              value={isOtherCustom ? 'Outros' : currentValue}
              onValueChange={(val) => {
                if (val === 'Outros') {
                  onChange('Outros');
                } else {
                  onChange(val);
                }
              }}
              options={selectOptions}
              placeholder="Selecione ou pesquise..."
              searchPlaceholder="Pesquisar..."
            />
            {showOtherInput && (
              <Input
                value={currentValue === 'Outros' ? '' : currentValue}
                onChange={(e) => onChange(e.target.value || 'Outros')}
                placeholder="Digite a profissão..."
              />
            )}
          </div>
        );
      }

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

      case 'computed':
        // Campo calculado - pode somar campos individuais ou valores de lista
        const options = field.options || {};
        let computedValue = 0;
        
        if (options.sourceType === 'list_sum') {
          // Soma valores de uma lista
          const listData = data ? getNestedValue(data, options.sourceField as string) : [];
          if (Array.isArray(listData)) {
            computedValue = listData.reduce((sum, item) => {
              const itemValue = item[options.sumKey as string];
              return sum + (typeof itemValue === 'number' ? itemValue : 0);
            }, 0);
          }
        } else {
          // Soma campos individuais (comportamento padrão)
          const sourceFields = (options.sourceFields as string[]) || [];
          computedValue = sourceFields.reduce((sum: number, sourcePath: string) => {
            const sourceValue = data ? getNestedValue(data, sourcePath) : 0;
            return sum + (typeof sourceValue === 'number' ? sourceValue : 0);
          }, 0);
        }
        
        return (
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border-2 border-primary/30">
            <span className="text-sm font-medium text-primary">{field.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">R$</span>
              <span className="text-xl font-bold text-primary">
                {computedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        );

      case 'list':
        const items = (value as Record<string, unknown>[]) || [];
        const itemSchema = (field.options?.itemSchema || {}) as Record<string, string>;
        
        // Labels em português para todos os tipos de lista
        const fieldLabels: Record<string, string> = {
          // Objetivos
          goal_type: 'Tipo de Objetivo',
          name: 'Descrição',
          target_value_brl: 'Quanto precisa (R$)',
          target_date: 'Quando pretende',
          priority: 'Prioridade',
          how: 'Como pensa em atingir',
          // Patrimônio (modelo único para todos)
          market_value_brl: 'Valor de Mercado (R$)',
          is_paid_off: 'Quitado',
          installment_monthly_brl: 'Valor da Parcela (R$)',
          months_remaining: 'Meses Restantes',
          has_insurance: 'Tem Seguro',
          // Filhos
          idade: 'Idade',
          // Dívidas
          cause: 'Causa',
          outstanding_brl: 'Saldo Devedor (R$)',
          interest_type: 'Tipo de Juros',
          // Fluxo de caixa
          value_monthly_brl: 'Valor Mensal (R$)'
        };

        // Override label for 'name' in goals_list context
        const getFieldLabel = (key: string) => {
          if (key === 'name' && field.key === 'goals_list') {
            return 'Detalhes / Observações';
          }
          return fieldLabels[key] || key;
        };
        
        // Verificar se é uma lista simples (nome + valor)
        if (isSimpleList(itemSchema)) {
          const valueKey = Object.keys(itemSchema).find(k => k !== 'name') as string;
          
          return (
            <div className="space-y-1">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 group">
                  <Input
                    placeholder={getFieldLabel('name')}
                    value={(item.name as string) ?? ''}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index] = { ...item, name: e.target.value };
                      onChange(newItems);
                    }}
                    className="flex-1 h-9"
                  />
                  <CurrencyInput
                    value={(item[valueKey] as number) ?? null}
                    onChange={(val) => {
                      const newItems = [...items];
                      newItems[index] = { ...item, [valueKey]: val };
                      onChange(newItems);
                    }}
                    className="w-36 h-9"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 opacity-50 hover:opacity-100 hover:text-destructive"
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-foreground"
                onClick={() => onChange([...items, {}])}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          );
        }
        
        // Campos de patrimônio - todos usam o mesmo modelo
        const assetFields = ['cars', 'real_estate', 'businesses', 'company_shares', 'other_assets'];
        const assetFieldOrder = ['name', 'market_value_brl', 'is_paid_off', 'installment_monthly_brl', 'months_remaining', 'has_insurance'];
        
        // Ordem específica por tipo de lista
        const fieldOrderByType: Record<string, string[]> = {
          // Objetivos
          goals_list: ['goal_type', 'name', 'target_value_brl', 'target_date', 'priority', 'how'],
          // Filhos
          children: ['name', 'idade'],
          // Dívidas
          debts_list: ['name', 'cause', 'outstanding_brl', 'installment_monthly_brl', 'interest_type'],
          // Fluxo de caixa
          income: ['name', 'value_monthly_brl'],
          fixed_expenses: ['name', 'value_monthly_brl']
        };
        
        // Usar ordem de patrimônio se for um campo de assets
        const fieldOrder = assetFields.includes(field.key) 
          ? assetFieldOrder 
          : (fieldOrderByType[field.key] || []);
        
        // Ordenar as chaves do schema conforme a ordem desejada
        const orderedKeys = Object.keys(itemSchema).sort((a, b) => {
          const indexA = fieldOrder.indexOf(a);
          const indexB = fieldOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        
        // Separar campos principais do campo "how" (para objetivos)
        const secondaryFields = ['how'];
        const conditionalFields = ['installment_monthly_brl', 'months_remaining']; // Mostrar só se não quitado
        const mainFields = orderedKeys.filter(k => !secondaryFields.includes(k) && !conditionalFields.includes(k));
        const hasSecondaryField = orderedKeys.some(k => secondaryFields.includes(k));
        const hasConditionalFields = orderedKeys.some(k => conditionalFields.includes(k));
        
        const renderListField = (key: string, item: Record<string, unknown>, index: number, listItems: Record<string, unknown>[]) => {
          const type = itemSchema[key];
          
          if (type === 'boolean') {
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{getFieldLabel(key)}:</span>
                <Switch
                  checked={Boolean(item[key])}
                  onCheckedChange={(checked) => {
                    const newItems = [...listItems];
                    newItems[index] = { ...item, [key]: checked };
                    onChange(newItems);
                  }}
                />
                <span className="text-sm">{item[key] ? 'Sim' : 'Não'}</span>
              </div>
            );
          }
          
          if (type === 'select') {
            // Use goalTypeOptions for goal_type field, typeOptions for others
            const selectOptions = key === 'goal_type' 
              ? (field.options?.goalTypeOptions as string[] || [])
              : (field.options?.typeOptions || []);
            return (
              <Select
                key={key}
                value={(item[key] as string) || ''}
                onValueChange={(val) => {
                  const newItems = [...listItems];
                  newItems[index] = { ...item, [key]: val };
                  onChange(newItems);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={getFieldLabel(key)} />
                </SelectTrigger>
                <SelectContent>
                  {selectOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }
          
          // Campo de moeda com CurrencyInput
          if (type === 'currency') {
            return (
              <CurrencyInput
                key={key}
                value={(item[key] as number) ?? null}
                onChange={(val) => {
                  const newItems = [...listItems];
                  newItems[index] = { ...item, [key]: val };
                  onChange(newItems);
                }}
              />
            );
          }
          
          if (type === 'date') {
            return (
              <Input
                key={key}
                type="date"
                placeholder={getFieldLabel(key)}
                value={(item[key] as string) ?? ''}
                onChange={(e) => {
                  const newItems = [...listItems];
                  newItems[index] = { ...item, [key]: e.target.value };
                  onChange(newItems);
                }}
              />
            );
          }
          
          return (
            <Input
              key={key}
              type={type === 'number' ? 'number' : 'text'}
              placeholder={getFieldLabel(key)}
              value={(item[key] as string | number) ?? ''}
              onChange={(e) => {
                const newItems = [...listItems];
                const val = type === 'number' && e.target.value
                  ? Number(e.target.value)
                  : e.target.value;
                newItems[index] = { ...item, [key]: val };
                onChange(newItems);
              }}
            />
          );
        };
        
        return (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/50">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(mainFields.length, 4)}, 1fr)` }}>
                    {mainFields.map((key) => renderListField(key, item, index, items))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {/* Campos condicionais - só aparecem se não quitado */}
                {hasConditionalFields && !item['is_paid_off'] && (
                  <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-muted">
                    {conditionalFields.filter(k => orderedKeys.includes(k)).map((key) => renderListField(key, item, index, items))}
                  </div>
                )}
                {/* Campo secundário (how) em linha separada */}
                {hasSecondaryField && orderedKeys.includes('how') && (
                  <Input
                    placeholder={fieldLabels['how']}
                    value={(item['how'] as string) ?? ''}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index] = { ...item, how: e.target.value };
                      onChange(newItems);
                    }}
                    className="w-full"
                  />
                )}
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

  // Para campos computed, não mostrar label duplicado
  if (field.field_type === 'computed') {
    return renderField();
  }

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
