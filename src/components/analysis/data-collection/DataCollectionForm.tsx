import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, CheckCircle, LayoutList, Grid2X2 } from 'lucide-react';
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
import { ObservationsPanel } from './ObservationsPanel';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface DataCollectionFormProps {
  contactId: string;
  onComplete?: () => void;
}

type ViewMode = 'tabs' | 'all';

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
  const [viewMode, setViewMode] = useState<ViewMode>('tabs');

  // Initialize or create collection
  useEffect(() => {
    if (!collectionLoading && !collection && contactId) {
      createCollection.mutate(contactId);
    }
  }, [collectionLoading, collection, contactId]);

  // Load data from collection and apply defaults for list fields
  useEffect(() => {
    if (collection?.data_collection && schema?.sections) {
      let data = collection.data_collection as Record<string, unknown>;
      
      // Apply default values for list fields that are empty
      schema.sections.forEach(section => {
        section.fields?.forEach(field => {
          if (field.field_type === 'list' && field.default_value) {
            const currentValue = getValueByPath(data, field.data_path);
            if (!currentValue || (Array.isArray(currentValue) && currentValue.length === 0)) {
              data = setValueByPath(data, field.data_path, field.default_value);
            }
          }
        });
      });
      
      setFormData(data);
    }
  }, [collection, schema]);

  // Set first section as active (excluding notes)
  useEffect(() => {
    if (schema?.sections && schema.sections.length > 0 && !activeSection) {
      const nonNotesSections = schema.sections.filter(s => s.key !== 'notes');
      if (nonNotesSections.length > 0) {
        setActiveSection(nonNotesSections[0].key);
      }
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

  // Get observations data
  const plannerSummary = (getValueByPath(formData, 'notes.planner_summary') as string) || '';

  // Filter out notes section for main content
  const contentSections = schema?.sections?.filter(s => s.key !== 'notes') || [];

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
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-4">
        {/* Status, Progress and View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={collection?.status === 'completed' ? 'default' : 'secondary'}>
                {collection?.status === 'completed' ? 'Concluída' : 'Rascunho'}
              </Badge>
              {hasChanges && (
                <span className="text-xs text-muted-foreground">Alterações não salvas</span>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as ViewMode)}
              size="sm"
            >
              <ToggleGroupItem value="tabs" aria-label="Por seções">
                <Grid2X2 className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="all" aria-label="Tudo corrido">
                <LayoutList className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{validation.completedRequiredFields}/{validation.totalRequiredFields} obrigatórios</span>
          </div>
        </div>

        <Progress value={progress} className="h-2" />

        {/* Section Navigation - Only show in tabs mode */}
        {viewMode === 'tabs' && (
          <div className="flex flex-wrap gap-2">
            {contentSections.map(section => (
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
        )}

        {/* Section Content */}
        {viewMode === 'tabs' ? (
          // Tabs mode - show only active section
          contentSections.map(section => (
            activeSection === section.key && (
              <DynamicSection
                key={section.id}
                section={section}
                data={formData}
                onChange={handleFieldChange}
              />
            )
          ))
        ) : (
          // All mode - show all sections in sequence
          <div className="space-y-6">
            {contentSections.map(section => (
              <DynamicSection
                key={section.id}
                section={section}
                data={formData}
                onChange={handleFieldChange}
              />
            ))}
          </div>
        )}

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

      {/* Observations Panel - scrolls with content */}
      <div className="w-80 shrink-0 hidden lg:block self-start">
        <ObservationsPanel
          value={plannerSummary}
          onChange={(value) => handleFieldChange('notes.planner_summary', value)}
        />
      </div>
    </div>
  );
}
