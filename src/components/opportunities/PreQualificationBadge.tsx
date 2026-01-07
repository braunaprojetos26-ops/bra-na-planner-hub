import { ClipboardCheck, Clock, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMeetingPreQualificationLink } from '@/hooks/usePreQualification';
import { useToast } from '@/hooks/use-toast';

interface PreQualificationBadgeProps {
  meetingId: string;
  meetingType: string;
  onCopyLink?: () => void;
}

export function PreQualificationBadge({ meetingId, meetingType, onCopyLink }: PreQualificationBadgeProps) {
  const { toast } = useToast();
  const { data: preQualData, isLoading } = useMeetingPreQualificationLink(meetingId);

  // Only show for Análise meetings
  if (meetingType !== 'Análise' || isLoading) return null;

  // No pre-qual response created yet
  if (!preQualData) return null;

  const isResponded = !!preQualData.submitted_at;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/formulario-analise/${preQualData.token}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado!' });
    onCopyLink?.();
  };

  return (
    <div className="flex items-center gap-1.5">
      {isResponded ? (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">
          <ClipboardCheck className="w-2.5 h-2.5 mr-1" />
          Formulário respondido
        </Badge>
      ) : (
        <>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-2.5 h-2.5 mr-1" />
            Aguardando formulário
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5" 
            onClick={handleCopyLink}
            title="Copiar link do formulário"
          >
            <Link2 className="w-3 h-3" />
          </Button>
        </>
      )}
    </div>
  );
}