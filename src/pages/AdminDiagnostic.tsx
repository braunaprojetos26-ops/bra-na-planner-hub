import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Brain, Info } from 'lucide-react';
import { useAllDiagnosticCategories, DiagnosticCategory } from '@/hooks/useDiagnosticConfig';
import { AdminDiagnosticCategoryCard } from '@/components/admin/diagnostic/DiagnosticCategoryCard';
import { DiagnosticCategoryForm } from '@/components/admin/diagnostic/DiagnosticCategoryForm';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminDiagnostic() {
  const { data: categories = [], isLoading } = useAllDiagnosticCategories();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DiagnosticCategory | null>(null);

  const handleEdit = (category: DiagnosticCategory) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingCategory(null);
    }
  };

  const nextOrderPosition = categories.length > 0 
    ? Math.max(...categories.map(c => c.order_position)) + 1 
    : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurar Diagnóstico por IA</h1>
            <p className="text-muted-foreground text-sm">
              Defina as categorias e regras de avaliação para o diagnóstico financeiro
            </p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Como funciona:</strong> Cada categoria de diagnóstico possui regras de avaliação. 
          A IA usa os <strong>prompts</strong> para entender como avaliar e os <strong>campos de dados</strong> 
          para saber quais informações da coleta utilizar. Ajuste o <strong>peso</strong> para dar mais 
          importância a determinadas categorias na nota geral.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Carregando categorias...
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">Nenhuma categoria configurada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie categorias de diagnóstico para que a IA possa avaliar seus clientes.
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <AdminDiagnosticCategoryCard
              key={category.id}
              category={category}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <DiagnosticCategoryForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        category={editingCategory}
        nextOrderPosition={nextOrderPosition}
      />
    </div>
  );
}
