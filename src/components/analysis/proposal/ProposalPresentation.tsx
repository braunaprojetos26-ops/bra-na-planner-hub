import { useRef, useEffect } from 'react';
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
import { ProposalCoverPrint } from './sections/ProposalCoverPrint';
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

  // Scroll para o topo quando o componente montar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
        {/* Wrapper for printed pages only */}
        <div className="proposal-pages">
          {/* Page 1 - Cover (Full A4, no margins) */}
          <div className="print-page print-cover">
            {/* Screen version */}
            <div className="print:hidden">
              <ProposalCover
                clientName={contact?.full_name || 'Cliente'}
                plannerName={formatPlannerName(profile?.full_name)}
              />
            </div>
            {/* Print version - deterministic grid layout */}
            <ProposalCoverPrint
              clientName={contact?.full_name || 'Cliente'}
              plannerName={formatPlannerName(profile?.full_name)}
            />
          </div>

          {/* Page 2 - Entregáveis + O que está Incluso */}
          <div className="print-page print-content-page max-w-4xl mx-auto px-6 py-12 print:py-0 print:px-0 print:max-w-none space-y-16 print:space-y-4">
            <DeliverablesSection />
            <IncludedSection meetings={proposal.meetings} />
          </div>

          {/* Page 3 - Jornada + Temas */}
          <div className="print-page print-content-page max-w-4xl mx-auto px-6 py-12 print:py-0 print:px-0 print:max-w-none space-y-16 print:space-y-4">
            <MeetingsSection meetings={proposal.meetings} />
            <TopicsSection />
          </div>

          {/* Page 4 - Resumo + Investimento */}
          <div className="print-page print-content-page max-w-4xl mx-auto px-6 py-12 print:py-0 print:px-0 print:max-w-none space-y-16 print:space-y-8">
            <SummarySection meetings={proposal.meetings} />
            <PricingSection
              finalValue={proposal.final_value}
              installments={proposal.installments}
              installmentValue={proposal.installment_value}
              discountApplied={proposal.discount_applied}
            />
          </div>

          {/* Page 5 - Cases & Feedbacks (Optional) */}
          {((proposal.show_cases && cases && cases.length > 0) || 
            (proposal.show_feedbacks && feedbacks && feedbacks.length > 0)) && (
            <div className="print-page print-content-page max-w-4xl mx-auto px-6 py-12 print:py-0 print:px-0 print:max-w-none space-y-16 print:space-y-8">
              {proposal.show_cases && cases && cases.length > 0 && (
                <CasesSection cases={cases} />
              )}
              {proposal.show_feedbacks && feedbacks && feedbacks.length > 0 && (
                <FeedbacksSection feedbacks={feedbacks} />
              )}
            </div>
          )}
        </div>

        {/* Footer - Screen only (outside proposal-pages to not affect print pagination) */}
        <div className="bg-card border-t py-8 text-center print:hidden">
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
          /* Preserve colors */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          
          /* A4 page setup */
          @page {
            size: A4;
            margin: 0;
          }
          
          /* Reset html/body */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: auto !important;
            background: white !important;
          }
          
          /* Hide layout elements */
          header,
          nav,
          aside,
          [data-sidebar],
          .print\\:hidden {
            display: none !important;
          }
          
          /* Remove padding from main */
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Proposal content container */
          .proposal-content {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Pages wrapper */
          .proposal-pages {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Page wrapper - single break source, no page-break-inside avoid on A4-sized elements */
          .print-page {
            break-after: page;
            width: 210mm !important;
          }
          
          /* Last page should NOT force a page break after */
          .proposal-pages > .print-page:last-child {
            break-after: auto !important;
          }
          
          /* Cover page - exact A4 container */
          .print-cover {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            position: relative !important;
          }
          
          /* Print cover grid layout */
          .print-cover .print\\:grid {
            display: grid !important;
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            inset: 0 !important;
          }
          
          /* Content pages */
          .print-content-page {
            width: 210mm !important;
            min-height: 277mm !important;
            max-height: 297mm !important;
            padding: 8mm 12mm !important;
            background: white !important;
            color: #1a1a1a !important;
            font-size: 9pt !important;
            overflow: hidden !important;
          }
          
          /* Typography scaling */
          .print-content-page h2 {
            font-size: 12pt !important;
            margin-bottom: 4pt !important;
          }
          
          .print-content-page h3 {
            font-size: 10pt !important;
          }
          
          .print-content-page p {
            font-size: 8pt !important;
            line-height: 1.3 !important;
          }
          
          /* Reduce spacing */
          .print-content-page > * {
            margin-bottom: 6pt !important;
          }
          
          /* Prevent section breaks */
          section {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
