import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useContact } from '@/hooks/useContacts';
import { useMyPlannerProfile } from '@/hooks/usePlannerProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useMeetings } from '@/hooks/useMeetings';
import { AnalysisStepIndicator } from '@/components/analysis/AnalysisStepIndicator';
import { PlannerSlideView } from '@/components/analysis/PlannerSlideView';
import { PlannerSlideEditor } from '@/components/analysis/PlannerSlideEditor';
import { InstitutionalPresentationView } from '@/components/analysis/InstitutionalPresentationView';
import { DataCollectionForm } from '@/components/analysis/data-collection/DataCollectionForm';
import { DiagnosticView } from '@/components/analysis/diagnostic/DiagnosticView';
import { ContractingForm } from '@/components/analysis/contracting/ContractingForm';
import { ProposalBuilder } from '@/components/analysis/proposal/ProposalBuilder';
import { ProposalTypeSelector } from '@/components/analysis/proposal/ProposalTypeSelector';
import { PontualProposalBuilder } from '@/components/analysis/proposal/PontualProposalBuilder';

const STEPS = [
  { label: 'Quem Sou Eu', shortLabel: 'Quem Sou' },
  { label: 'Coleta de Dados', shortLabel: 'Coleta' },
  { label: 'Diagnóstico IA', shortLabel: 'Diagnóstico' },
  { label: 'Apresentação', shortLabel: 'Apresentação' },
  { label: 'Proposta', shortLabel: 'Proposta' },
  { label: 'Contratação', shortLabel: 'Contratação' },
];

export default function ContactAnalysis() {
  const { contactId } = useParams<{ contactId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [proposalType, setProposalType] = useState<'selecting' | 'completo' | 'pontual'>('selecting');

  const { data: contact, isLoading: contactLoading } = useContact(contactId || '');
  const { data: plannerProfile } = useMyPlannerProfile();
  const { data: meetings } = useMeetings(contactId);
  
  // Get opportunityId from URL query params or from the most recent Análise meeting
  const urlOpportunityId = searchParams.get('opportunityId');
  const analysisMeeting = meetings?.find(
    m => m.meeting_type === 'Análise' && (m.status === 'scheduled' || m.status === 'completed')
  );
  const opportunityId = urlOpportunityId || analysisMeeting?.opportunity_id || null;

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  if (contactLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">Contato não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Contatos
        </Button>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowEditor(true)}>
                Editar Slide
              </Button>
            </div>
            <PlannerSlideView
              profile={plannerProfile || null}
              userName={user?.email?.split('@')[0] || 'Planejador'}
            />
          </div>
        );

      case 1:
        return (
          <DataCollectionForm 
            contactId={contactId!} 
            onComplete={handleNext} 
          />
        );

      case 2:
        return (
          <DiagnosticView 
            contactId={contactId!}
            onComplete={handleNext}
          />
        );

      case 3:
        return <InstitutionalPresentationView />;

      case 4:
        if (proposalType === 'selecting') {
          return (
            <ProposalTypeSelector 
              onSelect={(type) => setProposalType(type)} 
            />
          );
        }
        if (proposalType === 'pontual') {
          return (
            <PontualProposalBuilder
              contactId={contactId!}
              opportunityId={opportunityId}
              onBack={() => setProposalType('selecting')}
            />
          );
        }
        return (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setProposalType('selecting')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para seleção
            </Button>
            <ProposalBuilder 
              contactId={contactId!} 
              opportunityId={opportunityId}
            />
          </div>
        );

      case 5:
        return <ContractingForm contactId={contactId!} opportunityId={opportunityId} />;

      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/contacts/${contactId}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-accent">Análise</h1>
          <p className="text-sm text-muted-foreground">{contact.full_name}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <AnalysisStepIndicator
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

      {/* Step Content */}
      <Card className="min-h-[400px]">
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Anterior
        </Button>

        <span className="text-sm text-muted-foreground">
          Etapa {currentStep + 1} de {STEPS.length}
        </span>

        <Button
          onClick={handleNext}
          disabled={currentStep === STEPS.length - 1}
        >
          Próximo
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Planner Slide Editor Modal */}
      <PlannerSlideEditor
        open={showEditor}
        onOpenChange={setShowEditor}
        profile={plannerProfile || null}
        userName={user?.email?.split('@')[0] || 'Planejador'}
      />
    </div>
  );
}
