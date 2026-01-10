export interface TrainingCourse {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  target_roles: string[];
  is_active: boolean;
  order_position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingModule {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  order_position: number;
  deadline_days: number;
  has_practical_exam: boolean;
  passing_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingLesson {
  id: string;
  module_id: string;
  name: string;
  description: string | null;
  youtube_video_id: string | null;
  duration_minutes: number;
  order_position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingLessonMaterial {
  id: string;
  lesson_id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  order_position: number;
  created_at: string;
}

export interface TrainingExam {
  id: string;
  module_id: string;
  name: string;
  time_limit_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingExamQuestion {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  options: { label: string; value: string }[];
  correct_answer: string;
  order_position: number;
  is_active: boolean;
  created_at: string;
}

export interface TrainingLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
}

export interface TrainingExamAttempt {
  id: string;
  user_id: string;
  exam_id: string;
  answers: { question_id: string; answer: string }[];
  score: number;
  passed: boolean;
  started_at: string;
  completed_at: string | null;
}

export interface TrainingPracticalGrade {
  id: string;
  user_id: string;
  module_id: string;
  trainer_id: string;
  grade: number;
  feedback_text: string | null;
  passed: boolean;
  graded_at: string;
}

export interface TrainingCourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  deadline_at: string | null;
  completed_at: string | null;
  status: 'in_progress' | 'completed' | 'overdue';
}

export interface TrainingCourseReview {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface TrainingCertificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  template_used: string | null;
  pdf_path: string | null;
}

// Extended types with relations
export interface TrainingCourseWithProgress extends TrainingCourse {
  modules?: TrainingModuleWithProgress[];
  enrollment?: TrainingCourseEnrollment | null;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

export interface TrainingModuleWithProgress extends TrainingModule {
  lessons?: TrainingLessonWithProgress[];
  exam?: TrainingExam | null;
  practicalGrade?: TrainingPracticalGrade | null;
  totalLessons: number;
  completedLessons: number;
  examPassed: boolean | null;
  isCompleted: boolean;
  isLocked: boolean;
}

export interface TrainingLessonWithProgress extends TrainingLesson {
  materials?: TrainingLessonMaterial[];
  isCompleted: boolean;
}

// Rankings
export interface TrainingRankingEntry {
  userId: string;
  userName: string;
  userPhoto?: string | null;
  cohortDate?: string | null;
  totalLessonsCompleted: number;
  averageExamScore: number;
  averagePracticalScore: number;
  combinedScore: number;
  coursesCompleted: number;
  position: number;
}

export interface CohortOption {
  value: string;
  label: string;
  date: string;
}
