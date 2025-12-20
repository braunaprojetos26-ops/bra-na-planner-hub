import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Mail, DollarSign, Tag, User, Plus, Briefcase } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useContactOpportunities } from '@/hooks/useOpportunities';
import { NewOpportunityModal } from '@/components/opportunities/NewOpportunityModal';
import type { Contact } from '@/types/contacts';

interface ContactDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

export function ContactDetailModal({ open, onOpenChange, contact }: ContactDetailModalProps) {
  const { data: opportunities, isLoading: opportunitiesLoading } = useContactOpportunities(contact.id);
  const [showNewOpportunityModal, setShowNewOpportunityModal] = useState(false);

  const activeOpportunities = opportunities?.filter(o => o.status === 'active') || [];
  const otherOpportunities = opportunities?.filter(o => o.status !== 'active') || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl">{contact.full_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  {contact.temperature && (
                    <Badge variant="outline" className={
                      contact.temperature === 'hot' ? 'text-red-500 border-red-500' :
                      contact.temperature === 'warm' ? 'text-yellow-500 border-yellow-500' :
                      'text-blue-500 border-blue-500'
                    }>
                      {contact.temperature === 'hot' ? 'Quente' : contact.temperature === 'warm' ? 'Morno' : 'Frio'}
                    </Badge>
                  )}
                  {contact.qualification && (
                    <span className="text-yellow-500 text-sm">
                      {'⭐'.repeat(contact.qualification)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{contact.phone}</span>
                </div>
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.income && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>R$ {contact.income.toLocaleString('pt-BR')}</span>
                  </div>
                )}
                {contact.source && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span>{contact.source}</span>
                  </div>
                )}
                {contact.owner && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Responsável: {contact.owner.full_name}</span>
                  </div>
                )}
              </div>

              {contact.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Anotações
                  </p>
                  <p className="text-sm">{contact.notes}</p>
                </div>
              )}

              <Separator />

              {/* Opportunities */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-medium">Oportunidades</h3>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setShowNewOpportunityModal(true)}
                    className="gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Nova
                  </Button>
                </div>

                {opportunitiesLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : opportunities?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma oportunidade</p>
                ) : (
                  <div className="space-y-2">
                    {activeOpportunities.map(opp => (
                      <div key={opp.id} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{opp.current_funnel?.name}</p>
                            <p className="text-xs text-muted-foreground">{opp.current_stage?.name}</p>
                          </div>
                          <Badge>Ativa</Badge>
                        </div>
                      </div>
                    ))}
                    {otherOpportunities.map(opp => (
                      <div key={opp.id} className="p-3 rounded-lg border opacity-60">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{opp.current_funnel?.name}</p>
                            <p className="text-xs text-muted-foreground">{opp.current_stage?.name}</p>
                          </div>
                          <Badge variant={opp.status === 'won' ? 'secondary' : 'destructive'}>
                            {opp.status === 'won' ? 'Ganha' : 'Perdida'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <NewOpportunityModal
        open={showNewOpportunityModal}
        onOpenChange={setShowNewOpportunityModal}
        defaultContactId={contact.id}
      />
    </>
  );
}
