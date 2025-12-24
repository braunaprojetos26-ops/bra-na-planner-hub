import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PlannerProfile {
  id: string;
  user_id: string;
  photo_url: string | null;
  professional_title: string | null;
  career_achievements: string | null;
  life_achievements: string | null;
  education: string | null;
  certifications: string | null;
  display_name: string | null;
  instagram_handle: string | null;
  created_at: string;
  updated_at: string;
}

export function usePlannerProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['planner-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('planner_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as PlannerProfile | null;
    },
    enabled: !!userId,
  });
}

export function useMyPlannerProfile() {
  const { user } = useAuth();
  return usePlannerProfile(user?.id);
}

export interface UpdatePlannerProfileData {
  photo_url?: string | null;
  professional_title?: string | null;
  career_achievements?: string | null;
  life_achievements?: string | null;
  education?: string | null;
  certifications?: string | null;
  display_name?: string | null;
  instagram_handle?: string | null;
}

export function useUpdatePlannerProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdatePlannerProfileData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Check if profile exists
      const { data: existing } = await supabase
        .from('planner_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data: updated, error } = await supabase
          .from('planner_profiles')
          .update(data)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Insert new
        const { data: created, error } = await supabase
          .from('planner_profiles')
          .insert({
            user_id: user.id,
            ...data,
          })
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-profile'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating planner profile:', error);
      toast.error('Erro ao atualizar perfil');
    },
  });
}

export function useUploadPlannerPhoto() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('planner-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('planner-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onError: (error) => {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao fazer upload da foto');
    },
  });
}
