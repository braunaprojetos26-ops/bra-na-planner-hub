import { GraduationCap, Clock, BookOpen, Award } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { TrainingCourseWithProgress } from '@/types/training';

interface CourseCardProps {
  course: TrainingCourseWithProgress;
  onClick: () => void;
  onEnroll?: () => void;
  showCertificate?: boolean;
}

export function CourseCard({ course, onClick, onEnroll, showCertificate }: CourseCardProps) {
  const isEnrolled = !!course.enrollment;
  const isCompleted = course.progressPercentage === 100;

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        {course.thumbnail_url ? (
          <img 
            src={course.thumbnail_url} 
            alt={course.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <GraduationCap className="h-16 w-16 text-primary/40" />
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2">
            {course.name}
          </h3>
          {isCompleted && (
            <Badge variant="default" className="shrink-0 bg-green-600">
              <Award className="h-3 w-3 mr-1" />
              Concluído
            </Badge>
          )}
        </div>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {course.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{course.totalLessons} aulas</span>
          </div>
          {isEnrolled && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{course.completedLessons}/{course.totalLessons}</span>
            </div>
          )}
        </div>

        {isEnrolled && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{course.progressPercentage}%</span>
            </div>
            <Progress value={course.progressPercentage} className="h-2" />
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        {!isEnrolled && onEnroll ? (
          <Button 
            className="w-full" 
            onClick={(e) => {
              e.stopPropagation();
              onEnroll();
            }}
          >
            Matricular-se
          </Button>
        ) : showCertificate && isCompleted ? (
          <Button variant="outline" className="w-full">
            <Award className="h-4 w-4 mr-2" />
            Ver Certificado
          </Button>
        ) : (
          <Button variant="outline" className="w-full">
            {isCompleted ? 'Revisar Curso' : 'Continuar'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
