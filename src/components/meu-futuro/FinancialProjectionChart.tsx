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
            <span className="text-sm text-muted-foreground">Patrimônio projetado:</span>
            <span className="text-sm font-medium text-foreground ml-auto">
              {formatCurrencyFull(payload.find(p => p.dataKey === "patrimonioProjetado")?.value || 0)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-muted-foreground">Principal investido:</span>
            <span className="text-sm font-medium text-foreground ml-auto">
              {formatCurrencyFull(payload.find(p => p.dataKey === "patrimonioInvestido")?.value || 0)}
            </span>
          </div>
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

export function FinancialProjectionChart({
  data,
  idadeAposentadoria,
  showNegatives,
  periodFilter,
  idadeAtual,
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

  // Agrupar por idade (pegar apenas um ponto por idade para simplificar)
  const chartData = filteredData.filter((d, i, arr) => {
    if (i === 0) return true;
    return d.idade !== arr[i - 1].idade;
  });

  // Calcular domínio do eixo Y
  const allValues = chartData.flatMap(d => [
    d.patrimonioProjetado,
    d.patrimonioInvestido,
    d.aposentadoriaIdeal,
  ]);
  const maxValue = Math.max(...allValues);
  const minValue = showNegatives ? Math.min(...allValues, 0) : 0;

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
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
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
            tickFormatter={(value) => `${value}`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
            tickFormatter={formatCurrency}
            domain={[minValue, maxValue * 1.1]}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Linha vertical na idade de aposentadoria */}
          <ReferenceLine
            x={idadeAposentadoria}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            label={{
              value: "Aposentadoria",
              position: "top",
              className: "text-xs fill-muted-foreground",
            }}
          />

          {/* Linha de aposentadoria ideal (laranja) */}
          <Area
            type="monotone"
            dataKey="aposentadoriaIdeal"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="transparent"
            dot={false}
          />

          {/* Área do patrimônio investido (azul) */}
          <Area
            type="monotone"
            dataKey="patrimonioInvestido"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorInvestido)"
            dot={false}
          />

          {/* Área do patrimônio projetado (verde) */}
          <Area
            type="monotone"
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
