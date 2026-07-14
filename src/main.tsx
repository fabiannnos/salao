import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const params = new URLSearchParams(window.location.search);
if (params.has('clear_cache')) {
  (async () => {
    // Business data keys that must NEVER be cleared
    const BUSINESS_DATA_KEYS = [
      'saas_salao_salons',
      'saas_salao_professionals',
      'saas_salao_services',
      'saas_salao_products',
      'saas_salao_clients',
      'saas_salao_comandas',
      'saas_salao_financials',
      'saas_salao_appointments',
      'saas_salao_charts',
      'saas_salao_service_categories',
      'saas_salao_card_acquirers',
    ] as const;

    // Auth keys to preserve
    const AUTH_KEYS = [
      'auth_userRole',
      'auth_currentSalonId',
      'auth_currentProfessionalId',
      'auth_lastRoute',
    ] as const;

    // Preserve auth and business keys before clearing
    const saved: Record<string, string> = {};
    for (const key of [...AUTH_KEYS, ...BUSINESS_DATA_KEYS]) {
      const val = localStorage.getItem(key);
      if (val) saved[key] = val;
    }

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

    // Restore auth and business keys
    for (const [key, val] of Object.entries(saved)) {
      localStorage.setItem(key, val);
    }

    params.delete('clear_cache');
    const newUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    console.log('[Cache Clear] Cache limpo com sucesso. Dados de negócio e sessão preservados.');
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