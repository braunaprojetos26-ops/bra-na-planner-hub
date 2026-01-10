import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, Trophy, Settings, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainingCourses } from '@/hooks/useTrainingCourses';
import { CourseCard } from '@/components/training/CourseCard';
import { NewCourseModal } from '@/components/training/NewCourseModal';
import { Skeleton } from '@/components/ui/skeleton';

export default function Training() {
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const { coursesWithProgress, isLoading, enrollInCourse } = useTrainingCourses();
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);

  const isTrainer = profile?.is_trainer === true;
  const canManage = isTrainer || role === 'superadmin';

  const inProgressCourses = coursesWithProgress?.filter(c => 
    c.enrollment && c.progressPercentage < 100
  ) || [];

  const availableCourses = coursesWithProgress?.filter(c => !c.enrollment) || [];

  const completedCourses = coursesWithProgress?.filter(c => 
    c.enrollment && c.progressPercentage === 100
  ) || [];

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-primary" />
              Treinamentos
            </h1>
            <p className="text-muted-foreground mt-1">
              Desenvolva suas habilidades com nossos cursos
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/training/rankings')}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Rankings
            </Button>
            {canManage && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate('/training/manage')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar
                </Button>
                <Button onClick={() => setShowNewCourseModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Curso
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <Tabs defaultValue="in-progress" className="w-full">
          <TabsList>
            <TabsTrigger value="in-progress" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Em Andamento
              {inProgressCourses.length > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {inProgressCourses.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="available" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Disponíveis
              {availableCourses.length > 0 && (
                <span className="ml-1 bg-muted rounded-full px-2 py-0.5 text-xs">
                  {availableCourses.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Concluídos
              {completedCourses.length > 0 && (
                <span className="ml-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full px-2 py-0.5 text-xs">
                  {completedCourses.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="in-progress" className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : inProgressCourses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Você não está matriculado em nenhum curso.</p>
                <p className="text-sm mt-1">Veja os cursos disponíveis para começar!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inProgressCourses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onClick={() => navigate(`/training/${course.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="available" className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : availableCourses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Você já está matriculado em todos os cursos disponíveis!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableCourses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onClick={() => navigate(`/training/${course.id}`)}
                    onEnroll={() => enrollInCourse.mutate(course.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : completedCourses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Você ainda não concluiu nenhum curso.</p>
                <p className="text-sm mt-1">Continue estudando para conquistar seus certificados!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completedCourses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onClick={() => navigate(`/training/${course.id}`)}
                    showCertificate
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

      {showNewCourseModal && (
        <NewCourseModal
          open={showNewCourseModal}
          onClose={() => setShowNewCourseModal(false)}
        />
      )}
    </div>
  );
}
