import { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClipboardCheck, Eye, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import {
  useContactPreQualification,
  useActivePreQualificationQuestions,
  useMarkPreQualificationViewed,
} from '@/hooks/usePreQualification';

interface PreQualificationSummaryProps {
  contactId: string;
}

export function PreQualificationSummary({ contactId }: PreQualificationSummaryProps) {
  const { user } = useAuth();
  const { data: response, isLoading: isLoadingResponse } = useContactPreQualification(contactId);
  const { data: questions, isLoading: isLoadingQuestions } = useActivePreQualificationQuestions();
  const markViewedMutation = useMarkPreQualificationViewed();

  const isLoading = isLoadingResponse || isLoadingQuestions;
  const isNew = response && !response.viewed_at;

  // Mark as viewed when expanded
  useEffect(() => {
    if (response && !response.viewed_at && user?.id) {
      markViewedMutation.mutate({ responseId: response.id, userId: user.id });
    }
  }, [response?.id, response?.viewed_at, user?.id]);

  if (isLoading) {
    return null;
  }

  if (!response) {
    return null;
  }

  const getQuestionLabel = (key: string) => {
    const question = questions?.find((q) => q.key === key);
    return question?.label || key;
  };

  const formatValue = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">Não respondido</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground italic">Não respondido</span>;
      }
      return (
        <ul className="list-disc list-inside">
          {value.map((item, index) => (
            <li key={index}>{String(item)}</li>
          ))}
        </ul>
      );
    }

    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não';
    }

    return String(value);
  };

  const responseEntries = Object.entries(response.responses as Record<string, unknown>);

  if (responseEntries.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Pré-Qualificação
                    {isNew && (
                      <Badge variant="default" className="text-xs">
                        Novo
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Respondido em {format(new Date(response.submitted_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              {response.viewed_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  Visualizado
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {responseEntries.map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {getQuestionLabel(key)}
                  </p>
                  <p className="text-sm">
                    {formatValue(key, value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
