import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TrainingRankingEntry, CohortOption } from '@/types/training';
import { parseISO } from 'date-fns';

export function useTrainingRankings() {
  const { user } = useAuth();
  const [cohortFilter, setCohortFilter] = useState<string>('all');

  const { data: cohorts, isLoading: isLoadingCohorts } = useQuery({
    queryKey: ['training-cohorts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('cohort_date')
        .not('cohort_date', 'is', null)
        .order('cohort_date', { ascending: false });

      if (error) throw error;

      // Get unique cohort dates and format them
      const uniqueDates = [...new Set(data?.map(p => p.cohort_date).filter(Boolean))];
      
      return uniqueDates.map(date => {
        const parsedDate = parseISO(date as string);
        const quarter = Math.floor(parsedDate.getMonth() / 3) + 1;
        const year = parsedDate.getFullYear();
        
        return {
          value: date as string,
          label: `Q${quarter} ${year}`,
          date: date as string,
        };
      }) as CohortOption[];
    },
    enabled: !!user,
  });

  const { data: rankings, isLoading: isLoadingRankings } = useQuery({
    queryKey: ['training-rankings', cohortFilter],
    queryFn: async () => {
      // Get all users (optionally filtered by cohort)
      let usersQuery = supabase
        .from('profiles')
        .select('user_id, full_name, cohort_date')
        .eq('is_active', true);

      if (cohortFilter && cohortFilter !== 'all') {
        usersQuery = usersQuery.eq('cohort_date', cohortFilter);
      }

      const { data: users, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      if (!users || users.length === 0) return [];

      const userIds = users.map(u => u.user_id);

      // Get lesson progress for all users
      const { data: progress, error: progressError } = await supabase
        .from('training_lesson_progress')
        .select('user_id, lesson_id')
        .in('user_id', userIds);

      if (progressError) throw progressError;

      // Get exam attempts for all users
      const { data: attempts, error: attemptsError } = await supabase
        .from('training_exam_attempts')
        .select('user_id, score, passed, completed_at')
        .in('user_id', userIds)
        .not('completed_at', 'is', null);

      if (attemptsError) throw attemptsError;

      // Get practical grades for all users
      const { data: grades, error: gradesError } = await supabase
        .from('training_practical_grades')
        .select('user_id, grade, passed')
        .in('user_id', userIds);

      if (gradesError) throw gradesError;

      // Get enrollments to count completed courses
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('training_course_enrollments')
        .select('user_id, status')
        .in('user_id', userIds)
        .eq('status', 'completed');

      if (enrollmentsError) throw enrollmentsError;

      // Calculate rankings
      const rankingData: TrainingRankingEntry[] = users.map(user => {
        const userProgress = progress?.filter(p => p.user_id === user.user_id) || [];
        const userAttempts = attempts?.filter(a => a.user_id === user.user_id) || [];
        const userGrades = grades?.filter(g => g.user_id === user.user_id) || [];
        const userEnrollments = enrollments?.filter(e => e.user_id === user.user_id) || [];

        const totalLessonsCompleted = userProgress.length;
        
        const passedExams = userAttempts.filter(a => a.passed);
        const averageExamScore = passedExams.length > 0
          ? passedExams.reduce((sum, a) => sum + Number(a.score), 0) / passedExams.length
          : 0;

        const passedPracticals = userGrades.filter(g => g.passed);
        const averagePracticalScore = passedPracticals.length > 0
          ? passedPracticals.reduce((sum, g) => sum + Number(g.grade), 0) / passedPracticals.length * 10 // Convert to 0-100
          : 0;

        // Combined score: weighted average (40% lessons, 30% exam, 30% practical)
        const combinedScore = (totalLessonsCompleted * 0.4) + 
          (averageExamScore * 0.3) + 
          (averagePracticalScore * 0.3);

        return {
          userId: user.user_id,
          userName: user.full_name || 'Usuário',
          cohortDate: user.cohort_date,
          totalLessonsCompleted,
          averageExamScore,
          averagePracticalScore,
          combinedScore,
          coursesCompleted: userEnrollments.length,
          position: 0, // Will be set after sorting
        };
      });

      // Sort by combined score and assign positions
      rankingData.sort((a, b) => b.combinedScore - a.combinedScore);
      rankingData.forEach((entry, index) => {
        entry.position = index + 1;
      });

      return rankingData;
    },
    enabled: !!user,
  });

  return {
    cohorts,
    rankings,
    isLoading: isLoadingCohorts || isLoadingRankings,
    cohortFilter,
    setCohortFilter,
  };
}
