import { useState, useEffect } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STORAGE_KEY = "helpit_install_prompt_dismissed";

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === "true");

  useEffect(() => {
    const match = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = (window.navigator as any).standalone === true;
    setIsStandalone(match || iosStandalone);
  }, []);

  useEffect(() => {
    if (isStandalone || dismissed) return;

    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (iOS) {
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isStandalone, dismissed]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
    setShow(false);
  };

  if (!show || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] max-w-md mx-auto animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-serif font-black text-xs uppercase tracking-wider text-stone-900">
              Instale o Helpit Beauty Manager
            </h4>
            <p className="text-xs leading-relaxed text-stone-600 mt-1">
              {isIOS
                ? "Toque em Compartilhar e depois em Adicionar à Tela de Início."
                : "Acesse mais rápido e use como aplicativo."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 py-2.5 px-4 rounded-lg text-xs font-bold cursor-pointer transition"
          >
            {isIOS ? "Entendi" : "Depois"}
          </button>
          {!isIOS && deferredPrompt && (
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 bg-stone-900 hover:bg-stone-800 text-white py-2.5 px-4 rounded-lg text-xs font-bold cursor-pointer transition"
            >
              Instalar Agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
