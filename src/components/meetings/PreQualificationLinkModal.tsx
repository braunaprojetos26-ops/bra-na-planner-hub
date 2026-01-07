import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Copy, Check, MessageCircle, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface PreQualificationLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  meetingDate: Date;
  token: string;
}

export function PreQualificationLinkModal({
  open,
  onOpenChange,
  contactName,
  meetingDate,
  token,
}: PreQualificationLinkModalProps) {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const formLink = `${window.location.origin}/formulario-analise/${token}`;
  
  const formattedDate = format(meetingDate, "dd 'de' MMMM", { locale: ptBR });
  const formattedTime = format(meetingDate, 'HH:mm');

  const defaultMessage = `Olá ${contactName.split(' ')[0]}! 👋

Para que nossa reunião seja mais produtiva, preparei um breve formulário para você responder antes do nosso encontro.

Leva apenas 2-3 minutos: ${formLink}

Aguardo você no dia ${formattedDate} às ${formattedTime}!`;

  const [message, setMessage] = useState(defaultMessage);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(formLink);
    setCopiedLink(true);
    toast({ title: 'Link copiado!' });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(message);
    setCopiedMessage(true);
    toast({ title: 'Mensagem copiada!' });
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    // Encode the message for WhatsApp URL
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Reunião agendada com sucesso!
          </DialogTitle>
          <DialogDescription>
            Envie o formulário de pré-qualificação para {contactName} antes da reunião.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Link do formulário */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link do formulário</label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                {formLink}
              </div>
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                {copiedLink ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={formLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Mensagem para WhatsApp */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem para WhatsApp</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="text-sm"
            />
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCopyMessage}>
              {copiedMessage ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copiar mensagem
            </Button>
            <Button className="flex-1" onClick={handleOpenWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Abrir WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
