import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, CheckCircle } from 'lucide-react';
import { useDataCollectionSchema } from '@/hooks/useDataCollectionSchema';
import { 
  useContactDataCollection, 
  useCreateDataCollection, 
  useUpdateDataCollection,
  useSaveDataCollectionDraft,
  useCompleteDataCollection,
  validateDataCollection,
  setValueByPath,
  getValueByPath
} from '@/hooks/useContactDataCollection';
import { DataCollectionSection, DataCollectionField } from '@/types/dataCollection';
import { DynamicSection } from './DynamicSection';
import { Badge } from '@/components/ui/badge';

interface DataCollectionFormProps {
  contactId: string;
  onComplete?: () => void;
}

export function DataCollectionForm({ contactId, onComplete }: DataCollectionFormProps) {
  const { data: schema, isLoading: schemaLoading } = useDataCollectionSchema();
  const { data: collection, isLoading: collectionLoading } = useContactDataCollection(contactId);
  const createCollection = useCreateDataCollection();
  const updateCollection = useUpdateDataCollection();
  const saveDraft = useSaveDataCollectionDraft();
  const completeCollection = useCompleteDataCollection();

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize or create collection
  useEffect(() => {
    if (!collectionLoading && !collection && contactId) {
      createCollection.mutate(contactId);
    }
  }, [collectionLoading, collection, contactId]);

  // Load data from collection
  useEffect(() => {
    if (collection?.data_collection) {
      setFormData(collection.data_collection);
    }
  }, [collection]);

  // Set first section as active
  useEffect(() => {
    if (schema?.sections && schema.sections.length > 0 && !activeSection) {
      setActiveSection(schema.sections[0].key);
    }
  }, [schema, activeSection]);

  // Auto-save every 10 seconds if there are changes
  useEffect(() => {
    if (!hasChanges || !collection?.id) return;

    const timer = setTimeout(() => {
      updateCollection.mutate({ id: collection.id, data_collection: formData });
      setHasChanges(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, [formData, hasChanges, collection?.id]);

  const handleFieldChange = useCallback((path: string, value: unknown) => {
    setFormData(prev => setValueByPath(prev, path, value));
    setHasChanges(true);
  }, []);

  const handleSaveDraft = () => {
    if (!collection?.id) return;
    saveDraft.mutate({ id: collection.id, data_collection: formData });
    setHasChanges(false);
  };

  const handleComplete = () => {
    if (!collection?.id || !schema?.sections) return;

    const allFields = schema.sections.flatMap(s => s.fields || []);
    const validation = validateDataCollection(formData, allFields);

    if (!validation.isValid) {
      return;
    }

    completeCollection.mutate({ id: collection.id, data_collection: formData });
    onComplete?.();
  };

  // Calculate progress
  const allFields = schema?.sections?.flatMap(s => s.fields || []) || [];
  const validation = validateDataCollection(formData, allFields);
  const progress = validation.totalRequiredFields > 0 
    ? (validation.completedRequiredFields / validation.totalRequiredFields) * 100 
    : 0;

  if (schemaLoading || collectionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum formulário de coleta configurado.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status and Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={collection?.status === 'completed' ? 'default' : 'secondary'}>
            {collection?.status === 'completed' ? 'Concluída' : 'Rascunho'}
          </Badge>
          {hasChanges && (
            <span className="text-xs text-muted-foreground">Alterações não salvas</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{validation.completedRequiredFields}/{validation.totalRequiredFields} obrigatórios</span>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {schema.sections?.map(section => (
          <Button
            key={section.key}
            variant={activeSection === section.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection(section.key)}
          >
            {section.title}
          </Button>
        ))}
      </div>

      {/* Active Section Content */}
      {schema.sections?.map(section => (
        activeSection === section.key && (
          <DynamicSection
            key={section.id}
            section={section}
            data={formData}
            onChange={handleFieldChange}
          />
        )
      ))}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={handleSaveDraft}
          disabled={saveDraft.isPending}
        >
          {saveDraft.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Rascunho
        </Button>
        <Button 
          onClick={handleComplete}
          disabled={!validation.isValid || completeCollection.isPending}
        >
          {completeCollection.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Marcar como Concluída
        </Button>
      </div>
    </div>
  );
}
