import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, ChevronRight, Edit, Trash2, Scale, Activity,
  Shield, DollarSign, TrendingUp, PiggyBank, Wallet, CreditCard,
  BarChart3, PieChart, Target, Award, Heart, Home, Car,
  Briefcase, GraduationCap, Clock, AlertTriangle, CheckCircle
} from 'lucide-react';
import { DiagnosticCategory, useDeleteDiagnosticCategory } from '@/hooks/useDiagnosticConfig';
import { DiagnosticRuleEditor } from './DiagnosticRuleEditor';

interface Props {
  category: DiagnosticCategory;
  onEdit: (category: DiagnosticCategory) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, DollarSign, TrendingUp, PiggyBank, Wallet, CreditCard,
  BarChart3, PieChart, Target, Award, Heart, Home, Car,
  Briefcase, GraduationCap, Clock, AlertTriangle, CheckCircle, Activity
};

export function AdminDiagnosticCategoryCard({ category, onEdit }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const deleteMutation = useDeleteDiagnosticCategory();

  const IconComponent = iconMap[category.icon || 'Activity'] || Activity;

  const handleDelete = async () => {
    if (!confirm(`Excluir a categoria "${category.name}"? Isso também excluirá todas as regras associadas.`)) return;
    await deleteMutation.mutateAsync(category.id);
  };

  return (
    <Card className={!category.is_active ? 'opacity-60' : ''}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left flex-1">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconComponent className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm truncate">{category.name}</h3>
                    {!category.is_active && (
                      <Badge variant="secondary" className="text-xs">Inativa</Badge>
                    )}
                  </div>
                  {category.description && (
                    <p className="text-xs text-muted-foreground truncate">{category.description}</p>
                  )}
                </div>
              </button>
            </CollapsibleTrigger>

            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Scale className="h-3 w-3" />
                <span>Peso: {category.weight}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onEdit(category)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <DiagnosticRuleEditor 
              categoryId={category.id} 
              categoryName={category.name}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
