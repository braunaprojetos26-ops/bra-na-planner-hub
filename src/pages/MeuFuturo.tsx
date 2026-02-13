import { useState } from "react";
import { Rocket, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { InitialAmountModal } from "@/components/meu-futuro/InitialAmountModal";
import { InitialAmountSection } from "@/components/meu-futuro/InitialAmountSection";
import { DreamsSection } from "@/components/meu-futuro/DreamsSection";
import { NewDreamModal } from "@/components/meu-futuro/NewDreamModal";
import { Dream } from "@/types/dreams";

const DEFAULT_CONFIG = {
  idadeAtual: 33,
  patrimonioInicial: 0,
  idadeAposentadoria: 60,
  rendaDesejada: 0,
  investimentoMensal: 0,
  outrasFontesRenda: 0,
  taxaAcumuloAnual: 4,
  taxaUsufruteAnual: 3.5,
};

type PeriodFilter = "2anos" | "5anos" | "10anos" | "max";
type ViewMode = "mensal" | "anual";

export default function MeuFuturo() {
  // Estados dos parâmetros
  const [idadeAtual, setIdadeAtual] = useState(DEFAULT_CONFIG.idadeAtual);
  const [patrimonioInicial, setPatrimonioInicial] = useState(DEFAULT_CONFIG.patrimonioInicial);
  const [idadeAposentadoria, setIdadeAposentadoria] = useState(DEFAULT_CONFIG.idadeAposentadoria);
  const [rendaDesejada, setRendaDesejada] = useState(DEFAULT_CONFIG.rendaDesejada);
  const [investimentoMensal, setInvestimentoMensal] = useState(DEFAULT_CONFIG.investimentoMensal);
  const [outrasFontesRenda, setOutrasFontesRenda] = useState(DEFAULT_CONFIG.outrasFontesRenda);
  const [taxaAcumuloAnual, setTaxaAcumuloAnual] = useState(DEFAULT_CONFIG.taxaAcumuloAnual);
  const [taxaUsufruteAnual, setTaxaUsufruteAnual] = useState(DEFAULT_CONFIG.taxaUsufruteAnual);

  // Estados da UI
  const [showNegatives, setShowNegatives] = useState(false);
  const [showPrincipalInvestido, setShowPrincipalInvestido] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("max");
  const [viewMode, setViewMode] = useState<ViewMode>("anual");
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [initialAmountModalOpen, setInitialAmountModalOpen] = useState(false);
  
  // Estados dos sonhos
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [dreamModalOpen, setDreamModalOpen] = useState(false);
  const [editingDream, setEditingDream] = useState<Dream | null>(null);

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
    dreams,
  });

  const handleSalvarMeta = () => {
    toast({
      title: "Meta salva",
      description: "Suas configurações de independência financeira foram salvas com sucesso.",
    });
  };

  const handleResetTaxas = () => {
    setIdadeAtual(DEFAULT_CONFIG.idadeAtual);
    setTaxaAcumuloAnual(DEFAULT_CONFIG.taxaAcumuloAnual);
    setTaxaUsufruteAnual(DEFAULT_CONFIG.taxaUsufruteAnual);
  };

  const handleSaveTaxas = () => {
    toast({
      title: "Taxas atualizadas",
      description: "As taxas de rentabilidade foram atualizadas com sucesso.",
    });
  };

  // Handlers dos sonhos
  const handleSaveDream = (dream: Dream) => {
    if (editingDream) {
      setDreams(prev => prev.map(d => d.id === dream.id ? dream : d));
      toast({
        title: "Sonho atualizado",
        description: `"${dream.name}" foi atualizado com sucesso.`,
      });
    } else {
      setDreams(prev => [...prev, dream]);
      toast({
        title: "Sonho adicionado",
        description: `"${dream.name}" foi adicionado ao seu planejamento.`,
      });
    }
    setEditingDream(null);
  };

  const handleEditDream = (dream: Dream) => {
    setEditingDream(dream);
    setDreamModalOpen(true);
  };

  const handleDeleteDream = (id: string) => {
    const dream = dreams.find(d => d.id === id);
    setDreams(prev => prev.filter(d => d.id !== id));
    toast({
      title: "Sonho removido",
      description: dream ? `"${dream.name}" foi removido do planejamento.` : "Objetivo removido.",
    });
  };

  const handleAddDream = () => {
    setEditingDream(null);
    setDreamModalOpen(true);
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

            {/* Toggle visualização mensal/anual */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="mensal" className="text-xs px-3 h-6">
                  Mensal
                </TabsTrigger>
                <TabsTrigger value="anual" className="text-xs px-3 h-6">
                  Anual
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
                viewMode={viewMode}
                showPrincipalInvestido={showPrincipalInvestido}
              />
              
              {/* Legenda Interativa */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs">
                {/* Planejamento Braúna - sempre visível */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Planejamento Braúna</span>
                </div>
                
                {/* Principal Investido - clicável para toggle */}
                <button
                  onClick={() => setShowPrincipalInvestido(!showPrincipalInvestido)}
                  className={cn(
                    "flex items-center gap-2 transition-opacity cursor-pointer hover:opacity-80",
                    !showPrincipalInvestido && "opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-3 h-3 rounded-full bg-blue-500",
                    !showPrincipalInvestido && "opacity-50"
                  )} />
                  <span className={cn(
                    "text-muted-foreground",
                    !showPrincipalInvestido && "line-through"
                  )}>
                    Principal investido
                  </span>
                </button>
                
                {/* Aposentadoria Ideal - sempre visível */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-orange-500" style={{ borderStyle: "dashed" }} />
                  <span className="text-muted-foreground">Aposentadoria ideal</span>
                </div>
              </div>

              {/* Seção Montante Inicial */}
              <InitialAmountSection
                patrimonioInicial={patrimonioInicial}
                onOpenModal={() => setInitialAmountModalOpen(true)}
              />
              
              {/* Seção Meus Sonhos */}
              <DreamsSection
                dreams={dreams}
                onAddDream={handleAddDream}
                onEditDream={handleEditDream}
                onDeleteDream={handleDeleteDream}
              />
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
              aporteIdealMensal={projection.aporteIdealMensal}
              capitalNecessario={projection.capitalNecessario}
              patrimonioFinalAposentadoria={projection.patrimonioFinalAposentadoria}
              idadePatrimonioAcaba={projection.idadePatrimonioAcaba}
              idadeFinalIdeal={projection.idadeFinalIdeal}
              onSalvar={handleSalvarMeta}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal de configurações de taxas */}
      <RateSettingsModal
        open={rateModalOpen}
        onOpenChange={setRateModalOpen}
        idadeAtual={idadeAtual}
        onIdadeAtualChange={setIdadeAtual}
        taxaAcumulo={taxaAcumuloAnual}
        taxaUsufruto={taxaUsufruteAnual}
        onTaxaAcumuloChange={setTaxaAcumuloAnual}
        onTaxaUsufruteChange={setTaxaUsufruteAnual}
        onResetToDefaults={handleResetTaxas}
        onSave={handleSaveTaxas}
      />

      {/* Modal de montante inicial */}
      <InitialAmountModal
        open={initialAmountModalOpen}
        onOpenChange={setInitialAmountModalOpen}
        currentValue={patrimonioInicial}
        onConfirm={(value) => {
          setPatrimonioInicial(value);
          toast({
            title: value > 0 ? "Montante definido" : "Montante removido",
            description: value > 0
              ? `Patrimônio inicial definido como ${value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
              : "O patrimônio inicial foi removido da simulação",
          });
        }}
      />

      {/* Modal de novo/editar sonho */}
      <NewDreamModal
        open={dreamModalOpen}
        onOpenChange={setDreamModalOpen}
        onSave={handleSaveDream}
        editingDream={editingDream}
      />
    </div>
  );
}
