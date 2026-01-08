import { useState } from 'react';
import { ChevronUp, ChevronDown, User, CheckCircle, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectPropertiesSectionProps {
  owner?: {
    full_name: string;
    avatar_url?: string;
  };
  verification?: string | null;
  updatedAt: string;
  onVerificationChange?: (value: string) => void;
}

export function ProjectPropertiesSection({
  owner,
  verification,
  updatedAt,
  onVerificationChange,
}: ProjectPropertiesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formattedDate = format(new Date(updatedAt), "d 'de' MMMM 'de' yyyy HH:mm", {
    locale: ptBR,
  });

  return (
    <div className="border-b border-border/50 pb-4 mb-6">
      <div className="space-y-3">
        {/* Proprietário */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground w-40">
            <User className="h-4 w-4" />
            <span>Proprietário</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={owner?.avatar_url} />
              <AvatarFallback className="text-xs">
                {owner?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <span>{owner?.full_name || 'Desconhecido'}</span>
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Verificação */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground w-40">
                <CheckCircle className="h-4 w-4" />
                <span>Verificação</span>
              </div>
              <span className="text-muted-foreground">
                {verification || 'Vazio'}
              </span>
            </div>

            {/* Última edição */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground w-40">
                <Clock className="h-4 w-4" />
                <span>Última edição</span>
              </div>
              <span className="text-muted-foreground">{formattedDate}</span>
            </div>
          </>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-muted-foreground hover:text-foreground"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4 mr-1" />
            Ocultar propriedades
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-1" />
            Mostrar propriedades
          </>
        )}
      </Button>
    </div>
  );
}
