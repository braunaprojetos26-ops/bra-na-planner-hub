import { useRef, useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { AlertCircle, Maximize2, Minimize2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActivePresentation, getStaticPresentationUrl } from '@/hooks/useInstitutionalPresentation';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function InstitutionalPresentationView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [loadError, setLoadError] = useState(false);
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

  // Reset state when URL changes
  useEffect(() => {
    setLoadError(false);
    setPageNumber(1);
  }, [presentationUrl]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoadError(false);
  }

  function onDocumentLoadError() {
    setLoadError(true);
  }

  const goToPrevPage = () => setPageNumber(p => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber(p => Math.min(numPages, p + 1));
  const zoomIn = () => setScale(s => Math.min(2, s + 0.25));
  const zoomOut = () => setScale(s => Math.max(0.5, s - 0.25));

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
        'flex-1 relative overflow-auto flex flex-col items-center',
        isFullscreen ? 'h-full' : 'h-[600px]'
      )}>
        {loadError ? (
          <div className="flex flex-col items-center justify-center gap-4 h-full bg-muted rounded-lg border border-border w-full">
            <AlertCircle className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Não foi possível carregar o PDF
            </p>
            <a href={presentationUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Abrir em nova aba
              </Button>
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <Document
              file={presentationUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-96">
                  <p className="text-muted-foreground">Carregando PDF...</p>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg rounded-lg"
              />
            </Document>
          </div>
        )}
      </div>

      {/* Navigation and controls */}
      {!loadError && numPages > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[100px] text-center">
              Página {pageNumber} de {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
              disabled={scale >= 2}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <a href={presentationUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Abrir PDF
              </Button>
            </a>
            {!isFullscreen && (
              <Button variant="secondary" size="sm" onClick={toggleFullscreen} className="gap-2">
                <Maximize2 className="w-4 h-4" />
                Tela Cheia
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
