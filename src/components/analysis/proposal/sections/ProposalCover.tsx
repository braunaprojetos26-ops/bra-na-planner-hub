import braunaLogo from '@/assets/brauna-logo.png';

interface ProposalCoverProps {
  clientName: string;
  plannerName: string;
  subtitle?: string;
}

export function ProposalCover({ clientName, plannerName, subtitle = 'Proposta Personalizada' }: ProposalCoverProps) {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen print:min-h-0 print:h-[297mm] print:w-[210mm] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden print:overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(211, 172, 110, 0.3) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(211, 172, 110, 0.2) 0%, transparent 50%)`,
        }} />
      </div>

      {/* Golden Line Decoration */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

      {/* Content */}
      <div className="relative z-10 text-center space-y-8 px-6">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <img 
            src={braunaLogo} 
            alt="Braúna" 
            className="h-20 w-auto brightness-0 invert"
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <p className="text-gold text-sm tracking-[0.3em] uppercase font-light">
            {subtitle}
          </p>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
        </div>

        {/* Client Name */}
        <h1 className="text-4xl md:text-5xl font-light tracking-wide">
          {clientName}
        </h1>

        {/* Planner Info */}
        <div className="pt-12 space-y-2">
          <p className="text-sm text-slate-400">Elaborada por</p>
          <p className="text-lg font-medium text-gold">{plannerName}</p>
          <p className="text-xs text-slate-500">{currentDate}</p>
        </div>
      </div>

      {/* Corner Decorations */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-gold/30" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-gold/30" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-gold/30" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-gold/30" />
    </div>
  );
}
