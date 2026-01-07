import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, AlertCircle, Loader2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import braunaLogoWhite from '@/assets/slide/brauna-logo-white.png';
import type { Json } from '@/integrations/supabase/types';
import {
  usePreQualificationByToken,
  useActivePreQualificationQuestions,
  useSubmitPreQualificationResponse,
  PreQualificationQuestion,
} from '@/hooks/usePreQualification';

export default function PublicPreQualificationForm() {
  const { token } = useParams<{ token: string }>();
  const [responses, setResponses] = useState<Record<string, string | number | boolean | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: responseData, isLoading: isLoadingResponse } = usePreQualificationByToken(token);
  const { data: questions, isLoading: isLoadingQuestions } = useActivePreQualificationQuestions();
  const submitMutation = useSubmitPreQualificationResponse();

  const isLoading = isLoadingResponse || isLoadingQuestions;

  const handleChange = (key: string, value: string | number | boolean | string[]) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    questions?.forEach((q) => {
      if (q.is_required) {
        const value = responses[q.key];
        if (value === undefined || value === null || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          newErrors[q.key] = 'Este campo é obrigatório';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !token) return;

    await submitMutation.mutateAsync({ token, responses });
  };

  const renderField = (question: PreQualificationQuestion) => {
    const value = responses[question.key];

    switch (question.field_type) {
      case 'text':
        return (
          <Input
            placeholder={question.placeholder || ''}
            value={(value as string) || ''}
            onChange={(e) => handleChange(question.key, e.target.value)}
          />
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={question.placeholder || ''}
            value={(value as string) || ''}
            onChange={(e) => handleChange(question.key, e.target.value)}
            rows={4}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={question.placeholder || ''}
            value={(value as number) || ''}
            onChange={(e) => handleChange(question.key, e.target.value ? Number(e.target.value) : '')}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => handleChange(question.key, checked)}
            />
            <span className="text-sm text-muted-foreground">
              {value ? 'Sim' : 'Não'}
            </span>
          </div>
        );

      case 'select':
        const selectOptions = (question.options as { items?: string[] })?.items || [];
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(val) => handleChange(question.key, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={question.placeholder || 'Selecione uma opção'} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi_select':
        const multiOptions = (question.options as { items?: string[] })?.items || [];
        const selectedValues = (Array.isArray(value) ? value : []) as string[];
        return (
          <div className="space-y-2">
            {multiOptions.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${question.key}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((v) => v !== option);
                    handleChange(question.key, newValues);
                  }}
                />
                <Label htmlFor={`${question.key}-${option}`} className="font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const pageBackground = "min-h-screen bg-gradient-to-br from-primary via-primary to-primary/90";

  // Loading state
  if (isLoading) {
    return (
      <div className={`${pageBackground} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white/80">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  // Token not found
  if (!responseData) {
    return (
      <div className={`${pageBackground} flex items-center justify-center p-4`}>
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-semibold">Link inválido</h2>
              <p className="text-muted-foreground">
                Este link de formulário é inválido ou expirou. Entre em contato com seu planejador para obter um novo link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already submitted
  if (responseData.submitted_at) {
    return (
      <div className={`${pageBackground} flex items-center justify-center p-4`}>
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <h2 className="text-xl font-semibold">Formulário já respondido</h2>
              <p className="text-muted-foreground">
                Você já respondeu este formulário. Obrigado!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No questions configured
  if (!questions || questions.length === 0) {
    return (
      <div className={`${pageBackground} flex items-center justify-center p-4`}>
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Formulário indisponível</h2>
              <p className="text-muted-foreground">
                O formulário ainda não está configurado. Entre em contato com seu planejador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state after submission
  if (submitMutation.isSuccess) {
    return (
      <div className={`${pageBackground} flex items-center justify-center p-4`}>
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-semibold">Obrigado!</h2>
              <p className="text-muted-foreground">
                Suas respostas foram enviadas com sucesso. Seu planejador entrará em contato em breve.
              </p>
              {responseData.meeting && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Sua reunião está agendada para:</p>
                  <p className="text-lg font-semibold text-primary">
                    {format(new Date(responseData.meeting.scheduled_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form
  return (
    <div className={`${pageBackground} py-8 px-4`}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-4">
          <img src={braunaLogoWhite} alt="Braúna" className="h-12" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Formulário de Pré-Qualificação</h1>
            {responseData.contact && (
              <p className="text-white/80 mt-1">
                Olá, {(responseData.contact as { full_name: string }).full_name}!
              </p>
            )}
          </div>
        </div>

        {/* Meeting info */}
        {responseData.meeting && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reunião agendada para</p>
                  <p className="font-medium">
                    {format(new Date((responseData.meeting as { scheduled_at: string }).scheduled_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Suas informações</CardTitle>
            <CardDescription>
              Responda as perguntas abaixo para que possamos preparar melhor nossa reunião.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {question.label}
                    {question.is_required && <span className="text-destructive">*</span>}
                  </Label>
                  {renderField(question)}
                  {errors[question.key] && (
                    <p className="text-sm text-destructive">{errors[question.key]}</p>
                  )}
                </div>
              ))}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar respostas'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-white/70">
          Suas informações são confidenciais e serão usadas apenas para nossa reunião.
        </p>
      </div>
    </div>
  );
}
