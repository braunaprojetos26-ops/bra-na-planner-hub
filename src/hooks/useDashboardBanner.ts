import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardBannerConfig {
  image_url: string | null;
  overlay_text: string;
  link_url: string | null;
  is_active: boolean;
}

export function useDashboardBanner() {
  return useQuery({
    queryKey: ['dashboard-banner'],
    queryFn: async (): Promise<DashboardBannerConfig | null> => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'dashboard_banner')
        .single();

      if (error) {
        console.error('Error fetching dashboard banner config:', error);
        return null;
      }

      return data?.value as unknown as DashboardBannerConfig;
    }
  });
}

export function useUpdateDashboardBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<DashboardBannerConfig>) => {
      // First get current config
      const { data: current } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'dashboard_banner')
        .single();

      const currentConfig = (current?.value as unknown as DashboardBannerConfig) || {
        image_url: null,
        overlay_text: '',
        link_url: null,
        is_active: true
      };

      const newConfig = { ...currentConfig, ...config };

      const { error } = await supabase
        .from('app_config')
        .update({ 
          value: JSON.parse(JSON.stringify(newConfig)),
          updated_at: new Date().toISOString()
        })
        .eq('key', 'dashboard_banner');

      if (error) throw error;
      return newConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-banner'] });
    }
  });
}
