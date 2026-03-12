import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, CheckCircle } from 'lucide-react';
import { SummarySection } from './sections/SummarySection';
import { useProposalMutations } from '@/hooks/useProposals';
import { useMyFeedbacks } from '@/hooks/usePlannerFeedbacks';
import { useMyCases } from '@/hooks/usePlannerCases';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/proposalPricing';
import { PONTUAL_TOPICS, type SelectedTopic } from '@/lib/pontualTopics';
import type { Proposal } from '@/hooks/useProposals';
import type { PlannerFeedback } from '@/hooks/usePlannerFeedbacks';
import type { PlannerCase } from '@/hooks/usePlannerCases';

// Maps pontual topic keys to related case title keywords
const TOPIC_CASE_MAP: Record<string, string[]> = {
  viagens_milhas: ['milhas'],
  viagens_planejamento: ['milhas'],
  aposentadoria: ['aposentadoria'],
  carteira_investimentos: ['investimentos'],
  ensinamento_investimentos: ['investimentos'],
  fundos_previdenciarios: ['investimentos', 'aposentadoria'],
  vantagem_tributaria: ['fiscal', 'ir'],
  quitacao_financiamento: ['imobiliário'],
  aquisicao_bens: ['imobiliário'],
  organizacao_financeira: ['mentalidade'],
  endividamento: ['mentalidade'],
  troca_divida: ['mentalidade'],
  seguro_vida: [],
  planejamento_sucessorio: ['imobiliário'],
};

function filterCasesByTopics(cases: PlannerCase[], selectedTopics: SelectedTopic[]): PlannerCase[] {
  const selectedKeys = selectedTopics.map(t => {
    const topic = PONTUAL_TOPICS.find(pt => pt.name === t.topic);
    return topic?.key || '';
  }).filter(Boolean);

  const relevantKeywords = new Set<string>();
  for (const key of selectedKeys) {
    const keywords = TOPIC_CASE_MAP[key] || [];
    keywords.forEach(k => relevantKeywords.add(k));
  }

  if (relevantKeywords.size === 0) return [];

  return cases.filter(c =>
    Array.from(relevantKeywords).some(keyword =>
      c.title.toLowerCase().includes(keyword)
    )
  );
}

// Section components
import { ProposalCover } from './sections/ProposalCover';
import { DiagnosticSection } from './sections/DiagnosticSection';
import { CasesSection } from './sections/CasesSection';
import { FeedbacksSection } from './sections/FeedbacksSection';
import { PricingSection } from './sections/PricingSection';

interface PontualProposalPresentationProps {
  proposal: Proposal;
  contact: { full_name: string } | null | undefined;
  diagnostic: { overall_score: number; category_scores: Record<string, unknown> } | null | undefined;
  selectedTopics: SelectedTopic[];
  onBack: () => void;
  standaloneMode?: boolean;
  standalonePlannerName?: string;
  standaloneFeedbacks?: PlannerFeedback[];
  standaloneCases?: PlannerCase[];
}

export function PontualProposalPresentation({
  proposal,
  contact,
  diagnostic,
  selectedTopics,
  onBack,
  standaloneMode = false,
  standalonePlannerName,
  standaloneFeedbacks,
  standaloneCases,
}: PontualProposalPresentationProps) {
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
  const { data: authFeedbacks } = useMyFeedbacks();
  const { data: authCases } = useMyCases();
  
  const feedbacks = standaloneMode ? standaloneFeedbacks : authFeedbacks;
  const cases = standaloneMode ? standaloneCases : authCases;
  const contentRef = useRef<HTMLDivElement>(null);

  const handleMarkPresented = () => {
    markAsPresented.mutate(proposal.id);
  };

  const handlePrint = () => {
    window.print();
  };

  // Get topic details for selected topics
  const topicDetails = selectedTopics.map(selected => {
    const topic = PONTUAL_TOPICS.find(t => t.name === selected.topic);
    return {
      ...selected,
      subtopics: topic?.subtopics || [],
    };
  });

  const totalMeetings = selectedTopics.reduce((sum, t) => sum + t.meetings, 0);

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
        {!standaloneMode && proposal.status !== 'presented' && (
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
          plannerName={standaloneMode ? (standalonePlannerName || 'Planejador') : formatPlannerName(profile?.full_name)}
          subtitle="Planejamento Pontual"
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

          {/* Selected Topics Section */}
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <p className="text-gold text-sm tracking-[0.2em] uppercase font-medium">
                Foco personalizado
              </p>
              <h2 className="text-3xl font-light text-foreground">
                Tópicos Selecionados
              </h2>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
            </div>

            <div className="grid gap-4">
              {topicDetails.map((topic, index) => (
                <div
                  key={topic.topic}
                  className="group flex items-start gap-4 p-5 bg-card border rounded-xl hover:border-gold/50 hover:shadow-lg transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-gold font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-foreground">{topic.topic}</h3>
                      <span className="text-sm font-bold text-gold">
                        {topic.meetings}x
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {topic.meetings} {topic.meetings > 1 ? 'reuniões dedicadas' : 'reunião dedicada'}
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {topic.subtopics.map((subtopic, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          <span>{subtopic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* What's Included - Cards highlighting unique differentiators */}
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <p className="text-gold text-sm tracking-[0.2em] uppercase font-medium">
                Tudo incluído
              </p>
              <h2 className="text-3xl font-light text-foreground">
                O que está Incluso
              </h2>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Reuniões dedicadas */}
              <div className="flex items-start gap-3 p-4 bg-card border rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Reuniões dedicadas
                  </h3>
                  <p className="text-2xl font-bold text-gold mt-1">
                    {totalMeetings}x
                  </p>
                </div>
              </div>

              {/* Material de apoio */}
              <div className="flex items-start gap-3 p-4 bg-card border rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Material de apoio
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Planilhas e recursos exclusivos
                  </p>
                </div>
              </div>

              {/* Suporte via WhatsApp */}
              <div className="flex items-start gap-3 p-4 bg-card border rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Suporte via WhatsApp
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Durante o período do planejamento
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Cases - Filtered by selected topics for pontual */}
          {(() => {
            const filteredCases = cases ? filterCasesByTopics(cases, selectedTopics) : [];
            const shouldShow = standaloneMode ? filteredCases.length > 0 : (proposal.show_cases && filteredCases.length > 0);
            return shouldShow ? <CasesSection cases={filteredCases} /> : null;
          })()}

          {/* Feedbacks - Optional */}
          {(standaloneMode ? (feedbacks && feedbacks.length > 0) : (proposal.show_feedbacks && feedbacks && feedbacks.length > 0)) && (
            <FeedbacksSection feedbacks={feedbacks!} />
          )}

          {/* Resumo */}
          <SummarySection meetings={totalMeetings} />

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
