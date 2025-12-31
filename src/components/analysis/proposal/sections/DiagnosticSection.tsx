import { TrendingUp, Shield, Wallet, Target, PiggyBank, BarChart3, CreditCard } from 'lucide-react';

interface DiagnosticSectionProps {
  overallScore: number;
  categoryScores: Record<string, number | { score?: number | string; insight?: string } | null>;
}

// Helper to extract numeric score from either a number or an object with score property
function normalizeScore(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'score' in value) {
    const score = (value as { score?: number | string }).score;
    if (typeof score === 'number') return score;
    if (typeof score === 'string') return parseFloat(score) || 0;
  }
  return 0;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  gestao_gastos: { label: 'Gestão de Gastos', icon: <Wallet className="w-5 h-5" />, color: 'from-green-500 to-green-600' },
  poupanca_minima_sudavel: { label: 'Poupança Mínima Saudável', icon: <PiggyBank className="w-5 h-5" />, color: 'from-amber-500 to-amber-600' },
  reserva_emergencia: { label: 'Reserva de Emergência', icon: <Shield className="w-5 h-5" />, color: 'from-blue-500 to-blue-600' },
  investimentos: { label: 'Investimentos', icon: <TrendingUp className="w-5 h-5" />, color: 'from-purple-500 to-purple-600' },
  protecao_da_renda: { label: 'Proteção da Renda', icon: <Shield className="w-5 h-5" />, color: 'from-cyan-500 to-cyan-600' },
  protecao_patrimonial: { label: 'Proteção Patrimonial', icon: <Shield className="w-5 h-5" />, color: 'from-indigo-500 to-indigo-600' },
  milhas_beneficios: { label: 'Milhas e Benefícios', icon: <CreditCard className="w-5 h-5" />, color: 'from-orange-500 to-orange-600' },
  planejamento_aposentadoria: { label: 'Independência Financeira', icon: <Target className="w-5 h-5" />, color: 'from-emerald-500 to-emerald-600' },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-amber-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Regular';
  return 'Precisa de Atenção';
}

export function DiagnosticSection({ overallScore, categoryScores }: DiagnosticSectionProps) {
  const roundedScore = Math.round(overallScore);
  
  return (
    <section className="space-y-8">
      {/* Section Title */}
      <div className="text-center space-y-2">
        <p className="text-amber-600 text-sm tracking-[0.2em] uppercase font-medium">
          Análise Exclusiva
        </p>
        <h2 className="text-3xl font-light text-foreground">
          Seu Diagnóstico Financeiro
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto" />
      </div>

      {/* Overall Score Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        </div>
        
        <div className="relative z-10 space-y-4">
          <p className="text-slate-400 text-sm">Pontuação Geral</p>
          <div className="flex items-center justify-center gap-4">
            <span className={`text-7xl font-bold ${getScoreColor(roundedScore)}`}>
              {roundedScore}
            </span>
            <span className="text-3xl text-slate-500">/100</span>
          </div>
          <p className={`text-lg font-medium ${getScoreColor(roundedScore)}`}>
            {getScoreLabel(roundedScore)}
          </p>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Esta análise foi gerada por inteligência artificial com base nos dados coletados durante nossa conversa.
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(categoryScores).map(([key, value]) => {
          const config = CATEGORY_CONFIG[key] || { 
            label: key, 
            icon: <BarChart3 className="w-5 h-5" />, 
            color: 'from-gray-500 to-gray-600' 
          };
          const score = normalizeScore(value);
          
          return (
            <div 
              key={key} 
              className="bg-card border rounded-xl p-4 text-center space-y-3"
            >
              <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center text-white`}>
                {config.icon}
              </div>
              <p className="text-sm font-medium text-foreground">{config.label}</p>
              <p className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {Math.round(score)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
