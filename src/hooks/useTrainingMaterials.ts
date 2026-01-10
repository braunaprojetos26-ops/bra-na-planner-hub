import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TrainingLessonMaterial } from '@/types/training';

export function useTrainingMaterials(lessonId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMaterial = useMutation({
    mutationFn: async ({ file, name }: { file: File; name: string }) => {
      if (!lessonId) throw new Error('Lesson ID required');

      // Sanitize filename
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();

      const filePath = `lessons/${lessonId}/${Date.now()}-${sanitizedName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('training-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create material record
      const { data: material, error: insertError } = await supabase
        .from('training_lesson_materials')
        .insert({
          lesson_id: lessonId,
          name,
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
      queryClient.invalidateQueries({ queryKey: ['training-lessons-with-progress'] });
      toast({ title: 'Material enviado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao enviar material', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async (material: TrainingLessonMaterial) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('training-materials')
        .remove([material.file_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error: deleteError } = await supabase
        .from('training_lesson_materials')
        .delete()
        .eq('id', material.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-lessons-with-progress'] });
      toast({ title: 'Material removido!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover material', description: error.message, variant: 'destructive' });
    },
  });

  const getMaterialUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('training-materials')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  return {
    uploadMaterial,
    deleteMaterial,
    getMaterialUrl,
  };
}
