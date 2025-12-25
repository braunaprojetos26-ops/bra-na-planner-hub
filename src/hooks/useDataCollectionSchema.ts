import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  DataCollectionSchema, 
  DataCollectionSection, 
  DataCollectionField,
  DataCollectionSectionFormData,
  DataCollectionFieldFormData,
  FieldOptions,
  FieldValidation,
  ConditionalOn
} from '@/types/dataCollection';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

// Helper to cast JSON types
const parseField = (field: {
  id: string;
  section_id: string;
  key: string;
  label: string;
  description: string | null;
  field_type: string;
  options: Json;
  validation: Json;
  data_path: string;
  placeholder: string | null;
  default_value: Json;
  conditional_on: Json;
  order_position: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): DataCollectionField => ({
  ...field,
  field_type: field.field_type as DataCollectionField['field_type'],
  options: (field.options || {}) as FieldOptions,
  validation: (field.validation || {}) as FieldValidation,
  default_value: field.default_value,
  conditional_on: field.conditional_on as unknown as ConditionalOn | null
});

// Fetch active schema with sections and fields
export function useDataCollectionSchema() {
  return useQuery({
    queryKey: ['data-collection-schema'],
    queryFn: async () => {
      // Get active schema
      const { data: schema, error: schemaError } = await supabase
        .from('data_collection_schemas')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (schemaError) throw schemaError;
      if (!schema) return null;

      // Get sections
      const { data: sections, error: sectionsError } = await supabase
        .from('data_collection_sections')
        .select('*')
        .eq('schema_id', schema.id)
        .eq('is_active', true)
        .order('order_position');

      if (sectionsError) throw sectionsError;

      // Get all fields for these sections
      const sectionIds = sections?.map(s => s.id) || [];
      const { data: fields, error: fieldsError } = await supabase
        .from('data_collection_fields')
        .select('*')
        .in('section_id', sectionIds)
        .eq('is_active', true)
        .order('order_position');

      if (fieldsError) throw fieldsError;

      // Organize fields by section
      const sectionsWithFields: DataCollectionSection[] = (sections || []).map(section => ({
        ...section,
        fields: (fields || [])
          .filter(f => f.section_id === section.id)
          .map(parseField)
      }));

      return {
        ...schema,
        sections: sectionsWithFields
      } as DataCollectionSchema;
    }
  });
}

// Fetch all schemas (for admin)
export function useDataCollectionSchemas() {
  return useQuery({
    queryKey: ['data-collection-schemas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_collection_schemas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DataCollectionSchema[];
    }
  });
}

// Fetch sections for a schema
export function useDataCollectionSections(schemaId: string | undefined) {
  return useQuery({
    queryKey: ['data-collection-sections', schemaId],
    queryFn: async () => {
      if (!schemaId) return [];

      const { data, error } = await supabase
        .from('data_collection_sections')
        .select('*')
        .eq('schema_id', schemaId)
        .order('order_position');

      if (error) throw error;
      return data as DataCollectionSection[];
    },
    enabled: !!schemaId
  });
}

// Fetch fields for a section
export function useDataCollectionFields(sectionId: string | undefined) {
  return useQuery({
    queryKey: ['data-collection-fields', sectionId],
    queryFn: async () => {
      if (!sectionId) return [];

      const { data, error } = await supabase
        .from('data_collection_fields')
        .select('*')
        .eq('section_id', sectionId)
        .order('order_position');

      if (error) throw error;
      return (data || []).map(parseField);
    },
    enabled: !!sectionId
  });
}

// Create section
export function useCreateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DataCollectionSectionFormData) => {
      const { data: section, error } = await supabase
        .from('data_collection_sections')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return section;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-collection-schema'] });
      queryClient.invalidateQueries({ queryKey: ['data-collection-sections'] });
      toast.success('Seção criada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar seção: ' + error.message);
    }
  });
}

// Update section
export function useUpdateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DataCollectionSection> & { id: string }) => {
      const { data: section, error } = await supabase
        .from('data_collection_sections')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return section;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-collection-schema'] });
      queryClient.invalidateQueries({ queryKey: ['data-collection-sections'] });
      toast.success('Seção atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar seção: ' + error.message);
    }
  });
}

// Delete section
export function useDeleteSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('data_collection_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-collection-schema'] });
      queryClient.invalidateQueries({ queryKey: ['data-collection-sections'] });
      toast.success('Seção excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir seção: ' + error.message);
    }
  });
}

// Create field
export function useCreateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DataCollectionFieldFormData) => {
      const insertData = {
        ...data,
        options: data.options as Json,
        validation: data.validation as Json,
        default_value: data.default_value as Json,
        conditional_on: data.conditional_on as unknown as Json
      };

      const { data: field, error } = await supabase
        .from('data_collection_fields')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return field;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-collection-schema'] });
      queryClient.invalidateQueries({ queryKey: ['data-collection-fields'] });
      toast.success('Campo criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar campo: ' + error.message);
    }
  });
}

// Update field
export function useUpdateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DataCollectionFieldFormData> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...data };
      if (data.options) updateData.options = data.options as Json;
      if (data.validation) updateData.validation = data.validation as Json;
      if (data.default_value !== undefined) updateData.default_value = data.default_value as Json;
      if (data.conditional_on !== undefined) updateData.conditional_on = data.conditional_on as unknown as Json;

      const { data: field, error } = await supabase
        .from('data_collection_fields')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return field;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-collection-schema'] });
      queryClient.invalidateQueries({ queryKey: ['data-collection-fields'] });
      toast.success('Campo atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar campo: ' + error.message);
    }
  });
}

// Delete field
export function useDeleteField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('data_collection_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-collection-schema'] });
      queryClient.invalidateQueries({ queryKey: ['data-collection-fields'] });
      toast.success('Campo excluído');
    },
    onError: (error) => {
      toast.error('Erro ao excluir campo: ' + error.message);
    }
  });
}

// Reorder sections
export function useReorderSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sections: { id: string; order_position: number }[]) => {
      const updates = sections.map(({ id, order_position }) =>
        supabase
          .from('data_collection_sections')
          .update({ order_position })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-collection-schema'] });
      queryClient.invalidateQueries({ queryKey: ['data-collection-sections'] });
    }
  });
}

// Reorder fields
export function useReorderFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fields: { id: string; order_position: number }[]) => {
      const updates = fields.map(({ id, order_position }) =>
        supabase
          .from('data_collection_fields')
          .update({ order_position })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-collection-schema'] });
      queryClient.invalidateQueries({ queryKey: ['data-collection-fields'] });
    }
  });
}
