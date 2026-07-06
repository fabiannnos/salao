import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const params = new URLSearchParams(window.location.search);
if (params.has('clear_cache')) {
  (async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    sessionStorage.clear();
    localStorage.clear();
    params.delete('clear_cache');
    const newUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    console.log('[Cache Clear] Cache limpo com sucesso.');
    window.location.reload();
  })();
  throw new Error('Cache clear in progress');
}

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });

    reg.addEventListener("updatefound", () => {
      const newSW = reg.installing;
      if (!newSW) return;

      newSW.addEventListener("statechange", () => {
        if (newSW.state === "installed" && navigator.serviceWorker.controller) {
          if (confirm("Nova versão disponível. Atualizar agora?")) {
            reg.waiting?.postMessage({ type: "SKIP_WAITING" });
          }
        }
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    }, { once: true });

    setInterval(() => reg.update(), 60 * 60 * 1000);
  } catch (err) {
    console.warn("[SW] Falha ao registrar service worker:", err);
  }
}

if ("serviceWorker" in navigator) {
  registerSW();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);