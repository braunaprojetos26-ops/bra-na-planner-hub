import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InstitutionalPresentation {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  is_active: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useActivePresentation() {
  return useQuery({
    queryKey: ['institutional-presentation', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutional_presentations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data as InstitutionalPresentation | null;
    },
  });
}

// Static presentation URL fallback (from public folder)
export function getStaticPresentationUrl(): string {
  return '/presentations/apresentacao-institucional-brauna.pdf';
}
