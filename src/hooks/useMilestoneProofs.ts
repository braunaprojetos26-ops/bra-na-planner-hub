import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MilestoneProof {
  id: string;
  milestone_id: string;
  proof_type: 'text' | 'image' | 'file';
  text_content: string | null;
  file_path: string | null;
  file_name: string | null;
  created_by: string;
  created_at: string;
}

export function useMilestoneProofs(milestoneId: string | undefined) {
  return useQuery({
    queryKey: ['milestone-proofs', milestoneId],
    enabled: !!milestoneId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestone_proofs')
        .select('*')
        .eq('milestone_id', milestoneId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MilestoneProof[];
    },
  });
}

export function useCreateMilestoneProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      milestoneId: string;
      contactId: string;
      proofType: 'text' | 'image' | 'file';
      textContent?: string;
      file?: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let filePath: string | null = null;
      let fileName: string | null = null;

      if (params.file && (params.proofType === 'image' || params.proofType === 'file')) {
        const ext = params.file.name.split('.').pop();
        const path = `${params.contactId}/${params.milestoneId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('milestone-proofs')
          .upload(path, params.file);
        if (uploadError) throw uploadError;
        filePath = path;
        fileName = params.file.name;
      }

      const { data, error } = await supabase
        .from('milestone_proofs')
        .insert({
          milestone_id: params.milestoneId,
          proof_type: params.proofType,
          text_content: params.proofType === 'text' ? params.textContent : null,
          file_path: filePath,
          file_name: fileName,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['milestone-proofs', vars.milestoneId] });
      queryClient.invalidateQueries({ queryKey: ['goal-milestones', vars.contactId] });
    },
  });
}
