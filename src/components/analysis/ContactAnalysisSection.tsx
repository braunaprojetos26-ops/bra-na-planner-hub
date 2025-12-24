import { useState } from 'react';
import { BarChart3, CalendarPlus, Lock, Pencil, Presentation, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHasAnalysisMeeting } from '@/hooks/useContactAnalysis';
import { useMyPlannerProfile } from '@/hooks/usePlannerProfile';
import { useAuth } from '@/contexts/AuthContext';
import { PlannerSlideView } from './PlannerSlideView';
import { PlannerSlideEditor } from './PlannerSlideEditor';
import { InstitutionalPresentationView } from './InstitutionalPresentationView';

interface ContactAnalysisSectionProps {
  contactId: string;
  contactName: string;
  onScheduleAnalysis: () => void;
  isReadOnly?: boolean;
}

export function ContactAnalysisSection({
  contactId,
  contactName,
  onScheduleAnalysis,
  isReadOnly = false,
}: ContactAnalysisSectionProps) {
  const [showEditor, setShowEditor] = useState(false);
  const { hasAnalysisMeeting, isLoading } = useHasAnalysisMeeting(contactId);
  const { data: plannerProfile, isLoading: profileLoading } = useMyPlannerProfile();
  const { profile } = useAuth();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-accent" />
            Análise
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-xs text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasAnalysisMeeting) {
    return (
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-accent" />
            Análise
            <Lock className="w-3 h-3 text-muted-foreground ml-1" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="bg-secondary/50 rounded-lg p-4 text-center">
            <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              Esta seção estará disponível após agendar uma reunião do tipo "Análise" com este contato.
            </p>
            {!isReadOnly && (
              <Button size="sm" onClick={onScheduleAnalysis} className="gap-2">
                <CalendarPlus className="w-4 h-4" />
                Agendar Reunião de Análise
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-accent" />
            Análise
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <Tabs defaultValue="quem-sou-eu" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="quem-sou-eu" className="gap-2">
                <User className="w-4 h-4" />
                Quem Sou Eu
              </TabsTrigger>
              <TabsTrigger value="apresentacao-brauna" className="gap-2">
                <Presentation className="w-4 h-4" />
                Apresentação Braúna
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quem-sou-eu" className="mt-0">
              <div className="space-y-4">
                <PlannerSlideView
                  profile={plannerProfile || null}
                  userName={profile?.full_name || 'Planejador'}
                />
                {!isReadOnly && (
                  <div className="flex justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditor(true)}
                      className="gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar Perfil
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="apresentacao-brauna" className="mt-0">
              <InstitutionalPresentationView />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <PlannerSlideEditor
        open={showEditor}
        onOpenChange={setShowEditor}
        profile={plannerProfile || null}
        userName={profile?.full_name || 'Planejador'}
      />
    </>
  );
}
