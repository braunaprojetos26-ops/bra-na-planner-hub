import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataCollectionSection } from '@/types/dataCollection';
import { DynamicField } from './DynamicField';
import { getValueByPath } from '@/hooks/useContactDataCollection';

interface DynamicSectionProps {
  section: DataCollectionSection;
  data: Record<string, unknown>;
  onChange: (path: string, value: unknown) => void;
}

export function DynamicSection({ section, data, onChange }: DynamicSectionProps) {
  const fields = section.fields || [];

  const shouldShowField = (field: typeof fields[0]): boolean => {
    if (!field.conditional_on) return true;
    
    const { field: conditionField, value: conditionValue } = field.conditional_on;
    const currentValue = getValueByPath(data, conditionField);
    
    return currentValue === conditionValue;
  };

  const visibleFields = fields.filter(shouldShowField);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{section.title}</CardTitle>
        {section.description && (
          <CardDescription>{section.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleFields.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum campo disponível nesta seção.</p>
        ) : (
          visibleFields.map(field => (
            <DynamicField
              key={field.id}
              field={field}
              value={getValueByPath(data, field.data_path)}
              onChange={(value) => onChange(field.data_path, value)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
