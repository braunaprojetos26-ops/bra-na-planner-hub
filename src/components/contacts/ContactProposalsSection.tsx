import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useContactProposals } from '@/hooks/useProposals';
import { ProposalPresentation } from '@/components/analysis/proposal/ProposalPresentation';
import { formatCurrency } from '@/lib/proposalPricing';

interface ContactProposalsSectionProps {
  contactId: string;
  contactName: string;
}

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  presented: 'Apresentada',
  accepted: 'Aceita',
  rejected: 'Recusada',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  presented: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export function ContactProposalsSection({ contactId, contactName }: ContactProposalsSectionProps) {
  const { data: proposals, isLoading } = useContactProposals(contactId);
  const [isOpen, setIsOpen] = useState(false);
  const [viewingProposalId, setViewingProposalId] = useState<string | null>(null);

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const viewingProposal = proposals?.find(p => p.id === viewingProposalId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-accent" />
            Propostas Comerciais
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-xs text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!proposals?.length) {
    return (
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-accent" />
            Propostas Comerciais
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-xs text-muted-foreground">Nenhuma proposta cadastrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-accent" />
            Propostas Comerciais ({proposals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            {/* First proposal always visible */}
            <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-xs">
                    {proposals[0].proposal_type === 'planejamento_completo' 
                      ? 'Planejamento Completo' 
                      : 'Planejamento Pontual'}
                  </p>
                  <Badge className={`${statusColors[proposals[0].status]} text-[10px]`}>
                    {statusLabels[proposals[0].status]}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(proposals[0].created_at)} • {formatCurrency(proposals[0].final_value)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewingProposalId(proposals[0].id)}
              >
                <Eye className="w-3 h-3 mr-1" />
                Ver
              </Button>
            </div>

            {/* Collapsible for remaining proposals */}
            {proposals.length > 1 && (
              <>
                <CollapsibleContent className="space-y-1.5 mt-1.5">
                  {proposals.slice(1).map((proposal) => (
                    <div 
                      key={proposal.id}
                      className="flex items-center justify-between p-2 bg-secondary/50 rounded-md"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-xs">
                            {proposal.proposal_type === 'planejamento_completo' 
                              ? 'Planejamento Completo' 
                              : 'Planejamento Pontual'}
                          </p>
                          <Badge className={`${statusColors[proposal.status]} text-[10px]`}>
                            {statusLabels[proposal.status]}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(proposal.created_at)} • {formatCurrency(proposal.final_value)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setViewingProposalId(proposal.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ver
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>

                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-2 h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isOpen ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Ver mais ({proposals.length - 1})
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </>
            )}
          </Collapsible>
        </CardContent>
      </Card>

      {/* Proposal View Dialog */}
      <Dialog open={!!viewingProposalId} onOpenChange={(open) => !open && setViewingProposalId(null)}>
        <DialogContent className="max-w-7xl h-[90vh] overflow-y-auto p-0">
          {viewingProposal && (
            <ProposalPresentation
              proposal={viewingProposal}
              contact={{ full_name: contactName }}
              diagnostic={
                viewingProposal.diagnostic_score
                  ? {
                      overall_score: viewingProposal.diagnostic_score,
                      category_scores: viewingProposal.diagnostic_scores as Record<string, unknown> || {},
                    }
                  : null
              }
              onBack={() => setViewingProposalId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
