import { useState, useRef, useEffect, ReactNode } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FullscreenWrapperProps {
  children: ReactNode;
  className?: string;
  fullscreenClassName?: string;
  title?: string;
}

export function FullscreenWrapper({
  children,
  className,
  fullscreenClassName,
  title,
}: FullscreenWrapperProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const enterFullscreen = async () => {
    try {
      if (containerRef.current) {
        await containerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error('Error entering fullscreen:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
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

  return (
    <div
      ref={containerRef}
      className={cn(
        className,
        isFullscreen && cn('bg-[#1a1a2e] p-4 flex flex-col', fullscreenClassName)
      )}
    >
      {isFullscreen && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 className="text-white text-xl font-semibold">{title}</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={exitFullscreen}
            className="text-white hover:bg-white/10 ml-auto"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      <div className={cn('flex-1', isFullscreen && 'flex items-center justify-center')}>
        {children}
      </div>

      {!isFullscreen && (
        <Button
          variant="outline"
          size="sm"
          onClick={enterFullscreen}
          className="gap-2"
        >
          <Maximize2 className="w-4 h-4" />
          Tela Cheia
        </Button>
      )}
    </div>
  );
}

export function FullscreenButton({
  targetRef,
  className,
}: {
  targetRef: React.RefObject<HTMLElement>;
  className?: string;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (targetRef.current) {
        await targetRef.current.requestFullscreen();
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

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleFullscreen}
      className={cn('gap-2', className)}
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="w-4 h-4" />
          Sair da Tela Cheia
        </>
      ) : (
        <>
          <Maximize2 className="w-4 h-4" />
          Tela Cheia
        </>
      )}
    </Button>
  );
}
