import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTicket, useTicketMessages, useUpdateTicket, useAddTicketMessage } from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';
import {
  TicketStatus,
  departmentLabels,
  statusLabels,
  priorityLabels,
  statusColors,
  priorityColors,
} from '@/types/tickets';
import { MessageSquare, Clock, User, Send, ExternalLink, FileText } from 'lucide-react';

interface TicketDetailModalProps {
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailModal({ ticketId, open, onOpenChange }: TicketDetailModalProps) {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { data: ticket, isLoading: ticketLoading } = useTicket(ticketId);
  const { data: messages = [], isLoading: messagesLoading } = useTicketMessages(ticketId);
  const updateTicket = useUpdateTicket();
  const addMessage = useAddTicketMessage();

  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const isOperations = role === 'superadmin' || (ticket && user?.id !== ticket.created_by);
  const isOwner = ticket && user?.id === ticket.created_by;

  const handleStatusChange = async (status: TicketStatus) => {
    if (!ticketId) return;
    
    const updates: any = { id: ticketId, status };
    
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = user?.id;
    }
    
    if (status === 'in_progress' && !ticket?.assigned_to) {
      updates.assigned_to = user?.id;
    }

    await updateTicket.mutateAsync(updates);
  };

  const handleSendMessage = async () => {
    if (!ticketId || !newMessage.trim()) return;

    await addMessage.mutateAsync({
      ticket_id: ticketId,
      message: newMessage.trim(),
      is_internal: isInternal,
    });

    setNewMessage('');
    setIsInternal(false);
  };

  const handleViewContact = () => {
    if (ticket?.contact) {
      onOpenChange(false);
      navigate(`/contacts/${ticket.contact.id}`);
    }
  };

  if (!ticketId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chamado #{ticketId.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>

        {ticketLoading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : ticket ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Ticket Info */}
            <div className="space-y-4 pb-4 border-b">
              <div>
                <h3 className="font-semibold text-lg">{ticket.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <Badge className={statusColors[ticket.status]}>
                  {statusLabels[ticket.status]}
                </Badge>
                <Badge className={priorityColors[ticket.priority]}>
                  {priorityLabels[ticket.priority]}
                </Badge>
                <Badge variant="outline">
                  {departmentLabels[ticket.department]}
                </Badge>
              </div>

              {/* Contact Info */}
              {ticket.contact && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4" />
                        <span>{ticket.contact.full_name}</span>
                        {ticket.contact.client_code && (
                          <Badge variant="secondary" className="text-xs">
                            {ticket.contact.client_code}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ticket.contact.phone}
                        {ticket.contact.email && ` • ${ticket.contact.email}`}
                      </div>
                      {ticket.contract && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>Contrato: {ticket.contract.product?.name}</span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleViewContact}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Perfil
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Criado por: {ticket.creator?.full_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
                {ticket.assignee && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Responsável: {ticket.assignee.full_name}</span>
                  </div>
                )}
              </div>

              {/* Status control for operations */}
              {isOperations && ticket.status !== 'closed' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Alterar status:</span>
                  <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as TicketStatus)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="in_progress">Em andamento</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="closed">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 py-4">
              <h4 className="font-medium mb-2">Mensagens</h4>
              <ScrollArea className="h-[200px] pr-4">
                {messagesLoading ? (
                  <div className="text-center text-muted-foreground py-4">Carregando mensagens...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhuma mensagem ainda
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.created_by === user?.id
                            ? 'bg-primary/10 ml-4'
                            : 'bg-muted mr-4'
                        } ${msg.is_internal ? 'border-l-4 border-yellow-500' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {msg.creator?.full_name}
                            {msg.is_internal && (
                              <span className="text-yellow-600 ml-2 text-xs">(interno)</span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* New message */}
            {ticket.status !== 'closed' && (
              <div className="pt-4 border-t space-y-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={3}
                />
                <div className="flex justify-between items-center">
                  {isOperations && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded"
                      />
                      Nota interna (só visível para operações)
                    </label>
                  )}
                  <div className="flex-1" />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || addMessage.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Chamado não encontrado</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
