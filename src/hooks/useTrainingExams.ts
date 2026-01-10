import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { TrainingExam, TrainingExamQuestion, TrainingExamAttempt } from '@/types/training';

export function useTrainingExams(moduleId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exam, isLoading: isLoadingExam } = useQuery({
    queryKey: ['training-exam', moduleId],
    queryFn: async () => {
      if (!moduleId) return null;

      const { data, error } = await supabase
        .from('training_exams')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as TrainingExam | null;
    },
    enabled: !!moduleId,
  });

  const { data: questions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['training-exam-questions', exam?.id],
    queryFn: async () => {
      if (!exam?.id) return [];

      const { data, error } = await supabase
        .from('training_exam_questions')
        .select('*')
        .eq('exam_id', exam.id)
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      return data.map(q => ({
        ...q,
        options: q.options as { label: string; value: string }[],
      })) as TrainingExamQuestion[];
    },
    enabled: !!exam?.id,
  });

  const { data: attempts, isLoading: isLoadingAttempts } = useQuery({
    queryKey: ['training-exam-attempts', exam?.id, user?.id],
    queryFn: async () => {
      if (!exam?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from('training_exam_attempts')
        .select('*')
        .eq('exam_id', exam.id)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data.map(a => ({
        ...a,
        answers: a.answers as { question_id: string; answer: string }[],
      })) as TrainingExamAttempt[];
    },
    enabled: !!exam?.id && !!user?.id,
  });

  const bestAttempt = attempts?.find(a => a.completed_at && a.passed) 
    || attempts?.find(a => a.completed_at);

  const createExam = useMutation({
    mutationFn: async (data: Partial<TrainingExam>) => {
      const { data: result, error } = await supabase
        .from('training_exams')
        .insert({
          module_id: moduleId!,
          name: data.name || 'Prova do Módulo',
          time_limit_minutes: data.time_limit_minutes,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-exam', moduleId] });
      toast({ title: 'Prova criada com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar prova', description: error.message, variant: 'destructive' });
    },
  });

  const updateExam = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TrainingExam> & { id: string }) => {
      const { error } = await supabase
        .from('training_exams')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-exam', moduleId] });
      toast({ title: 'Prova atualizada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar prova', description: error.message, variant: 'destructive' });
    },
  });

  const createQuestion = useMutation({
    mutationFn: async (data: Partial<TrainingExamQuestion>) => {
      if (!exam?.id) throw new Error('Exam not found');

      const { data: result, error } = await supabase
        .from('training_exam_questions')
        .insert({
          exam_id: exam.id,
          question_text: data.question_text!,
          question_type: data.question_type || 'multiple_choice',
          options: data.options || [],
          correct_answer: data.correct_answer!,
          order_position: data.order_position || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-exam-questions', exam?.id] });
      toast({ title: 'Questão criada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar questão', description: error.message, variant: 'destructive' });
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TrainingExamQuestion> & { id: string }) => {
      const { error } = await supabase
        .from('training_exam_questions')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-exam-questions', exam?.id] });
      toast({ title: 'Questão atualizada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar questão', description: error.message, variant: 'destructive' });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_exam_questions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-exam-questions', exam?.id] });
      toast({ title: 'Questão removida!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover questão', description: error.message, variant: 'destructive' });
    },
  });

  const startAttempt = useMutation({
    mutationFn: async () => {
      if (!exam?.id || !user?.id) throw new Error('Missing data');

      const { data: result, error } = await supabase
        .from('training_exam_attempts')
        .insert({
          exam_id: exam.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-exam-attempts', exam?.id] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao iniciar prova', description: error.message, variant: 'destructive' });
    },
  });

  const submitAttempt = useMutation({
    mutationFn: async ({ attemptId, answers }: { 
      attemptId: string; 
      answers: { question_id: string; answer: string }[] 
    }) => {
      if (!questions || questions.length === 0) throw new Error('No questions');

      // Calculate score
      let correctCount = 0;
      for (const answer of answers) {
        const question = questions.find(q => q.id === answer.question_id);
        if (question && question.correct_answer === answer.answer) {
          correctCount++;
        }
      }

      const score = (correctCount / questions.length) * 100;

      // Get module's passing score
      const { data: moduleData, error: moduleError } = await supabase
        .from('training_modules')
        .select('passing_score')
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;

      const passed = score >= (moduleData?.passing_score || 70);

      const { error } = await supabase
        .from('training_exam_attempts')
        .update({
          answers,
          score,
          passed,
          completed_at: new Date().toISOString(),
        })
        .eq('id', attemptId);

      if (error) throw error;

      return { score, passed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-exam-attempts', exam?.id] });
      queryClient.invalidateQueries({ queryKey: ['training-modules-with-progress'] });
      
      if (data.passed) {
        toast({ title: 'Parabéns! Você passou na prova!', description: `Nota: ${data.score.toFixed(1)}%` });
      } else {
        toast({ 
          title: 'Você não atingiu a nota mínima', 
          description: `Nota: ${data.score.toFixed(1)}%. Tente novamente!`,
          variant: 'destructive' 
        });
      }
    },
    onError: (error) => {
      toast({ title: 'Erro ao enviar prova', description: error.message, variant: 'destructive' });
    },
  });

  return {
    exam,
    questions,
    attempts,
    bestAttempt,
    isLoading: isLoadingExam || isLoadingQuestions || isLoadingAttempts,
    createExam,
    updateExam,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    startAttempt,
    submitAttempt,
  };
}
