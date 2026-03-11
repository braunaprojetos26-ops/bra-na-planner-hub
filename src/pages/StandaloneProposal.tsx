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

type Stage = 'select' | 'configure' | 'present';

export default function StandaloneProposal() {
  const [stage, setStage] = useState<Stage>('select');
  const [proposalType, setProposalType] = useState<'completo' | 'pontual' | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [clientName, setClientName] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<SelectedTopic[]>([]);
  const [standaloneFeedbacks, setStandaloneFeedbacks] = useState<PlannerFeedback[]>([]);
  const [standaloneCases, setStandaloneCases] = useState<PlannerCase[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

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

  // Presentation stage
  if (stage === 'present' && proposal) {
    const plannerName = (proposal as any).__plannerName;

    if (proposalType === 'pontual') {
      return (
        <StandalonePontualPresentation
          proposal={proposal}
          clientName={clientName}
          plannerName={plannerName}
          selectedTopics={selectedTopics}
          feedbacks={standaloneFeedbacks}
          cases={standaloneCases}
          onBack={() => setStage('configure')}
        />
      );
    }

    return (
      <StandaloneCompletoPresentation
        proposal={proposal}
        clientName={clientName}
        plannerName={plannerName}
        feedbacks={standaloneFeedbacks}
        cases={standaloneCases}
        onBack={() => setStage('configure')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
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

            {/* Feedbacks & Cases Editor */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Conteúdo da Proposta (opcional)</h2>
              <StandaloneFeedbacksCasesEditor
                feedbacks={standaloneFeedbacks}
                cases={standaloneCases}
                onFeedbacksChange={setStandaloneFeedbacks}
                onCasesChange={setStandaloneCases}
              />
            </div>
          </div>
        )}

        {stage === 'configure' && proposalType === 'completo' && (
          <div>
            <button
              onClick={() => { setStage('select'); setProposalType(null); }}
              className="mb-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              ← Voltar para seleção
            </button>
            <StandaloneCompletoBuilder onPresent={handleCompletoPresent} />
          </div>
        )}

        {stage === 'configure' && proposalType === 'pontual' && (
          <StandalonePontualBuilder
            onPresent={handlePontualPresent}
            onBack={() => { setStage('select'); setProposalType(null); }}
          />
        )}
      </div>
    </div>
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
