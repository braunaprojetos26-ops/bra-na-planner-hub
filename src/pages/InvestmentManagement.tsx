import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvestmentQueue } from '@/components/investments/InvestmentQueue';
import { InvestmentClientsTab } from '@/components/investments/InvestmentClientsTab';
import { InvestmentConfigTab } from '@/components/investments/InvestmentConfigTab';
import { TrendingUp, ListTodo, Users, Settings } from 'lucide-react';

export default function InvestmentManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Gestão de Investimentos</h1>
          <p className="text-muted-foreground text-sm">Fila de chamados, clientes e configurações</p>
        </div>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Fila de Chamados
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <InvestmentQueue />
        </TabsContent>

        <TabsContent value="clients">
          <InvestmentClientsTab />
        </TabsContent>

        <TabsContent value="config">
          <InvestmentConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
