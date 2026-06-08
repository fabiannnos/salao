import { useState, useEffect } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STORAGE_KEY = "helpit_pwa_dismissed";

export default function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    try {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        !!(window.navigator as any).standalone;
      if (isStandalone) return;

      try {
        if (sessionStorage.getItem(STORAGE_KEY) === "true") return;
      } catch {}

      const ua = navigator.userAgent;
      const iOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const android = /Mobi|Android/.test(ua);
      if (!iOS && !android) return;

      setIsIOS(iOS);

      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener("beforeinstallprompt", handler);

      const timer = setTimeout(() => setShow(true), 500);

      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(timer);
      };
    } catch (e) {
      console.error("[PWA]", e);
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") setShow(false);
      } catch {}
      setDeferredPrompt(null);
    } else {
      setShowGuide(true);
    }
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  if (showGuide && !isIOS && !deferredPrompt) {
    return (
      <div className="sticky top-0 left-0 right-0 z-[200] bg-amber-50 border-b-2 border-amber-200 px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">📱</span>
            <p className="text-xs leading-relaxed text-amber-900">
              Abra o menu do navegador{" "}
              <span className="font-bold">⋮</span> e selecione{" "}
              <strong>"Adicionar à tela inicial"</strong> ou{" "}
              <strong>"Instalar aplicativo"</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 bg-amber-200 hover:bg-amber-300 text-amber-900 py-1.5 px-3 rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap"
          >
            Entendi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 left-0 right-0 z-[200] bg-black text-white px-4 py-3">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">📱</span>
          <p className="text-xs leading-relaxed text-stone-300">
            {isIOS
              ? "Instale o Gestão Modello: toque em Compartilhar e depois em Adicionar à Tela de Início."
              : "Instale o Gestão Modello — acesse mais rápido como aplicativo."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white py-1.5 px-3 rounded-lg text-xs font-bold cursor-pointer transition"
          >
            {isIOS ? "Entendi" : "Depois"}
          </button>
          {!isIOS && (
            <button
              type="button"
              onClick={handleInstall}
              className="bg-amber-500 hover:bg-amber-400 text-black py-1.5 px-3 rounded-lg text-xs font-bold cursor-pointer transition"
            >
              Instalar Agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
