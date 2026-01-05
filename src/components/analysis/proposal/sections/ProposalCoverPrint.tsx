import braunaLogo from '@/assets/brauna-logo.png';

interface ProposalCoverPrintProps {
  clientName: string;
  plannerName: string;
  subtitle?: string;
}

/**
 * Deterministic print-only cover using CSS Grid.
 * 3-band layout (top/center/footer) with fixed dimensions.
 * Hidden on screen, visible only in print.
 */
export function ProposalCoverPrint({ 
  clientName, 
  plannerName, 
  subtitle = 'Proposta Personalizada' 
}: ProposalCoverPrintProps) {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div 
      className="hidden print:grid w-full h-full"
      style={{
        display: 'none',
        gridTemplateRows: 'auto 1fr auto',
        background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Pattern Layer */}
      <div 
        style={{
          position: 'absolute',
          inset: '-16px',
          opacity: 0.1,
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(211, 172, 110, 0.3) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(211, 172, 110, 0.2) 0%, transparent 50%)`,
        }} 
      />

      {/* Golden Lines */}
      <div 
        style={{
          position: 'absolute',
          top: '-16px',
          left: '-16px',
          right: '-16px',
          height: '4px',
          background: 'linear-gradient(to right, transparent, rgb(211, 172, 110), transparent)',
        }} 
      />
      <div 
        style={{
          position: 'absolute',
          bottom: '-16px',
          left: '-16px',
          right: '-16px',
          height: '4px',
          background: 'linear-gradient(to right, transparent, rgb(211, 172, 110), transparent)',
        }} 
      />

      {/* Corner Decorations */}
      <div style={{ position: 'absolute', top: '32px', left: '32px', width: '48px', height: '48px', borderLeft: '2px solid rgba(211, 172, 110, 0.3)', borderTop: '2px solid rgba(211, 172, 110, 0.3)' }} />
      <div style={{ position: 'absolute', top: '32px', right: '32px', width: '48px', height: '48px', borderRight: '2px solid rgba(211, 172, 110, 0.3)', borderTop: '2px solid rgba(211, 172, 110, 0.3)' }} />
      <div style={{ position: 'absolute', bottom: '32px', left: '32px', width: '48px', height: '48px', borderLeft: '2px solid rgba(211, 172, 110, 0.3)', borderBottom: '2px solid rgba(211, 172, 110, 0.3)' }} />
      <div style={{ position: 'absolute', bottom: '32px', right: '32px', width: '48px', height: '48px', borderRight: '2px solid rgba(211, 172, 110, 0.3)', borderBottom: '2px solid rgba(211, 172, 110, 0.3)' }} />

      {/* TOP BAND - Logo */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '18mm',
        }}
      >
        <img
          src={braunaLogo}
          alt="Braúna"
          style={{
            height: '54px',
            width: 'auto',
            filter: 'brightness(0) invert(1)',
          }}
        />
      </div>

      {/* CENTER BAND - Title & Client */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 16mm',
        }}
      >
        {/* Subtitle */}
        <p
          style={{
            color: 'rgb(211, 172, 110)',
            fontSize: '9pt',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            fontWeight: 300,
            marginBottom: '6pt',
          }}
        >
          {subtitle}
        </p>

        {/* Divider */}
        <div
          style={{
            width: '70px',
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgb(211, 172, 110), transparent)',
            marginBottom: '14pt',
          }}
        />

        {/* Client Name */}
        <h1
          style={{
            fontSize: '24pt',
            fontWeight: 300,
            letterSpacing: '0.04em',
            margin: 0,
          }}
        >
          {clientName}
        </h1>
      </div>

      {/* FOOTER BAND - Planner & Date */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          paddingBottom: '18mm',
        }}
      >
        <p
          style={{
            fontSize: '8pt',
            color: '#94a3b8',
            marginBottom: '3pt',
          }}
        >
          Elaborada por
        </p>
        <p
          style={{
            fontSize: '10pt',
            fontWeight: 500,
            color: 'rgb(211, 172, 110)',
            marginBottom: '3pt',
          }}
        >
          {plannerName}
        </p>
        <p
          style={{
            fontSize: '8pt',
            color: '#64748b',
          }}
        >
          {currentDate}
        </p>
      </div>

      {/* Force print styles inline for reliability */}
      <style>{`
        @media print {
          .print\\:grid {
            display: grid !important;
          }
        }
      `}</style>
    </div>
  );
}
