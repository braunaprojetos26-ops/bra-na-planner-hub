import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { TrainingLesson, TrainingLessonWithProgress, TrainingLessonMaterial } from '@/types/training';

export function useTrainingLessons(moduleId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['training-lessons', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];

      const { data, error } = await supabase
        .from('training_lessons')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      return data as TrainingLesson[];
    },
    enabled: !!moduleId,
  });

  const { data: lessonsWithProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['training-lessons-with-progress', moduleId, user?.id],
    queryFn: async () => {
      if (!moduleId || !user?.id) return [];

      // Get lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('training_lessons')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (lessonsError) throw lessonsError;

      const lessonIds = lessonsData?.map(l => l.id) || [];

      // Get user's progress
      const { data: progress, error: progressError } = await supabase
        .from('training_lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds);

      if (progressError) throw progressError;

      const completedLessonIds = new Set(progress?.map(p => p.lesson_id) || []);

      // Get materials
      const { data: materials, error: materialsError } = await supabase
        .from('training_lesson_materials')
        .select('*')
        .in('lesson_id', lessonIds)
        .order('order_position', { ascending: true });

      if (materialsError) throw materialsError;

      return (lessonsData as TrainingLesson[]).map(lesson => ({
        ...lesson,
        materials: materials?.filter(m => m.lesson_id === lesson.id) as TrainingLessonMaterial[] || [],
        isCompleted: completedLessonIds.has(lesson.id),
      })) as TrainingLessonWithProgress[];
    },
    enabled: !!moduleId && !!user?.id,
  });

  const createLesson = useMutation({
    mutationFn: async (data: Partial<TrainingLesson>) => {
      const { data: result, error } = await supabase
        .from('training_lessons')
        .insert({
          module_id: moduleId!,
          name: data.name!,
          description: data.description,
          youtube_video_id: data.youtube_video_id,
          duration_minutes: data.duration_minutes || 0,
          order_position: data.order_position || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-lessons', moduleId] });
      toast({ title: 'Aula criada com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar aula', description: error.message, variant: 'destructive' });
    },
  });

  const updateLesson = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TrainingLesson> & { id: string }) => {
      const { error } = await supabase
        .from('training_lessons')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-lessons', moduleId] });
      toast({ title: 'Aula atualizada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar aula', description: error.message, variant: 'destructive' });
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_lessons')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-lessons', moduleId] });
      toast({ title: 'Aula desativada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao desativar aula', description: error.message, variant: 'destructive' });
    },
  });

  const markLessonComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from('training_lesson_progress')
        .upsert({
          user_id: user?.id,
          lesson_id: lessonId,
        }, { onConflict: 'user_id,lesson_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-lessons-with-progress', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['training-modules-with-progress'] });
      queryClient.invalidateQueries({ queryKey: ['training-courses-with-progress'] });
      toast({ title: 'Aula marcada como concluída!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao marcar aula', description: error.message, variant: 'destructive' });
    },
  });

  const unmarkLessonComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from('training_lesson_progress')
        .delete()
        .eq('user_id', user?.id)
        .eq('lesson_id', lessonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-lessons-with-progress', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['training-modules-with-progress'] });
      queryClient.invalidateQueries({ queryKey: ['training-courses-with-progress'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao desmarcar aula', description: error.message, variant: 'destructive' });
    },
  });

  return {
    lessons,
    lessonsWithProgress,
    isLoading: isLoading || isLoadingProgress,
    createLesson,
    updateLesson,
    deleteLesson,
    markLessonComplete,
    unmarkLessonComplete,
  };
}
