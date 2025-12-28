import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ProjectionDataPoint } from "@/hooks/useFinancialProjection";

interface FinancialProjectionChartProps {
  data: ProjectionDataPoint[];
  idadeAposentadoria: number;
  showNegatives: boolean;
  periodFilter: "2anos" | "5anos" | "10anos" | "max";
  idadeAtual: number;
  viewMode: "mensal" | "anual";
  showPrincipalInvestido?: boolean;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  }
  return `R$ ${value.toFixed(0)}`;
};

const formatCurrencyFull = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

interface TooltipPayloadItem {
  value: number;
  dataKey: string;
  color: string;
  payload: ProjectionDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[280px]">
        <p className="font-medium text-foreground mb-2">
          {dataPoint?.anoMes}: {label} anos
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-muted-foreground">Planejamento Braúna:</span>
            <span className="text-sm font-medium text-foreground ml-auto">
              {formatCurrencyFull(payload.find(p => p.dataKey === "patrimonioProjetado")?.value || 0)}
            </span>
          </div>
          {payload.find(p => p.dataKey === "patrimonioInvestido") && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-muted-foreground">Principal investido:</span>
              <span className="text-sm font-medium text-foreground ml-auto">
                {formatCurrencyFull(payload.find(p => p.dataKey === "patrimonioInvestido")?.value || 0)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm text-muted-foreground">Aposentadoria ideal:</span>
            <span className="text-sm font-medium text-foreground ml-auto">
              {formatCurrencyFull(payload.find(p => p.dataKey === "aposentadoriaIdeal")?.value || 0)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const TICK_INTERVAL = 500000; // R$ 500.000

const generateYAxisTicks = (minValue: number, maxValue: number): number[] => {
  const ticks: number[] = [];
  
  // Arredondar mínimo para baixo no múltiplo de 500K
  const startTick = Math.floor(minValue / TICK_INTERVAL) * TICK_INTERVAL;
  
  // Arredondar máximo para cima no múltiplo de 500K
  const endTick = Math.ceil((maxValue * 1.1) / TICK_INTERVAL) * TICK_INTERVAL;
  
  for (let tick = startTick; tick <= endTick; tick += TICK_INTERVAL) {
    ticks.push(tick);
  }
  
  return ticks;
};

export function FinancialProjectionChart({
  data,
  idadeAposentadoria,
  showNegatives,
  periodFilter,
  idadeAtual,
  viewMode,
  showPrincipalInvestido = false,
}: FinancialProjectionChartProps) {
  // Filtrar dados baseado no período selecionado
  const filteredData = (() => {
    let maxAge = 100;
    switch (periodFilter) {
      case "2anos":
        maxAge = idadeAtual + 2;
        break;
      case "5anos":
        maxAge = idadeAtual + 5;
        break;
      case "10anos":
        maxAge = idadeAtual + 10;
        break;
      case "max":
      default:
        maxAge = 100;
    }
    return data.filter(d => d.idade <= maxAge);
  })();

  // Modo anual: pegar apenas um ponto por idade
  // Modo mensal: mostrar todos os pontos
  const chartData = viewMode === "anual"
    ? filteredData.filter((d, i, arr) => {
        if (i === 0) return true;
        return d.idade !== arr[i - 1].idade;
      })
    : filteredData;

  // Gerar ticks do eixo X (apenas idades inteiras)
  const ageTicksArray = (() => {
    const minAge = Math.floor(chartData[0]?.idade || idadeAtual);
    const maxAge = Math.ceil(chartData[chartData.length - 1]?.idade || 100);
    const ticks: number[] = [];
    for (let age = minAge; age <= maxAge; age++) {
      ticks.push(age);
    }
    return ticks;
  })();

  // Calcular domínio do eixo Y
  const allValues = chartData.flatMap(d => [
    d.patrimonioProjetado,
    d.patrimonioInvestido,
    d.aposentadoriaIdeal,
  ]);
  const maxValue = Math.max(...allValues);
  const minValue = showNegatives ? Math.min(...allValues, 0) : 0;

  // Gerar ticks padronizados em intervalos de R$ 500K
  const yAxisTicks = generateYAxisTicks(minValue, maxValue);

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 30, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorProjetado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorInvestido" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="idade"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={ageTicksArray}
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
            tickFormatter={(value) => Number.isInteger(value) ? `${value}` : ""}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
            tickFormatter={formatCurrency}
            domain={[yAxisTicks[0], yAxisTicks[yAxisTicks.length - 1]]}
            ticks={yAxisTicks}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Linha vertical na idade de aposentadoria */}
          <ReferenceLine
            x={idadeAposentadoria}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            label={{
              value: "Aposentadoria",
              position: "insideTopRight",
              offset: 10,
              className: "text-xs fill-muted-foreground",
            }}
          />

          {/* Linha de aposentadoria ideal (laranja) */}
          <Area
            type="natural"
            dataKey="aposentadoriaIdeal"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="transparent"
            dot={false}
          />

          {/* Área do patrimônio investido (azul) - condicional */}
          {showPrincipalInvestido && (
            <Area
              type="natural"
              dataKey="patrimonioInvestido"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorInvestido)"
              dot={false}
            />
          )}

          {/* Área do patrimônio projetado (verde) */}
          <Area
            type="natural"
            dataKey="patrimonioProjetado"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorProjetado)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
