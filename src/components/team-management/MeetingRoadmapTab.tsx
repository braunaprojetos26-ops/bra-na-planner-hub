import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, CheckCircle2 } from 'lucide-react';
import { TopicResponses, TopicResponse } from '@/hooks/useOneOnOneMeetings';

interface MeetingTopic {
  id: string;
  title: string;
  description: string;
  orderPosition: number;
}

interface MeetingRoadmapTabProps {
  topics: MeetingTopic[];
  topicResponses: TopicResponses;
  onChange: (responses: TopicResponses) => void;
  onSave: () => void;
  isSaving: boolean;
  isReadOnly: boolean;
}

export function MeetingRoadmapTab({
  topics,
  topicResponses,
  onChange,
  onSave,
  isSaving,
  isReadOnly,
}: MeetingRoadmapTabProps) {
  const [localResponses, setLocalResponses] = useState<TopicResponses>(topicResponses);

  useEffect(() => {
    setLocalResponses(topicResponses);
  }, [topicResponses]);

  const sortedTopics = [...topics].sort((a, b) => a.orderPosition - b.orderPosition);

  const completedCount = sortedTopics.filter(
    (t) => localResponses[t.id]?.completed
  ).length;
  const progress = sortedTopics.length > 0 ? (completedCount / sortedTopics.length) * 100 : 0;

  const handleToggleComplete = (topicId: string) => {
    if (isReadOnly) return;
    
    const current = localResponses[topicId] || { completed: false, notes: '' };
    const updated = {
      ...localResponses,
      [topicId]: { ...current, completed: !current.completed },
    };
    setLocalResponses(updated);
    onChange(updated);
  };

  const handleNotesChange = (topicId: string, notes: string) => {
    if (isReadOnly) return;
    
    const current = localResponses[topicId] || { completed: false, notes: '' };
    const updated = {
      ...localResponses,
      [topicId]: { ...current, notes },
    };
    setLocalResponses(updated);
    onChange(updated);
  };

  if (sortedTopics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Este modelo de reunião não possui tópicos estruturados.</p>
        <p className="text-sm">Use a aba "Notas Gerais" para suas anotações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="space-y-1">
          <p className="text-sm font-medium">Progresso do Roteiro</p>
          <p className="text-xs text-muted-foreground">
            {completedCount} de {sortedTopics.length} tópicos concluídos
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32">
            <Progress value={progress} className="h-2" />
          </div>
          <Badge variant={progress === 100 ? 'default' : 'secondary'}>
            {Math.round(progress)}%
          </Badge>
        </div>
      </div>

      {/* Topics List */}
      <div className="space-y-4">
        {sortedTopics.map((topic, index) => {
          const response = localResponses[topic.id] || { completed: false, notes: '' };
          
          return (
            <Card
              key={topic.id}
              className={`transition-colors ${
                response.completed ? 'bg-primary/5 border-primary/20' : ''
              }`}
            >
              <CardContent className="pt-4 space-y-3">
                {/* Topic Header */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`topic-${topic.id}`}
                    checked={response.completed}
                    onCheckedChange={() => handleToggleComplete(topic.id)}
                    disabled={isReadOnly}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`topic-${topic.id}`}
                      className={`text-sm font-medium cursor-pointer flex items-center gap-2 ${
                        response.completed ? 'text-primary line-through' : ''
                      }`}
                    >
                      <span className="text-muted-foreground">{index + 1}.</span>
                      {topic.title}
                      {response.completed && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </label>
                  </div>
                </div>

                {/* Guide Text */}
                {topic.description && (
                  <div className="ml-7 p-3 bg-muted/50 rounded-md border-l-2 border-primary/30">
                    <p className="text-sm text-muted-foreground italic">
                      {topic.description}
                    </p>
                  </div>
                )}

                {/* Notes Field */}
                <div className="ml-7 space-y-2">
                  <Label htmlFor={`notes-${topic.id}`} className="text-xs text-muted-foreground">
                    Anotações
                  </Label>
                  <Textarea
                    id={`notes-${topic.id}`}
                    placeholder="Registre aqui o que foi discutido neste tópico..."
                    value={response.notes}
                    onChange={(e) => handleNotesChange(topic.id, e.target.value)}
                    disabled={isReadOnly}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      {!isReadOnly && (
        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar Roteiro'}
          </Button>
        </div>
      )}
    </div>
  );
}
