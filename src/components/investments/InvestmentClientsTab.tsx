import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, TrendingUp } from 'lucide-react';

export function InvestmentClientsTab() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-muted-foreground">Integração em breve</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Esta seção será conectada a uma fonte de dados externa para exibir carteira, 
            alocação e histórico de investimentos de cada cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
