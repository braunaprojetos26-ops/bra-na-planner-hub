import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { useProposalMutations } from '@/hooks/useProposals';
import { useMyFeedbacks } from '@/hooks/usePlannerFeedbacks';
import { useMyCases } from '@/hooks/usePlannerCases';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/proposalPricing';
import { PONTUAL_TOPICS, type SelectedTopic } from '@/lib/pontualTopics';
import type { Proposal } from '@/hooks/useProposals';

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
}

export function PontualProposalPresentation({
  proposal,
  contact,
  diagnostic,
  selectedTopics,
  onBack,
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
  const { data: feedbacks } = useMyFeedbacks();
  const { data: cases } = useMyCases();
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
          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Tópicos Selecionados</h2>
              <p className="text-muted-foreground">
                Foco especializado nos temas mais relevantes para você
              </p>
            </div>

            <div className="grid gap-6">
              {topicDetails.map((topic, index) => (
                <Card key={topic.topic} className="border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">{topic.topic}</h3>
                          <p className="text-sm text-muted-foreground">
                            {topic.meetings} reunião{topic.meetings > 1 ? 'ões' : ''} dedicada{topic.meetings > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary">
                        {topic.meetings}x
                      </Badge>
                    </div>

                    <div className="pl-[52px] space-y-2">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        O que vamos abordar:
                      </p>
                      {topic.subtopics.map((subtopic, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span>{subtopic}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* What's Included - Adapted for Pontual */}
          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">O que está Incluso</h2>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-primary">Entregas Garantidas</h4>
                    {topicDetails.map(topic => (
                      <div key={topic.topic} className="space-y-1">
                        <p className="text-sm font-medium">{topic.topic}:</p>
                        {topic.subtopics.map((sub, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground pl-3">
                            <CheckCircle className="w-3 h-3 text-success shrink-0" />
                            <span>{sub}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-primary mb-3">Formato</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span>{totalMeetings} reunião{totalMeetings > 1 ? 'ões' : ''} online de 1 hora</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span>Material de apoio personalizado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span>Gravação das reuniões</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Important Notice - No Continuous Support */}
          <section>
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Importante</h3>
                    <p className="text-muted-foreground">
                      Este é um <strong>planejamento pontual</strong> focado em temas específicos. 
                      Não inclui acompanhamento contínuo ou suporte após as {totalMeetings} reunião{totalMeetings > 1 ? 'ões' : ''} contratada{totalMeetings > 1 ? 's' : ''} {totalMeetings > 1 ? 'serem' : 'ser'} realizada{totalMeetings > 1 ? 's' : ''}.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Para um acompanhamento completo com suporte contínuo, considere nosso <strong>Planejamento Completo</strong>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Cases - Optional */}
          {proposal.show_cases && cases && cases.length > 0 && (
            <CasesSection cases={cases} />
          )}

          {/* Feedbacks - Optional */}
          {proposal.show_feedbacks && feedbacks && feedbacks.length > 0 && (
            <FeedbacksSection feedbacks={feedbacks} />
          )}

          {/* Pricing - Adapted for Pontual */}
          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Investimento</h2>
            </div>

            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-8 text-center space-y-6">
                <div>
                  <p className="text-muted-foreground mb-2">Valor Total</p>
                  <p className="text-4xl font-bold text-primary">
                    {formatCurrency(proposal.final_value)}
                  </p>
                </div>

                {proposal.installments > 1 && (
                  <div className="pt-4 border-t">
                    <p className="text-lg">
                      ou <span className="font-bold">{proposal.installments}x</span> de{' '}
                      <span className="font-bold text-primary">
                        {formatCurrency(proposal.installment_value)}
                      </span>
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Formas de Pagamento</p>
                  <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                    <span>PIX (à vista)</span>
                    <span>•</span>
                    <span>Cartão de Crédito (1 a 6x)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
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
