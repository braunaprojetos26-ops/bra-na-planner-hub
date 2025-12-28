import { Rocket, Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function MeuFuturo() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          Meu Futuro
        </h1>
        <p className="text-muted-foreground">
          Planeje e acompanhe sua jornada financeira
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Construction className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Página em construção
          </h2>
          <p className="text-muted-foreground max-w-md">
            Esta área está sendo preparada para você. Em breve, você poderá 
            visualizar e gerenciar seu planejamento financeiro completo aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
