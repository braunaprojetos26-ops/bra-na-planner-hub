import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainingCourses } from '@/hooks/useTrainingCourses';
import { useTrainingModules } from '@/hooks/useTrainingModules';
import { NewModuleModal } from '@/components/training/NewModuleModal';
import { EditModuleModal } from '@/components/training/EditModuleModal';
import type { TrainingModuleWithProgress } from '@/types/training';

export default function TrainingCourse() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { coursesWithProgress, isLoading: coursesLoading } = useTrainingCourses();
  const { modulesWithProgress, isLoading: modulesLoading, deleteModule } = useTrainingModules(courseId);
  
  const [showNewModuleModal, setShowNewModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModuleWithProgress | null>(null);

  const course = coursesWithProgress?.find(c => c.id === courseId);
  const isTrainer = profile?.is_trainer || false;

  if (coursesLoading || modulesLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Curso não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/training')}>
          Voltar para Treinamentos
        </Button>
      </div>
    );
  }

  const getModuleStatusBadge = (module: TrainingModuleWithProgress) => {
    if (module.isCompleted) {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Concluído</Badge>;
    }
    if (module.isLocked) {
      return <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Bloqueado</Badge>;
    }
    if (module.completedLessons > 0) {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Em andamento</Badge>;
    }
    return <Badge variant="outline">Não iniciado</Badge>;
  };

  const getModuleIcon = (module: TrainingModuleWithProgress) => {
    if (module.isCompleted) {
      return <CheckCircle2 className="h-6 w-6 text-green-500" />;
    }
    if (module.isLocked) {
      return <Lock className="h-6 w-6 text-muted-foreground" />;
    }
    return <BookOpen className="h-6 w-6 text-primary" />;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/training')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{course.name}</h1>
          {course.description && (
            <p className="text-muted-foreground mt-1">{course.description}</p>
          )}
        </div>
        {isTrainer && (
          <Button onClick={() => setShowNewModuleModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Módulo
          </Button>
        )}
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>{course.totalLessons} aulas</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                <span>{modulesWithProgress?.length || 0} módulos</span>
              </div>
            </div>
            <span className="text-sm font-medium">{course.progressPercentage}% concluído</span>
          </div>
          <Progress value={course.progressPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Modules List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Módulos</h2>
        
        {modulesWithProgress?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum módulo cadastrado</p>
              {isTrainer && (
                <Button className="mt-4" onClick={() => setShowNewModuleModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro módulo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {modulesWithProgress?.map((module, index) => (
              <Card 
                key={module.id}
                className={`transition-all ${
                  module.isLocked 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:shadow-md cursor-pointer'
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {getModuleIcon(module)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs text-muted-foreground">
                          Módulo {index + 1}
                        </span>
                        {getModuleStatusBadge(module)}
                      </div>
                      
                      <Link 
                        to={module.isLocked ? '#' : `/training/${courseId}/${module.id}`}
                        className={module.isLocked ? 'pointer-events-none' : ''}
                        onClick={(e) => module.isLocked && e.preventDefault()}
                      >
                        <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                          {module.name}
                        </h3>
                      </Link>
                      
                      {module.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {module.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {module.completedLessons}/{module.totalLessons} aulas
                        </span>
                        {module.deadline_days > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Prazo: {module.deadline_days} dias
                          </span>
                        )}
                        {module.has_practical_exam && (
                          <Badge variant="outline" className="text-xs">
                            Prova prática
                          </Badge>
                        )}
                      </div>

                      {/* Module progress bar */}
                      {!module.isLocked && module.totalLessons > 0 && (
                        <div className="mt-3">
                          <Progress 
                            value={(module.completedLessons / module.totalLessons) * 100} 
                            className="h-1.5"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isTrainer && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingModule(module);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Excluir este módulo?')) {
                                deleteModule.mutate(module.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {!module.isLocked && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/training/${courseId}/${module.id}`)}
                        >
                          {module.isCompleted ? 'Revisar' : 'Acessar'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewModuleModal && (
        <NewModuleModal 
          courseId={courseId!}
          onClose={() => setShowNewModuleModal(false)}
        />
      )}

      {editingModule && (
        <EditModuleModal
          module={editingModule}
          onClose={() => setEditingModule(null)}
        />
      )}
    </div>
  );
}
