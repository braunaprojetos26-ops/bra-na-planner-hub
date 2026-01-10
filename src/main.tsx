import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Elemento #root não encontrado no index.html");
}

const root = createRoot(rootEl);

function BootScreen({ title, details }: { title: string; details?: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Se isso persistir, copie a mensagem abaixo e me envie aqui no chat.
        </p>
        {details ? (
          <pre className="mt-4 text-xs whitespace-pre-wrap rounded-md bg-muted p-4 overflow-auto max-h-[50vh]">
            {details}
          </pre>
        ) : (
          <div className="mt-4 text-sm text-muted-foreground">Carregando…</div>
        )}
      </div>
    </div>
  );
}

root.render(
  <React.StrictMode>
    <BootScreen title="Inicializando aplicação" />
  </React.StrictMode>
);

(async () => {
  try {
    const mod = await import("./App");
    const App = mod.default;

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    const message = err instanceof Error ? `${err.message}\n\n${err.stack ?? ""}` : String(err);
    root.render(
      <React.StrictMode>
        <BootScreen title="Falha ao carregar a aplicação" details={message} />
      </React.StrictMode>
    );
  }
})();
