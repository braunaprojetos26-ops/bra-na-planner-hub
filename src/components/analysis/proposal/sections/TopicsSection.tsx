import { 
  Home, 
  GraduationCap, 
  Plane, 
  TrendingUp, 
  Building2, 
  Briefcase, 
  Heart, 
  Wallet, 
  CreditCard, 
  DollarSign 
} from 'lucide-react';

const TOPICS = [
  { icon: <Home className="w-6 h-6 print:w-3 print:h-3" />, title: 'Aquisição de Bens', description: 'Adquira bens usando melhores estratégias' },
  { icon: <GraduationCap className="w-6 h-6 print:w-3 print:h-3" />, title: 'Preparação', description: 'Planejamento para filhos' },
  { icon: <Plane className="w-6 h-6 print:w-3 print:h-3" />, title: 'Viagens', description: 'Planejamento personalizado' },
  { icon: <TrendingUp className="w-6 h-6 print:w-3 print:h-3" />, title: 'Renda Variável', description: 'Investindo em ações' },
  { icon: <Building2 className="w-6 h-6 print:w-3 print:h-3" />, title: 'Fundos Imobiliários', description: 'Invista no mercado imobiliário' },
  { icon: <Briefcase className="w-6 h-6 print:w-3 print:h-3" />, title: 'Sua Empresa', description: 'Separação PF e PJ' },
  { icon: <Heart className="w-6 h-6 print:w-3 print:h-3" />, title: 'Casamento', description: 'Preparação para casamentos' },
  { icon: <Wallet className="w-6 h-6 print:w-3 print:h-3" />, title: 'Dia a Dia', description: 'Aprenda vantagens que economizam' },
  { icon: <CreditCard className="w-6 h-6 print:w-3 print:h-3" />, title: 'Cartões', description: 'Benefícios que valem a pena' },
  { icon: <DollarSign className="w-6 h-6 print:w-3 print:h-3" />, title: 'Câmbio', description: 'Estratégias cambiais' },
];

export function TopicsSection() {
  return (
    <section className="space-y-8 print:space-y-2">
      {/* Section Title */}
      <div className="text-center space-y-2 print:space-y-1">
        <p className="text-gold text-sm print:text-[8pt] tracking-[0.2em] uppercase font-medium">
          Personalize sua experiência
        </p>
        <h2 className="text-3xl print:text-[12pt] font-light text-foreground">
          Temas que Podemos Aprofundar
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 print:grid-cols-5 gap-4 print:gap-1.5">
        {TOPICS.map((topic, index) => (
          <div
            key={index}
            className="group flex flex-col items-center text-center p-4 print:p-1.5 bg-card border rounded-xl print:rounded-lg hover:border-gold/50 hover:shadow-lg transition-all cursor-default"
          >
            <div className="w-14 h-14 print:w-6 print:h-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-gold mb-3 print:mb-1 group-hover:scale-110 transition-transform">
              {topic.icon}
            </div>
            <h3 className="font-medium text-sm print:text-[7pt] text-foreground mb-1 print:mb-0 print:leading-tight">{topic.title}</h3>
            <p className="text-xs print:text-[6pt] text-muted-foreground print:leading-tight print:hidden">{topic.description}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-sm print:text-[7pt] text-muted-foreground">
        Durante as reuniões, você pode solicitar aprofundamento em qualquer um desses temas.
      </p>
    </section>
  );
}
