import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, CheckCircle } from 'lucide-react';
import { useProposalMutations } from '@/hooks/useProposals';
import { useMyFeedbacks } from '@/hooks/usePlannerFeedbacks';
import { useMyCases } from '@/hooks/usePlannerCases';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/proposalPricing';
import type { Proposal } from '@/hooks/useProposals';

// Section components
import { ProposalCover } from './sections/ProposalCover';
import { DiagnosticSection } from './sections/DiagnosticSection';
import { DeliverablesSection } from './sections/DeliverablesSection';
import { IncludedSection } from './sections/IncludedSection';
import { MeetingsSection } from './sections/MeetingsSection';
import { TopicsSection } from './sections/TopicsSection';
import { CasesSection } from './sections/CasesSection';
import { FeedbacksSection } from './sections/FeedbacksSection';
import { SummarySection } from './sections/SummarySection';
import { PricingSection } from './sections/PricingSection';

interface ProposalPresentationProps {
  proposal: Proposal;
  contact: { full_name: string } | null | undefined;
  diagnostic: { overall_score: number; category_scores: Record<string, unknown> } | null | undefined;
  onBack: () => void;
}

export function ProposalPresentation({
  proposal,
  contact,
  diagnostic,
  onBack,
}: ProposalPresentationProps) {
const { user, profile } = useAuth();

  // Format planner name: first name + last name
  const formatPlannerName = (fullName: string | undefined): string => {
    if (!fullName) return 'Planejador';
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'Planejador';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };
  const { markAsPresented } = useProposalMutations();
  const { data: feedbacks } = useMyFeedbacks();
  const { data: cases } = useMyCases();
  const contentRef = useRef<HTMLDivElement>(null);

  const handleMarkPresented = () => {
    markAsPresented.mutate(proposal.id);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Action Bar - Hidden in print */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Edição
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Download className="w-4 h-4 mr-2" />
          Gerar PDF
        </Button>
        {proposal.status !== 'presented' && (
          <Button 
            size="sm" 
            onClick={handleMarkPresented}
            disabled={markAsPresented.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar como Apresentada
          </Button>
        )}
      </div>

      {/* Proposal Content */}
      <div ref={contentRef} className="proposal-content">
        {/* Cover */}
        <ProposalCover
          clientName={contact?.full_name || 'Cliente'}
          plannerName={formatPlannerName(profile?.full_name)}
        />

        {/* Main Content Container */}
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
          {/* Diagnostic Section */}
          {diagnostic && (
            <DiagnosticSection
              overallScore={diagnostic.overall_score}
              categoryScores={diagnostic.category_scores}
            />
          )}

          {/* Deliverables */}
          <DeliverablesSection />

          {/* What's Included */}
          <IncludedSection meetings={proposal.meetings} />

          {/* Meeting Agenda */}
          <MeetingsSection meetings={proposal.meetings} />

          {/* Topics */}
          <TopicsSection />

          {/* Cases - Optional */}
          {proposal.show_cases && cases && cases.length > 0 && (
            <CasesSection cases={cases} />
          )}

          {/* Feedbacks - Optional */}
          {proposal.show_feedbacks && feedbacks && feedbacks.length > 0 && (
            <FeedbacksSection feedbacks={feedbacks} />
          )}

          {/* Summary */}
          <SummarySection
            proposalType={proposal.proposal_type}
            meetings={proposal.meetings}
          />

          {/* Pricing */}
          <PricingSection
            finalValue={proposal.final_value}
            installments={proposal.installments}
            installmentValue={proposal.installment_value}
            discountApplied={proposal.discount_applied}
          />
        </div>

        {/* Footer */}
        <div className="bg-card border-t py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Braúna Planejamento Financeiro
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © {new Date().getFullYear()} Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .proposal-content {
            margin: 0;
            padding: 0;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}
