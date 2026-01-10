import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TrainingLessonMaterial } from '@/types/training';

export function useTrainingMaterials(lessonId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materials, isLoading } = useQuery({
    queryKey: ['training-materials', lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      const { data, error } = await supabase
        .from('training_lesson_materials')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_position', { ascending: true });
      if (error) throw error;
      return data as TrainingLessonMaterial[];
    },
    enabled: !!lessonId,
  });

  const uploadMaterial = useMutation({
    mutationFn: async ({ lessonId: lid, file }: { lessonId: string; file: File }) => {
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();

      const filePath = `lessons/${lid}/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('training-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: material, error: insertError } = await supabase
        .from('training_lesson_materials')
        .insert({
          lesson_id: lid,
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return material;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-materials', lessonId] });
      toast({ title: 'Material enviado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao enviar material', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async (material: TrainingLessonMaterial) => {
      const { error: storageError } = await supabase.storage
        .from('training-materials')
        .remove([material.file_path]);

      if (storageError) throw storageError;

      const { error: deleteError } = await supabase
        .from('training_lesson_materials')
        .delete()
        .eq('id', material.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-materials', lessonId] });
      toast({ title: 'Material removido!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover material', description: error.message, variant: 'destructive' });
    },
  });

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('training-materials')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  return {
    materials,
    isLoading,
    uploadMaterial,
    deleteMaterial,
    getPublicUrl,
  };
}
