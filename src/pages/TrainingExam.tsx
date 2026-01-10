import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTrainingExams } from '@/hooks/useTrainingExams';

interface Answer {
  question_id: string;
  answer: string;
}

export default function TrainingExam() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // We need to get the moduleId from the exam, so we'll fetch the exam first
  const { exam, questions, isLoading, startAttempt, submitAttempt } = useTrainingExams(examId);
  
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const sortedQuestions = questions?.sort((a, b) => a.order_position - b.order_position) || [];

  // Start attempt when component mounts
  useEffect(() => {
    if (exam && !attemptId && !result) {
      startAttempt.mutateAsync().then((attempt) => {
        setAttemptId(attempt.id);
      }).catch(console.error);
    }
  }, [exam, attemptId, result]);

  // Timer effect
  useEffect(() => {
    if (exam?.time_limit_minutes && !result && attemptId) {
      setTimeLeft(exam.time_limit_minutes * 60);
    }
  }, [exam, result, attemptId]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.question_id === questionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { question_id: questionId, answer };
        return updated;
      }
      return [...prev, { question_id: questionId, answer }];
    });
  };

  const getAnswer = (questionId: string) => {
    return answers.find(a => a.question_id === questionId)?.answer || '';
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    
    setIsSubmitting(true);
    try {
      const attemptResult = await submitAttempt.mutateAsync({
        attemptId,
        answers
      });
      
      setResult({
        score: attemptResult.score,
        passed: attemptResult.passed
      });

      if (attemptResult.passed) {
        toast({
          title: "Parabéns! Você foi aprovado!",
          description: `Sua nota: ${attemptResult.score}%`,
        });
      } else {
        toast({
          title: "Você não atingiu a nota mínima",
          description: `Sua nota: ${attemptResult.score}%. Tente novamente!`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao enviar prova",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Prova não encontrada</p>
        <Button variant="outline" onClick={() => navigate('/training')}>
          Voltar para Treinamentos
        </Button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="pt-6 text-center space-y-6">
            {result.passed ? (
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
            ) : (
              <XCircle className="h-20 w-20 text-red-500 mx-auto" />
            )}
            
            <div>
              <h1 className="text-2xl font-bold">
                {result.passed ? 'Parabéns!' : 'Não foi dessa vez'}
              </h1>
              <p className="text-muted-foreground mt-2">
                {result.passed 
                  ? 'Você foi aprovado na prova!' 
                  : 'Você não atingiu a nota mínima.'}
              </p>
            </div>

            <div className="text-4xl font-bold">
              {result.score.toFixed(0)}%
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Voltar ao Módulo
              </Button>
              {!result.passed && (
                <Button onClick={() => {
                  setResult(null);
                  setAnswers([]);
                  setCurrentQuestion(0);
                  setAttemptId(null);
                  if (exam.time_limit_minutes) {
                    setTimeLeft(exam.time_limit_minutes * 60);
                  }
                }}>
                  Tentar Novamente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = sortedQuestions[currentQuestion];
  const answeredCount = answers.length;
  const progress = sortedQuestions.length > 0 ? (answeredCount / sortedQuestions.length) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            if (confirm('Deseja sair da prova? Seu progresso será perdido.')) {
              navigate(-1);
            }
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{exam.name}</h1>
            <p className="text-sm text-muted-foreground">
              Questão {currentQuestion + 1} de {sortedQuestions.length}
            </p>
          </div>
        </div>
        
        {timeLeft !== null && (
          <Badge 
            variant={timeLeft < 60 ? "destructive" : "outline"} 
            className="text-lg px-4 py-2"
          >
            <Clock className="h-4 w-4 mr-2" />
            {formatTime(timeLeft)}
          </Badge>
        )}
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2" />

      {/* Question */}
      {question && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-medium mb-6">
              {question.question_text}
            </h2>
            <RadioGroup
              value={getAnswer(question.id)}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              {question.options.map((option, index) => (
                <div 
                  key={option.value} 
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleAnswerChange(question.id, option.value)}
                >
                  <RadioGroupItem value={option.value} id={`option-${index}`} />
                  <Label 
                    htmlFor={`option-${index}`} 
                    className="flex-1 cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion(prev => prev - 1)}
            >
              Anterior
            </Button>
            
            <div className="flex gap-2">
              {currentQuestion < sortedQuestions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion(prev => prev + 1)}
                >
                  Próxima
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || answeredCount < sortedQuestions.length}
                >
                  {isSubmitting ? 'Enviando...' : 'Finalizar Prova'}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Question Navigator */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-3">Navegação rápida:</p>
          <div className="flex flex-wrap gap-2">
            {sortedQuestions.map((q, index) => {
              const isAnswered = answers.some(a => a.question_id === q.id);
              const isCurrent = index === currentQuestion;
              
              return (
                <Button
                  key={q.id}
                  variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
                  size="sm"
                  className="w-10 h-10"
                  onClick={() => setCurrentQuestion(index)}
                >
                  {index + 1}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
