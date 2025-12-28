import { useState } from "react";
import { Rocket, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

import { useFinancialProjection } from "@/hooks/useFinancialProjection";
import { FinancialProjectionChart } from "@/components/meu-futuro/FinancialProjectionChart";
import { FinancialControlPanel } from "@/components/meu-futuro/FinancialControlPanel";
import { RateSettingsModal } from "@/components/meu-futuro/RateSettingsModal";

const DEFAULT_CONFIG = {
  idadeAtual: 33,
  patrimonioInicial: 0,
  idadeAposentadoria: 65,
  rendaDesejada: 0,
  investimentoMensal: 0,
  outrasFontesRenda: 0,
  taxaAcumuloAnual: 4,
  taxaUsufruteAnual: 3.5,
};

type PeriodFilter = "2anos" | "5anos" | "10anos" | "max";

export default function MeuFuturo() {
  // Estados dos parâmetros
  const [idadeAtual] = useState(DEFAULT_CONFIG.idadeAtual);
  const [patrimonioInicial] = useState(DEFAULT_CONFIG.patrimonioInicial);
  const [idadeAposentadoria, setIdadeAposentadoria] = useState(DEFAULT_CONFIG.idadeAposentadoria);
  const [rendaDesejada, setRendaDesejada] = useState(DEFAULT_CONFIG.rendaDesejada);
  const [investimentoMensal, setInvestimentoMensal] = useState(DEFAULT_CONFIG.investimentoMensal);
  const [outrasFontesRenda, setOutrasFontesRenda] = useState(DEFAULT_CONFIG.outrasFontesRenda);
  const [taxaAcumuloAnual, setTaxaAcumuloAnual] = useState(DEFAULT_CONFIG.taxaAcumuloAnual);
  const [taxaUsufruteAnual, setTaxaUsufruteAnual] = useState(DEFAULT_CONFIG.taxaUsufruteAnual);

  // Estados da UI
  const [showNegatives, setShowNegatives] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("max");
  const [rateModalOpen, setRateModalOpen] = useState(false);

  // Calcular projeção
  const projection = useFinancialProjection({
    idadeAtual,
    patrimonioInicial,
    aporteMensal: investimentoMensal,
    idadeAposentadoria,
    rendaDesejada,
    outrasFontesRenda,
    taxaAcumuloAnual,
    taxaUsufruteAnual,
  });

  const handleSalvarMeta = () => {
    toast({
      title: "Meta salva",
      description: "Suas configurações de independência financeira foram salvas com sucesso.",
    });
  };

  const handleResetTaxas = () => {
    setTaxaAcumuloAnual(DEFAULT_CONFIG.taxaAcumuloAnual);
    setTaxaUsufruteAnual(DEFAULT_CONFIG.taxaUsufruteAnual);
  };

  const handleSaveTaxas = () => {
    toast({
      title: "Taxas atualizadas",
      description: "As taxas de rentabilidade foram atualizadas com sucesso.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          Meu Futuro
        </h1>
        <p className="text-muted-foreground">
          Planeje e acompanhe sua jornada para a independência financeira
        </p>
      </div>

      {/* Card principal */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Independência financeira</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRateModalOpen(true)}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Botões de período */}
            <Tabs value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <TabsList className="h-8">
                <TabsTrigger value="2anos" className="text-xs px-3 h-6">
                  2 anos
                </TabsTrigger>
                <TabsTrigger value="5anos" className="text-xs px-3 h-6">
                  5 anos
                </TabsTrigger>
                <TabsTrigger value="10anos" className="text-xs px-3 h-6">
                  10 anos
                </TabsTrigger>
                <TabsTrigger value="max" className="text-xs px-3 h-6">
                  Máximo
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Toggle negativos */}
            <div className="flex items-center gap-2">
              <Switch
                id="show-negatives"
                checked={showNegatives}
                onCheckedChange={setShowNegatives}
              />
              <Label htmlFor="show-negatives" className="text-sm cursor-pointer">
                Negativos
              </Label>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
            {/* Gráfico */}
            <div className="min-h-[400px]">
              <FinancialProjectionChart
                data={projection.data}
                idadeAposentadoria={idadeAposentadoria}
                showNegatives={showNegatives}
                periodFilter={periodFilter}
                idadeAtual={idadeAtual}
              />
              
              {/* Legenda */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Patrimônio projetado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Principal investido</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-orange-500" style={{ borderStyle: "dashed" }} />
                  <span className="text-muted-foreground">Aposentadoria ideal</span>
                </div>
              </div>
            </div>

            {/* Painel de controles */}
            <FinancialControlPanel
              idadeAposentadoria={idadeAposentadoria}
              rendaDesejada={rendaDesejada}
              outrasFontesRenda={outrasFontesRenda}
              investimentoMensal={investimentoMensal}
              onIdadeAposentadoriaChange={setIdadeAposentadoria}
              onRendaDesejadaChange={setRendaDesejada}
              onOutrasFontesRendaChange={setOutrasFontesRenda}
              onInvestimentoMensalChange={setInvestimentoMensal}
              aporteNecessario={projection.aporteNecessario}
              capitalNecessario={projection.capitalNecessario}
              patrimonioFinalAposentadoria={projection.patrimonioFinalAposentadoria}
              idadePatrimonioAcaba={projection.idadePatrimonioAcaba}
              onSalvar={handleSalvarMeta}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal de configurações de taxas */}
      <RateSettingsModal
        open={rateModalOpen}
        onOpenChange={setRateModalOpen}
        taxaAcumulo={taxaAcumuloAnual}
        taxaUsufruto={taxaUsufruteAnual}
        onTaxaAcumuloChange={setTaxaAcumuloAnual}
        onTaxaUsufruteChange={setTaxaUsufruteAnual}
        onResetToDefaults={handleResetTaxas}
        onSave={handleSaveTaxas}
      />
    </div>
  );
}
