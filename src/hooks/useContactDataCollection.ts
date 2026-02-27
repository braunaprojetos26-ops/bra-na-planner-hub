import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContactDataCollection, DataCollectionStatus, ValidationResult, DataCollectionField } from '@/types/dataCollection';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

const DEFAULT_SCHEMA_ID = 'a0000000-0000-0000-0000-000000000001';

// Fetch data collection for a contact
export function useContactDataCollection(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-data-collection', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from('contact_data_collections')
        .select('*')
        .eq('contact_id', contactId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        ...data,
        data_collection: (data.data_collection || {}) as Record<string, unknown>
      } as ContactDataCollection;
    },
    enabled: !!contactId
  });
}

// Create or get existing data collection
export function useCreateDataCollection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Check if already exists
      const { data: existing } = await supabase
        .from('contact_data_collections')
        .select('id')
        .eq('contact_id', contactId)
        .maybeSingle();

      if (existing) {
        return existing;
      }

      // Create new (use upsert to handle race conditions)
      const { data, error } = await supabase
        .from('contact_data_collections')
        .upsert({
          contact_id: contactId,
          schema_id: DEFAULT_SCHEMA_ID,
          collected_by: user.id,
          status: 'draft',
          data_collection: {} as Json
        }, { onConflict: 'contact_id', ignoreDuplicates: true })
        .select()
        .single();

      // If upsert returned nothing (ignored duplicate), fetch existing
      if (!data && !error) {
        const { data: existingData } = await supabase
          .from('contact_data_collections')
          .select('*')
          .eq('contact_id', contactId)
          .single();
        return existingData;
      }

      if (error) throw error;
      return data;
    },
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({ queryKey: ['contact-data-collection', contactId] });
    },
    onError: (error) => {
      toast.error('Erro ao criar coleta: ' + error.message);
    }
  });
}

// Update data collection (auto-save)
export function useUpdateDataCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data_collection 
    }: { 
      id: string; 
      data_collection: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('contact_data_collections')
        .update({ 
          data_collection: data_collection as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        data_collection: (data.data_collection || {}) as Record<string, unknown>
      } as ContactDataCollection;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['contact-data-collection', data.contact_id], 
        data
      );
    }
  });
}

// Save draft (same as update but with toast)
export function useSaveDataCollectionDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data_collection 
    }: { 
      id: string; 
      data_collection: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('contact_data_collections')
        .update({ 
          data_collection: data_collection as Json,
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        data_collection: (data.data_collection || {}) as Record<string, unknown>
      } as ContactDataCollection;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['contact-data-collection', data.contact_id], 
        data
      );
      toast.success('Rascunho salvo');
    },
    onError: (error) => {
      toast.error('Erro ao salvar rascunho: ' + error.message);
    }
  });
}

// Complete data collection
export function useCompleteDataCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data_collection 
    }: { 
      id: string; 
      data_collection: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('contact_data_collections')
        .update({ 
          data_collection: data_collection as Json,
          status: 'completed',
          collected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        data_collection: (data.data_collection || {}) as Record<string, unknown>
      } as ContactDataCollection;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['contact-data-collection', data.contact_id], 
        data
      );
      toast.success('Coleta de dados concluída!');
    },
    onError: (error) => {
      toast.error('Erro ao concluir coleta: ' + error.message);
    }
  });
}

// Helper function to get value from nested path
export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  
  return current;
}

// Helper function to set value at nested path
export function setValueByPath(
  obj: Record<string, unknown>, 
  path: string, 
  value: unknown
): Record<string, unknown> {
  const keys = path.split('.');
  const result = { ...obj };
  let current = result;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    } else {
      current[key] = { ...(current[key] as Record<string, unknown>) };
    }
    current = current[key] as Record<string, unknown>;
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
}

// Validate data collection against required fields
export function validateDataCollection(
  data: Record<string, unknown>,
  fields: DataCollectionField[]
): ValidationResult {
  const errors: Record<string, string> = {};
  let completedRequiredFields = 0;
  let totalRequiredFields = 0;

  const requiredFields = fields.filter(f => f.is_required);
  totalRequiredFields = requiredFields.length;

  for (const field of requiredFields) {
    const value = getValueByPath(data, field.data_path);
    
    if (value === undefined || value === null || value === '') {
      errors[field.data_path] = `${field.label} é obrigatório`;
    } else if (Array.isArray(value) && value.length === 0) {
      errors[field.data_path] = `${field.label} deve ter pelo menos 1 item`;
    } else {
      completedRequiredFields++;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    completedRequiredFields,
    totalRequiredFields
  };
}
