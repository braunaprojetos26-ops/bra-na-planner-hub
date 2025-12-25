import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SystemSetting } from '@/types/dataCollection';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

// Fetch a system setting by key
export function useSystemSetting(key: string) {
  return useQuery({
    queryKey: ['system-setting', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        ...data,
        value: (data.value || {}) as Record<string, unknown>
      } as SystemSetting;
    }
  });
}

// Fetch all system settings
export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        value: (item.value || {}) as Record<string, unknown>
      })) as SystemSetting[];
    }
  });
}

// Update system setting
export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      key, 
      value, 
      description 
    }: { 
      key: string; 
      value: Record<string, unknown>;
      description?: string;
    }) => {
      // Try to update first
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('system_settings')
          .update({ 
            value: value as Json, 
            description 
          })
          .eq('key', key)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('system_settings')
          .insert({ 
            key, 
            value: value as Json, 
            description 
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-setting', variables.key] });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Configuração salva');
    },
    onError: (error) => {
      toast.error('Erro ao salvar configuração: ' + error.message);
    }
  });
}
