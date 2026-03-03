import { Calculator, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlanningClients } from '@/hooks/usePlanningClients';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlanningHome() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = usePlanningClients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Montagem de Planejamento
        </h1>
        <p className="text-muted-foreground">
          Selecione um cliente no menu lateral para iniciar a montagem do planejamento financeiro.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Clientes disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum cliente com plano ativo encontrado. Clientes aparecem aqui após o pagamento do contrato de planejamento ser confirmado.
            </p>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <button
                  key={client.contact_id}
                  onClick={() => navigate(`/planning/${client.contact_id}/futuro`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{client.full_name}</p>
                    <p className="text-xs text-muted-foreground">Plano ativo</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
