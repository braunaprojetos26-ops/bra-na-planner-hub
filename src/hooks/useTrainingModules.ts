import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { TrainingModule, TrainingModuleWithProgress } from '@/types/training';

export function useTrainingModules(courseId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modules, isLoading } = useQuery({
    queryKey: ['training-modules', courseId],
    queryFn: async () => {
      if (!courseId) return [];

      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      return data as TrainingModule[];
    },
    enabled: !!courseId,
  });

  const { data: modulesWithProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['training-modules-with-progress', courseId, user?.id],
    queryFn: async () => {
      if (!courseId || !user?.id) return [];

      // Get modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('training_modules')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (modulesError) throw modulesError;

      const moduleIds = modulesData?.map(m => m.id) || [];

      // Get lessons
      const { data: lessons, error: lessonsError } = await supabase
        .from('training_lessons')
        .select('id, module_id')
        .in('module_id', moduleIds)
        .eq('is_active', true);

      if (lessonsError) throw lessonsError;

      // Get user's lesson progress
      const lessonIds = lessons?.map(l => l.id) || [];
      const { data: progress, error: progressError } = await supabase
        .from('training_lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds);

      if (progressError) throw progressError;

      const completedLessonIds = new Set(progress?.map(p => p.lesson_id) || []);

      // Get exams
      const { data: exams, error: examsError } = await supabase
        .from('training_exams')
        .select('*')
        .in('module_id', moduleIds)
        .eq('is_active', true);

      if (examsError) throw examsError;

      // Get user's exam attempts (best score per exam)
      const examIds = exams?.map(e => e.id) || [];
      const { data: attempts, error: attemptsError } = await supabase
        .from('training_exam_attempts')
        .select('*')
        .eq('user_id', user.id)
        .in('exam_id', examIds)
        .not('completed_at', 'is', null)
        .order('score', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Get practical grades
      const { data: practicalGrades, error: gradesError } = await supabase
        .from('training_practical_grades')
        .select('*')
        .eq('user_id', user.id)
        .in('module_id', moduleIds);

      if (gradesError) throw gradesError;

      // Calculate progress for each module
      return (modulesData as TrainingModule[]).map((module, index) => {
        const moduleLessons = lessons?.filter(l => l.module_id === module.id) || [];
        const totalLessons = moduleLessons.length;
        const completedLessons = moduleLessons.filter(l => 
          completedLessonIds.has(l.id)
        ).length;

        const exam = exams?.find(e => e.module_id === module.id);
        const bestAttempt = exam 
          ? attempts?.find(a => a.exam_id === exam.id)
          : null;
        const examPassed = bestAttempt?.passed ?? null;

        const practicalGrade = practicalGrades?.find(g => g.module_id === module.id);

        const allLessonsCompleted = totalLessons > 0 && completedLessons === totalLessons;
        const examCompleted = !exam || examPassed === true;
        const practicalCompleted = !module.has_practical_exam || practicalGrade?.passed === true;
        const isCompleted = allLessonsCompleted && examCompleted && practicalCompleted;

        // Module is locked if previous module is not completed
        const prevModule = index > 0 ? modulesData[index - 1] : null;
        let isLocked = false;
        // For simplicity, we'll calculate this after all modules are processed
        // This is handled in a second pass below

        return {
          ...module,
          exam: exam || null,
          practicalGrade: practicalGrade || null,
          totalLessons,
          completedLessons,
          examPassed,
          isCompleted,
          isLocked: false, // Will be set in second pass
        } as TrainingModuleWithProgress;
      }).map((module, index, arr) => {
        // Second pass: set isLocked based on previous module
        if (index === 0) return module;
        const prevModule = arr[index - 1];
        return {
          ...module,
          isLocked: !prevModule.isCompleted,
        };
      });
    },
    enabled: !!courseId && !!user?.id,
  });

  const createModule = useMutation({
    mutationFn: async (data: Partial<TrainingModule>) => {
      const { data: result, error } = await supabase
        .from('training_modules')
        .insert({
          course_id: courseId!,
          name: data.name!,
          description: data.description,
          order_position: data.order_position || 0,
          deadline_days: data.deadline_days || 30,
          has_practical_exam: data.has_practical_exam || false,
          passing_score: data.passing_score || 70,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules', courseId] });
      toast({ title: 'Módulo criado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar módulo', description: error.message, variant: 'destructive' });
    },
  });

  const updateModule = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TrainingModule> & { id: string }) => {
      const { error } = await supabase
        .from('training_modules')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules', courseId] });
      toast({ title: 'Módulo atualizado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar módulo', description: error.message, variant: 'destructive' });
    },
  });

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_modules')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules', courseId] });
      toast({ title: 'Módulo desativado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao desativar módulo', description: error.message, variant: 'destructive' });
    },
  });

  return {
    modules,
    modulesWithProgress,
    isLoading: isLoading || isLoadingProgress,
    createModule,
    updateModule,
    deleteModule,
  };
}
