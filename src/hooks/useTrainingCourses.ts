import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { TrainingCourse, TrainingCourseWithProgress } from '@/types/training';

export function useTrainingCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['training-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) throw error;
      return data as TrainingCourse[];
    },
    enabled: !!user,
  });

  const { data: coursesWithProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['training-courses-with-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('training_courses')
        .select('*')
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (coursesError) throw coursesError;

      // Get enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('training_course_enrollments')
        .select('*')
        .eq('user_id', user.id);

      if (enrollmentsError) throw enrollmentsError;

      // Get all lessons count per course
      const { data: modules, error: modulesError } = await supabase
        .from('training_modules')
        .select('id, course_id')
        .eq('is_active', true);

      if (modulesError) throw modulesError;

      const { data: lessons, error: lessonsError } = await supabase
        .from('training_lessons')
        .select('id, module_id')
        .eq('is_active', true);

      if (lessonsError) throw lessonsError;

      // Get user's progress
      const { data: progress, error: progressError } = await supabase
        .from('training_lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      const completedLessonIds = new Set(progress?.map(p => p.lesson_id) || []);

      // Calculate progress for each course
      return (coursesData as TrainingCourse[]).map(course => {
        const courseModuleIds = modules
          ?.filter(m => m.course_id === course.id)
          .map(m => m.id) || [];

        const courseLessons = lessons?.filter(l => 
          courseModuleIds.includes(l.module_id)
        ) || [];

        const totalLessons = courseLessons.length;
        const completedLessons = courseLessons.filter(l => 
          completedLessonIds.has(l.id)
        ).length;

        const enrollment = enrollments?.find(e => e.course_id === course.id);

        return {
          ...course,
          enrollment: enrollment || null,
          totalLessons,
          completedLessons,
          progressPercentage: totalLessons > 0 
            ? Math.round((completedLessons / totalLessons) * 100) 
            : 0,
        } as TrainingCourseWithProgress;
      });
    },
    enabled: !!user?.id,
  });

  const createCourse = useMutation({
    mutationFn: async (data: Partial<TrainingCourse>) => {
      const { data: result, error } = await supabase
        .from('training_courses')
        .insert({
          name: data.name!,
          description: data.description,
          thumbnail_url: data.thumbnail_url,
          target_roles: data.target_roles || ['planejador'],
          order_position: data.order_position || 0,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      toast({ title: 'Curso criado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar curso', description: error.message, variant: 'destructive' });
    },
  });

  const updateCourse = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TrainingCourse> & { id: string }) => {
      const { error } = await supabase
        .from('training_courses')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      toast({ title: 'Curso atualizado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar curso', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_courses')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      toast({ title: 'Curso desativado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao desativar curso', description: error.message, variant: 'destructive' });
    },
  });

  const enrollInCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('training_course_enrollments')
        .insert({
          user_id: user?.id,
          course_id: courseId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses-with-progress'] });
      toast({ title: 'Matrícula realizada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao matricular', description: error.message, variant: 'destructive' });
    },
  });

  return {
    courses,
    coursesWithProgress,
    isLoading: isLoading || isLoadingProgress,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollInCourse,
  };
}
