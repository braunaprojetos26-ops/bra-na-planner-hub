import { useRef, useState, useEffect } from 'react';
import { AlertCircle, Maximize2, Minimize2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActivePresentation, getStaticPresentationUrl } from '@/hooks/useInstitutionalPresentation';
import { cn } from '@/lib/utils';

export function InstitutionalPresentationView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);
  const { data: presentation, isLoading } = useActivePresentation();

  // Use the database presentation URL if available, otherwise fall back to static file
  const presentationUrl = presentation?.file_path || getStaticPresentationUrl();
  
  // Build full URL for the PDF
  const fullPdfUrl = presentationUrl.startsWith('http') 
    ? presentationUrl 
    : `${window.location.origin}${presentationUrl}`;

  // Google Docs Viewer URL (works as fallback for browsers that don't support inline PDFs)
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fullPdfUrl)}&embedded=true`;

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

  // Reset error state when URL changes
  useEffect(() => {
    setLoadError(false);
    setUseGoogleViewer(false);
  }, [presentationUrl]);

  const handleIframeError = () => {
    console.log('PDF iframe failed to load, switching to Google Viewer');
    setLoadError(true);
    setUseGoogleViewer(true);
  };

  const handleRetry = () => {
    setLoadError(false);
    setUseGoogleViewer(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-secondary/50 rounded-lg">
        <p className="text-muted-foreground">Carregando apresentação...</p>
      </div>
    );
  }

  const viewerUrl = useGoogleViewer ? googleViewerUrl : `${presentationUrl}#toolbar=0&navpanes=0&scrollbar=0`;

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
        'flex-1 relative',
        isFullscreen ? 'h-full' : 'h-[600px]'
      )}>
        <iframe
          src={viewerUrl}
          className="w-full h-full rounded-lg border border-border bg-background"
          title="Apresentação Institucional"
          onError={handleIframeError}
        />

        {/* Fallback UI when both methods fail */}
        {loadError && !useGoogleViewer && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted rounded-lg border border-border">
            <AlertCircle className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Não foi possível exibir o PDF no navegador
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleRetry} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </Button>
              <a href={presentationUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Abrir em nova aba
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>

      {!isFullscreen && (
        <div className="mt-4 flex justify-between items-center">
          {useGoogleViewer && (
            <span className="text-xs text-muted-foreground">
              Usando visualizador alternativo
            </span>
          )}
          <div className="flex gap-2 ml-auto">
            <a href={presentationUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Abrir PDF
              </Button>
            </a>
            <Button variant="secondary" size="sm" onClick={toggleFullscreen} className="gap-2">
              <Maximize2 className="w-4 h-4" />
              Tela Cheia
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
