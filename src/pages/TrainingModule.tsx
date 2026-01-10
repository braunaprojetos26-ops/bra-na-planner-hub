import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle,
  Play,
  FileText,
  Plus,
  Pencil,
  Trash2,
  ClipboardCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainingModules } from '@/hooks/useTrainingModules';
import { useTrainingLessons } from '@/hooks/useTrainingLessons';
import { useTrainingExams } from '@/hooks/useTrainingExams';
import { NewLessonModal } from '@/components/training/NewLessonModal';
import { EditLessonModal } from '@/components/training/EditLessonModal';
import { LessonMaterials } from '@/components/training/LessonMaterials';
import type { TrainingLessonWithProgress } from '@/types/training';

export default function TrainingModule() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { modulesWithProgress } = useTrainingModules(courseId);
  const { lessonsWithProgress, isLoading, markLessonComplete, unmarkLessonComplete, deleteLesson, createLesson, updateLesson } = useTrainingLessons(moduleId);
  const { exam, attempts } = useTrainingExams(moduleId);
  
  const [showNewLessonModal, setShowNewLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<TrainingLessonWithProgress | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<TrainingLessonWithProgress | null>(null);

  const module = modulesWithProgress?.find(m => m.id === moduleId);
  const isTrainer = profile?.is_trainer || false;
  const examAttempt = attempts?.find(a => a.passed);
  const examPassed = !!examAttempt;

  const lessons = lessonsWithProgress || [];
  const completedLessons = lessons.filter(l => l.isCompleted).length;
  const totalLessons = lessons.length;
  const allLessonsCompleted = totalLessons > 0 && completedLessons === totalLessons;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Módulo não encontrado</p>
        <Button variant="outline" onClick={() => navigate(`/training/${courseId}`)}>
          Voltar para o Curso
        </Button>
      </div>
    );
  }

  const handleToggleComplete = (lesson: TrainingLessonWithProgress) => {
    if (lesson.isCompleted) {
      unmarkLessonComplete.mutate(lesson.id);
    } else {
      markLessonComplete.mutate(lesson.id);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/training/${courseId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{module.name}</h1>
          {module.description && (
            <p className="text-muted-foreground mt-1">{module.description}</p>
          )}
        </div>
        {isTrainer && (
          <Button onClick={() => setShowNewLessonModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Aula
          </Button>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              Progresso do módulo
            </span>
            <span className="text-sm font-medium">
              {completedLessons}/{totalLessons} aulas concluídas
            </span>
          </div>
          <Progress value={totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lessons List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Aulas</h2>
          
          {lessons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Play className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma aula cadastrada</p>
                {isTrainer && (
                  <Button className="mt-4" onClick={() => setShowNewLessonModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira aula
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, index) => (
                <Card 
                  key={lesson.id}
                  className={`transition-all hover:shadow-md cursor-pointer ${
                    selectedLesson?.id === lesson.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedLesson(lesson)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={lesson.isCompleted}
                        onCheckedChange={() => handleToggleComplete(lesson)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            Aula {index + 1}
                          </span>
                          {lesson.isCompleted && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                              Concluída
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="font-medium">{lesson.name}</h3>
                        
                        {lesson.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {lesson.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {lesson.duration_minutes > 0 && (
                            <span>{lesson.duration_minutes} min</span>
                          )}
                          {lesson.materials && lesson.materials.length > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {lesson.materials.length} material(is)
                            </span>
                          )}
                        </div>
                      </div>

                      {isTrainer && (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLesson(lesson);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Excluir esta aula?')) {
                                deleteLesson.mutate(lesson.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Exam Section */}
          {exam && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Prova do Módulo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{exam.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {exam.time_limit_minutes 
                        ? `Tempo limite: ${exam.time_limit_minutes} minutos` 
                        : 'Sem limite de tempo'}
                    </p>
                    {module.passing_score && (
                      <p className="text-sm text-muted-foreground">
                        Nota mínima: {module.passing_score}%
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {examPassed ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Aprovado ({examAttempt?.score}%)
                      </Badge>
                    ) : (
                      <>
                        {!allLessonsCompleted && (
                          <p className="text-sm text-muted-foreground">
                            Complete todas as aulas primeiro
                          </p>
                        )}
                        <Button 
                          disabled={!allLessonsCompleted}
                          onClick={() => navigate(`/training/exam/${exam.id}`)}
                        >
                          Fazer Prova
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Practical Exam Info */}
          {module.has_practical_exam && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                  Avaliação Prática
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Este módulo requer uma avaliação prática que será aplicada por um treinador.
                </p>
                {module.practicalGrade ? (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Nota: {module.practicalGrade.grade}/10</span>
                      <Badge className={module.practicalGrade.passed 
                        ? 'bg-green-500/10 text-green-600' 
                        : 'bg-red-500/10 text-red-600'
                      }>
                        {module.practicalGrade.passed ? 'Aprovado' : 'Reprovado'}
                      </Badge>
                    </div>
                    {module.practicalGrade.feedback_text && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {module.practicalGrade.feedback_text}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 mt-2">
                    Aguardando avaliação do treinador
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Video Player / Lesson Details */}
        <div className="space-y-4">
          {selectedLesson ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{selectedLesson.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedLesson.youtube_video_id ? (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${selectedLesson.youtube_video_id}`}
                        title={selectedLesson.name}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">Sem vídeo</p>
                    </div>
                  )}
                  
                  {selectedLesson.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedLesson.description}
                    </p>
                  )}
                  
                  <Button 
                    className="w-full"
                    variant={selectedLesson.isCompleted ? 'outline' : 'default'}
                    onClick={() => handleToggleComplete(selectedLesson)}
                  >
                    {selectedLesson.isCompleted ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como não concluída
                      </>
                    ) : (
                      <>
                        <Circle className="h-4 w-4 mr-2" />
                        Marcar como concluída
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Materials */}
              <LessonMaterials 
                lessonId={selectedLesson.id} 
                isTrainer={isTrainer}
              />
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Play className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Selecione uma aula para visualizar
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewLessonModal && (
        <NewLessonModal 
          moduleId={moduleId!}
          onClose={() => setShowNewLessonModal(false)}
        />
      )}

      {editingLesson && (
        <EditLessonModal
          lesson={editingLesson}
          onClose={() => setEditingLesson(null)}
        />
      )}
    </div>
  );
}
