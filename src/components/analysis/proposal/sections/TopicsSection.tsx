import { 
  Wallet, 
  TrendingUp, 
  Shield, 
  Home, 
  GraduationCap, 
  Plane, 
  Car, 
  Heart, 
  Building2, 
  Leaf 
} from 'lucide-react';

const TOPICS = [
  { icon: <Wallet className="w-6 h-6" />, title: 'Fluxo de Caixa', description: 'Organização financeira mensal' },
  { icon: <TrendingUp className="w-6 h-6" />, title: 'Investimentos', description: 'Estratégias personalizadas' },
  { icon: <Shield className="w-6 h-6" />, title: 'Proteção', description: 'Seguros e previdência' },
  { icon: <Home className="w-6 h-6" />, title: 'Imóveis', description: 'Compra, venda e financiamento' },
  { icon: <GraduationCap className="w-6 h-6" />, title: 'Educação', description: 'Planejamento para filhos' },
  { icon: <Plane className="w-6 h-6" />, title: 'Viagens', description: 'Realizando sonhos' },
  { icon: <Car className="w-6 h-6" />, title: 'Veículos', description: 'Compra consciente' },
  { icon: <Heart className="w-6 h-6" />, title: 'Aposentadoria', description: 'Independência financeira' },
  { icon: <Building2 className="w-6 h-6" />, title: 'Sucessão', description: 'Planejamento patrimonial' },
  { icon: <Leaf className="w-6 h-6" />, title: 'Sustentabilidade', description: 'Investimentos ESG' },
];

export function TopicsSection() {
  return (
    <section className="space-y-8">
      {/* Section Title */}
      <div className="text-center space-y-2">
        <p className="text-amber-600 text-sm tracking-[0.2em] uppercase font-medium">
          Personalize sua experiência
        </p>
        <h2 className="text-3xl font-light text-foreground">
          Temas que Podemos Aprofundar
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto" />
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {TOPICS.map((topic, index) => (
          <div
            key={index}
            className="group flex flex-col items-center text-center p-4 bg-card border rounded-xl hover:border-amber-500/50 hover:shadow-lg transition-all cursor-default"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-amber-600 mb-3 group-hover:scale-110 transition-transform">
              {topic.icon}
            </div>
            <h3 className="font-medium text-sm text-foreground mb-1">{topic.title}</h3>
            <p className="text-xs text-muted-foreground">{topic.description}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Durante as reuniões, você pode solicitar aprofundamento em qualquer um desses temas.
      </p>
    </section>
  );
}
