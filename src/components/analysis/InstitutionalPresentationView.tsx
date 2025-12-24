import { useRef, useState, useEffect } from 'react';
import { AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActivePresentation, getStaticPresentationUrl } from '@/hooks/useInstitutionalPresentation';
import { cn } from '@/lib/utils';

export function InstitutionalPresentationView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { data: presentation, isLoading } = useActivePresentation();

  // Use the database presentation URL if available, otherwise fall back to static file
  const presentationUrl = presentation?.file_path || getStaticPresentationUrl();

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (containerRef.current) {
        await containerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-secondary/50 rounded-lg">
        <p className="text-muted-foreground">Carregando apresentação...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col',
        isFullscreen && 'bg-[#1a1a2e] p-4 h-screen'
      )}
    >
      {isFullscreen && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-xl font-semibold">Apresentação Institucional Braúna</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/10 gap-2"
          >
            <Minimize2 className="w-4 h-4" />
            Sair da Tela Cheia
          </Button>
        </div>
      )}

      <div className={cn(
        'flex-1',
        isFullscreen ? 'h-full' : 'h-[600px]'
      )}>
        <object
          data={`${presentationUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          type="application/pdf"
          className="w-full h-full rounded-lg border border-border"
        >
          <div className="flex flex-col items-center justify-center h-full gap-4 bg-muted rounded-lg border border-border">
            <AlertCircle className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Não foi possível exibir o PDF no navegador
            </p>
            <a href={presentationUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="gap-2">
                Abrir em nova aba
              </Button>
            </a>
          </div>
        </object>
      </div>

      {!isFullscreen && (
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={toggleFullscreen} className="gap-2">
            <Maximize2 className="w-4 h-4" />
            Tela Cheia
          </Button>
        </div>
      )}
    </div>
  );
}
