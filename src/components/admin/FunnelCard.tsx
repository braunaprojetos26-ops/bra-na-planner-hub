import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, GripVertical, Pencil, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FunnelStagesList } from './FunnelStagesList';
import { useToggleFunnelActive } from '@/hooks/useFunnels';
import type { Funnel } from '@/types/contacts';

interface FunnelCardProps {
  funnel: Funnel;
  onEdit: (funnel: Funnel) => void;
}

export function FunnelCard({ funnel, onEdit }: FunnelCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleActive = useToggleFunnelActive();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: funnel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleToggleActive = () => {
    toggleActive.mutate({
      id: funnel.id,
      is_active: !funnel.is_active,
    });
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={!funnel.is_active ? 'opacity-60' : ''}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="py-3">
            <div className="flex items-center gap-3">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              >
                <GripVertical className="w-5 h-5" />
              </button>

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {funnel.order_position}.
                  </span>
                  <span className="font-medium">{funnel.name}</span>
                  <Badge variant={funnel.is_active ? 'default' : 'secondary'}>
                    {funnel.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  {funnel.auto_create_next && (
                    <span>Auto-criar próximo: ✓</span>
                  )}
                  {funnel.generates_contract && (
                    <span>Gera contrato: ✓</span>
                  )}
                </div>
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(funnel)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleActive}
                  disabled={toggleActive.isPending}
                  title={funnel.is_active ? 'Desativar funil' : 'Ativar funil'}
                >
                  {funnel.is_active ? (
                    <PowerOff className="w-4 h-4 text-destructive" />
                  ) : (
                    <Power className="w-4 h-4 text-green-600" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <FunnelStagesList funnelId={funnel.id} />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
