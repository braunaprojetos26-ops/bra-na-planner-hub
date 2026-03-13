import { useState, useEffect } from 'react';
import { ProposalTypeSelector } from '@/components/analysis/proposal/ProposalTypeSelector';
import { StandaloneCompletoBuilder } from '@/components/analysis/proposal/StandaloneCompletoBuilder';
import { StandalonePontualBuilder } from '@/components/analysis/proposal/StandalonePontualBuilder';
import { ProposalPresentation } from '@/components/analysis/proposal/ProposalPresentation';
import { PontualProposalPresentation } from '@/components/analysis/proposal/PontualProposalPresentation';
import { StandaloneFeedbacksCasesEditor } from '@/components/analysis/proposal/StandaloneFeedbacksCasesEditor';
import type { Proposal } from '@/hooks/useProposals';
import type { SelectedTopic } from '@/lib/pontualTopics';
import type { PlannerFeedback } from '@/hooks/usePlannerFeedbacks';
import type { PlannerCase } from '@/hooks/usePlannerCases';

const HARDCODED_CASES: PlannerCase[] = [
  {
    id: 'case-1', planner_id: '', title: 'Planejamento Imobiliário', description: 'Valor Final Imóvel',
    initial_value: 541356.80, final_value: 364645.00, advantage: 176711.80,
    is_active: true, order_position: 0, created_at: '', updated_at: '',
  },
  {
    id: 'case-2', planner_id: '', title: 'Benefício Fiscal em IR', description: 'Imposto a Pagar',
    initial_value: 15340.00, final_value: 483.22, advantage: 14856.78,
    is_active: true, order_position: 1, created_at: '', updated_at: '',
  },
  {
    id: 'case-3', planner_id: '', title: 'Investimentos', description: 'Aumento de Capital',
    initial_value: 248780.54, final_value: 259595.96, advantage: 10815.42,
    is_active: true, order_position: 2, created_at: '', updated_at: '',
  },
  {
    id: 'case-4', planner_id: '', title: 'Mentalidade Financeira', description: 'Reserva Acumulada',
    initial_value: -5116.25, final_value: 18432.23, advantage: 23548.48,
    is_active: true, order_position: 3, created_at: '', updated_at: '',
  },
  {
    id: 'case-5', planner_id: '', title: 'Aposentadoria', description: 'Troca de Investimento',
    initial_value: 100722.25, final_value: 458450.00, advantage: 357727.75,
    is_active: true, order_position: 4, created_at: '', updated_at: '',
  },
  {
    id: 'case-6', planner_id: '', title: 'Milhas', description: 'Aumento de Pontos',
    initial_value: 36000.00, final_value: 188000.00, advantage: 152000.00,
    is_active: true, order_position: 5, created_at: '', updated_at: '',
  },
];

type Stage = 'select' | 'configure' | 'present';

export default function StandaloneProposal() {
  const [stage, setStage] = useState<Stage>('select');
  const [proposalType, setProposalType] = useState<'completo' | 'pontual' | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [clientName, setClientName] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<SelectedTopic[]>([]);
  const [standaloneFeedbacks, setStandaloneFeedbacks] = useState<PlannerFeedback[]>([]);
  const standaloneCases = HARDCODED_CASES;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

  useEffect(() => {
    document.title = 'Sistema de Proposta | Braúna';
  }, []);

  const handleTypeSelect = (type: 'completo' | 'pontual') => {
    setProposalType(type);
    setStage('configure');
  };

  const handleCompletoPresent = (p: Proposal, name: string) => {
    setProposal(p);
    setClientName(name);
    setStage('present');
  };

  const handlePontualPresent = (p: Proposal, name: string, topics: SelectedTopic[]) => {
    setProposal(p);
    setClientName(name);
    setSelectedTopics(topics);
    setStage('present');
  };

  const plannerName = proposal ? (proposal as any).__plannerName : undefined;

  return (
    <>
      {/* Presentation overlay - renders on top when presenting */}
      {stage === 'present' && proposal && proposalType === 'pontual' && (
        <StandalonePontualPresentation
          proposal={proposal}
          clientName={clientName}
          plannerName={plannerName}
          selectedTopics={selectedTopics}
          feedbacks={standaloneFeedbacks}
          cases={standaloneCases}
          onBack={() => setStage('configure')}
        />
      )}
      {stage === 'present' && proposal && proposalType !== 'pontual' && (
        <StandaloneCompletoPresentation
          proposal={proposal}
          clientName={clientName}
          plannerName={plannerName}
          feedbacks={standaloneFeedbacks}
          cases={standaloneCases}
          onBack={() => setStage('configure')}
        />
      )}

      {/* Main content - hidden during presentation but stays mounted to preserve state */}
      <div className={`min-h-screen bg-background ${stage === 'present' ? 'hidden' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Proposta de Planejamento Financeiro</h1>
            <p className="text-muted-foreground mt-2">
              Braúna Planejamento Financeiro
            </p>
          </div>

          {stage === 'select' && (
            <div className="space-y-8">
              <ProposalTypeSelector onSelect={handleTypeSelect} />
              <div>
                <h2 className="text-lg font-semibold mb-3">Conteúdo da Proposta (opcional)</h2>
                <StandaloneFeedbacksCasesEditor
                  feedbacks={standaloneFeedbacks}
                  onFeedbacksChange={setStandaloneFeedbacks}
                />
              </div>
            </div>
          )}

          {/* Completo builder - stays mounted once created */}
          {proposalType === 'completo' && (
            <div className={stage !== 'configure' ? 'hidden' : ''}>
              <button
                onClick={() => { setStage('select'); setProposalType(null); }}
                className="mb-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                ← Voltar para seleção
              </button>
              <StandaloneCompletoBuilder onPresent={handleCompletoPresent} />
            </div>
          )}

          {/* Pontual builder - stays mounted once created */}
          {proposalType === 'pontual' && (
            <div className={stage !== 'configure' ? 'hidden' : ''}>
              <StandalonePontualBuilder
                onPresent={handlePontualPresent}
                onBack={() => { setStage('select'); setProposalType(null); }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Wrapper components that render presentations without auth hooks
function StandaloneCompletoPresentation({
  proposal,
  clientName,
  plannerName,
  feedbacks,
  cases,
  onBack,
}: {
  proposal: Proposal;
  clientName: string;
  plannerName?: string;
  feedbacks: PlannerFeedback[];
  cases: PlannerCase[];
  onBack: () => void;
}) {
  return (
    <ProposalPresentation
      proposal={proposal}
      contact={{ full_name: clientName }}
      diagnostic={null}
      onBack={onBack}
      standaloneMode
      standalonePlannerName={plannerName}
      standaloneFeedbacks={feedbacks}
      standaloneCases={cases}
    />
  );
}

function StandalonePontualPresentation({
  proposal,
  clientName,
  plannerName,
  selectedTopics,
  feedbacks,
  cases,
  onBack,
}: {
  proposal: Proposal;
  clientName: string;
  plannerName?: string;
  selectedTopics: SelectedTopic[];
  feedbacks: PlannerFeedback[];
  cases: PlannerCase[];
  onBack: () => void;
}) {
  return (
    <PontualProposalPresentation
      proposal={proposal}
      contact={{ full_name: clientName }}
      diagnostic={null}
      selectedTopics={selectedTopics}
      onBack={onBack}
      standaloneMode
      standalonePlannerName={plannerName}
      standaloneFeedbacks={feedbacks}
      standaloneCases={cases}
    />
  );
}
