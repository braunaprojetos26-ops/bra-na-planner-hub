import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CapturedError = {
  message: string;
  stack?: string;
  source?: string;
};

export function GlobalErrorOverlay() {
  const [err, setErr] = useState<CapturedError | null>(null);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.error?.message || event.message || 'Erro desconhecido';
      setErr({
        message,
        stack: event.error?.stack,
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as any;
      const message = reason?.message || String(event.reason || 'Promise rejection');
      setErr({ message, stack: reason?.stack });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (!err) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 8,
          right: 8,
          zIndex: 9999,
          fontSize: 11,
          padding: '4px 8px',
          borderRadius: 999,
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          pointerEvents: 'none',
        }}
      >
        debug:on
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        style={{
          position: 'fixed',
          bottom: 8,
          right: 8,
          zIndex: 10000,
          fontSize: 11,
          padding: '4px 8px',
          borderRadius: 999,
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
        }}
      >
        debug:error
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Erro detectado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            A aplicação encontrou um erro e não conseguiu renderizar esta tela.
          </p>
          <pre className="text-xs whitespace-pre-wrap rounded-md bg-muted p-3 overflow-auto max-h-[40vh]">
            {err.message}
            {err.source ? `\n\nFonte: ${err.source}` : ''}
            {err.stack ? `\n\n${err.stack}` : ''}
          </pre>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Recarregar</Button>
            <Button variant="outline" onClick={() => setErr(null)}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
