import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { TrainingPracticalGrade, TrainingModule } from '@/types/training';

interface PendingPracticalEvaluation {
  userId: string;
  userName: string;
  moduleId: string;
  moduleName: string;
  courseName: string;
  enrolledAt: string;
}

export function useTrainingPractical() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isTrainer = profile?.is_trainer === true;

  // Get pending practical evaluations for trainers
  const { data: pendingEvaluations, isLoading: isLoadingPending } = useQuery({
    queryKey: ['training-pending-practicals'],
    queryFn: async () => {
      // Get all modules with has_practical_exam = true
      const { data: modules, error: modulesError } = await supabase
        .from('training_modules')
        .select(`
          id, name, course_id, passing_score,
          training_courses!inner(id, name)
        `)
        .eq('has_practical_exam', true)
        .eq('is_active', true);

      if (modulesError) throw modulesError;
      if (!modules || modules.length === 0) return [];

      const moduleIds = modules.map(m => m.id);

      // Get existing grades
      const { data: grades, error: gradesError } = await supabase
        .from('training_practical_grades')
        .select('user_id, module_id')
        .in('module_id', moduleIds);

      if (gradesError) throw gradesError;

      const gradedSet = new Set(grades?.map(g => `${g.user_id}-${g.module_id}`) || []);

      // Get enrolled users who completed all lessons but don't have a grade
      const courseIds = [...new Set(modules.map(m => m.course_id))];
      
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('training_course_enrollments')
        .select(`
          user_id, course_id, enrolled_at,
          profiles!inner(full_name)
        `)
        .in('course_id', courseIds);

      if (enrollmentsError) throw enrollmentsError;

      // For each enrollment, check if they need evaluation
      const pending: PendingPracticalEvaluation[] = [];

      for (const enrollment of enrollments || []) {
        const courseModules = modules.filter(m => m.course_id === enrollment.course_id);
        
        for (const module of courseModules) {
          const key = `${enrollment.user_id}-${module.id}`;
          if (gradedSet.has(key)) continue;

          // Check if user completed all lessons in this module
          const { data: lessons, error: lessonsError } = await supabase
            .from('training_lessons')
            .select('id')
            .eq('module_id', module.id)
            .eq('is_active', true);

          if (lessonsError) continue;

          const { data: progress, error: progressError } = await supabase
            .from('training_lesson_progress')
            .select('lesson_id')
            .eq('user_id', enrollment.user_id)
            .in('lesson_id', lessons?.map(l => l.id) || []);

          if (progressError) continue;

          // If all lessons completed, add to pending
          if (lessons && progress && lessons.length > 0 && progress.length >= lessons.length) {
            pending.push({
              userId: enrollment.user_id,
              userName: (enrollment as any).profiles?.full_name || 'Usuário',
              moduleId: module.id,
              moduleName: module.name,
              courseName: (module as any).training_courses?.name || 'Curso',
              enrolledAt: enrollment.enrolled_at,
            });
          }
        }
      }

      return pending;
    },
    enabled: isTrainer,
  });

  const submitGrade = useMutation({
    mutationFn: async ({ 
      userId, 
      moduleId, 
      grade, 
      feedbackText 
    }: { 
      userId: string; 
      moduleId: string; 
      grade: number; 
      feedbackText?: string;
    }) => {
      // Get module's passing score
      const { data: module, error: moduleError } = await supabase
        .from('training_modules')
        .select('passing_score')
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;

      const passed = (grade * 10) >= (module?.passing_score || 70);

      const { error } = await supabase
        .from('training_practical_grades')
        .insert({
          user_id: userId,
          module_id: moduleId,
          trainer_id: user?.id,
          grade,
          feedback_text: feedbackText,
          passed,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-pending-practicals'] });
      queryClient.invalidateQueries({ queryKey: ['training-modules-with-progress'] });
      toast({ title: 'Avaliação registrada com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao registrar avaliação', description: error.message, variant: 'destructive' });
    },
  });

  return {
    pendingEvaluations,
    isLoadingPending,
    isTrainer,
    submitGrade,
  };
}
