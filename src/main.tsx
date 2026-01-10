import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root");

function renderFatal(error: unknown) {
  // Fallback that works even if React tree fails to mount
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error("Fatal render error:", error);

  if (rootEl) {
    rootEl.innerHTML = `
      <div style="font-family: ui-sans-serif, system-ui; padding: 24px;">
        <h1 style="font-size: 18px; font-weight: 700; margin: 0 0 8px;">Erro ao carregar o app</h1>
        <p style="margin: 0 0 16px; color: #444;">O app falhou antes de renderizar a interface.</p>
        <pre style="white-space: pre-wrap; background: #f3f4f6; padding: 12px; border-radius: 8px;">${message}</pre>
        <button onclick="location.reload()" style="margin-top: 12px; padding: 10px 12px; border-radius: 8px; border: 1px solid #ddd; background: white; cursor: pointer;">Recarregar</button>
      </div>
    `;
  }
}

try {
  if (!rootEl) throw new Error('Elemento #root não encontrado');

  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  renderFatal(e);
}

