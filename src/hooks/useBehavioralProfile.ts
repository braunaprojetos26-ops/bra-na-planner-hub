import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BehavioralProfile {
  id: string;
  userId: string;
  // DISC scores (0-100)
  executorScore: number | null;
  comunicadorScore: number | null;
  planejadorScore: number | null;
  analistaScore: number | null;
  // Indicators
  energyLevel: string | null;
  externalDemand: string | null;
  selfConfidence: string | null;
  selfEsteem: string | null;
  flexibility: string | null;
  autoMotivation: string | null;
  // Textual descriptions
  leadershipStyle: string | null;
  communicationStyle: string | null;
  workEnvironment: string | null;
  decisionMaking: string | null;
  motivationalFactors: string | null;
  distancingFactors: string | null;
  strengths: string | null;
  areasToDevlop: string | null;
  // Metadata
  profileDate: string | null;
  rawReportUrl: string | null;
  extractedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useBehavioralProfile(userId: string) {
  return useQuery({
    queryKey: ['behavioral-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_behavioral_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        id: data.id,
        userId: data.user_id,
        executorScore: data.executor_score ? Number(data.executor_score) : null,
        comunicadorScore: data.comunicador_score ? Number(data.comunicador_score) : null,
        planejadorScore: data.planejador_score ? Number(data.planejador_score) : null,
        analistaScore: data.analista_score ? Number(data.analista_score) : null,
        energyLevel: data.energy_level,
        externalDemand: data.external_demand,
        selfConfidence: data.self_confidence,
        selfEsteem: data.self_esteem,
        flexibility: data.flexibility,
        autoMotivation: data.auto_motivation,
        leadershipStyle: data.leadership_style,
        communicationStyle: data.communication_style,
        workEnvironment: data.work_environment,
        decisionMaking: data.decision_making,
        motivationalFactors: data.motivational_factors,
        distancingFactors: data.distancing_factors,
        strengths: data.strengths,
        areasToDevlop: data.areas_to_develop,
        profileDate: data.profile_date,
        rawReportUrl: data.raw_report_url,
        extractedAt: data.extracted_at,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } as BehavioralProfile;
    },
    enabled: !!userId,
  });
}

// Sanitize filename to remove accents and special characters
function sanitizeFileName(fileName: string): string {
  // Remove accents/diacritics
  const normalized = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Replace spaces with hyphens
  const withHyphens = normalized.replace(/\s+/g, '-');
  // Remove characters that are not alphanumeric, dots, hyphens, or underscores
  const cleaned = withHyphens.replace(/[^a-zA-Z0-9._-]/g, '');
  // Ensure .pdf extension
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned.toLowerCase() : cleaned.toLowerCase() + '.pdf';
}

export function useUploadBehavioralProfilePDF() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      // Sanitize filename to prevent storage errors with accents/special characters
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${userId}/${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage
        .from('behavioral-profiles')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('behavioral-profiles')
        .getPublicUrl(fileName);

      // Call AI to extract data from PDF
      const { data: extractionData, error: extractionError } = await supabase.functions
        .invoke('ai-leadership-coach', {
          body: {
            action: 'extract_profile',
            pdfUrl: publicUrl,
            userId,
          },
        });

      if (extractionError) throw extractionError;

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('planner_behavioral_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const profileData = {
        user_id: userId,
        executor_score: extractionData.executorScore,
        comunicador_score: extractionData.comunicadorScore,
        planejador_score: extractionData.planejadorScore,
        analista_score: extractionData.analistaScore,
        energy_level: extractionData.energyLevel,
        external_demand: extractionData.externalDemand,
        self_confidence: extractionData.selfConfidence,
        self_esteem: extractionData.selfEsteem,
        flexibility: extractionData.flexibility,
        auto_motivation: extractionData.autoMotivation,
        leadership_style: extractionData.leadershipStyle,
        communication_style: extractionData.communicationStyle,
        work_environment: extractionData.workEnvironment,
        decision_making: extractionData.decisionMaking,
        motivational_factors: extractionData.motivationalFactors,
        distancing_factors: extractionData.distancingFactors,
        strengths: extractionData.strengths,
        areas_to_develop: extractionData.areasToDevlop,
        profile_date: extractionData.profileDate || new Date().toISOString().split('T')[0],
        raw_report_url: publicUrl,
        extracted_at: new Date().toISOString(),
        created_by: user!.id,
      };

      if (existingProfile) {
        const { error } = await supabase
          .from('planner_behavioral_profiles')
          .update(profileData)
          .eq('id', existingProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('planner_behavioral_profiles')
          .insert(profileData);
        if (error) throw error;
      }

      return { publicUrl };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['behavioral-profile', variables.userId] });
      toast.success('Perfil comportamental extraído com sucesso!');
    },
    onError: (error) => {
      console.error('Error uploading profile:', error);
      toast.error('Erro ao processar perfil comportamental');
    },
  });
}

export function useUpdateBehavioralProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<BehavioralProfile> & { userId: string }) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.executorScore !== undefined) updateData.executor_score = data.executorScore;
      if (data.comunicadorScore !== undefined) updateData.comunicador_score = data.comunicadorScore;
      if (data.planejadorScore !== undefined) updateData.planejador_score = data.planejadorScore;
      if (data.analistaScore !== undefined) updateData.analista_score = data.analistaScore;
      if (data.energyLevel !== undefined) updateData.energy_level = data.energyLevel;
      if (data.externalDemand !== undefined) updateData.external_demand = data.externalDemand;
      if (data.selfConfidence !== undefined) updateData.self_confidence = data.selfConfidence;
      if (data.selfEsteem !== undefined) updateData.self_esteem = data.selfEsteem;
      if (data.flexibility !== undefined) updateData.flexibility = data.flexibility;
      if (data.autoMotivation !== undefined) updateData.auto_motivation = data.autoMotivation;
      if (data.leadershipStyle !== undefined) updateData.leadership_style = data.leadershipStyle;
      if (data.communicationStyle !== undefined) updateData.communication_style = data.communicationStyle;
      if (data.workEnvironment !== undefined) updateData.work_environment = data.workEnvironment;
      if (data.decisionMaking !== undefined) updateData.decision_making = data.decisionMaking;
      if (data.motivationalFactors !== undefined) updateData.motivational_factors = data.motivationalFactors;
      if (data.distancingFactors !== undefined) updateData.distancing_factors = data.distancingFactors;
      if (data.strengths !== undefined) updateData.strengths = data.strengths;
      if (data.areasToDevlop !== undefined) updateData.areas_to_develop = data.areasToDevlop;

      const { error } = await supabase
        .from('planner_behavioral_profiles')
        .update(updateData)
        .eq('user_id', data.userId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['behavioral-profile', variables.userId] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar perfil');
    },
  });
}
