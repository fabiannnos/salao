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
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(STORAGE_KEY) === "true");
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const match = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = (window.navigator as any).standalone === true;
    setIsStandalone(match || iosStandalone);
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    setIsIOS(iOS);
    setIsMobileBrowser(iOS || android);
  }, []);

  useEffect(() => {
    if (isStandalone || dismissed || !isMobileBrowser) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => setShow(true), 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, [isStandalone, dismissed, isMobileBrowser]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuide(true);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
    setShow(false);
  };

  if (!show || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] max-w-md mx-auto animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 space-y-4">
        {showGuide && !isIOS && !deferredPrompt ? (
          <>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center shrink-0">
                <span className="text-lg">📱</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-serif font-black text-xs uppercase tracking-wider text-stone-900">
                  Como instalar
                </h4>
                <p className="text-xs leading-relaxed text-stone-600 mt-1">
                  Abra o menu do navegador <span className="font-bold">⋮</span> e selecione{" "}
                  <strong>"Adicionar à tela inicial"</strong> ou{" "}
                  <strong>"Instalar aplicativo"</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 py-2.5 px-4 rounded-lg text-xs font-bold cursor-pointer transition"
            >
              Entendi
            </button>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center shrink-0">
                <span className="text-lg">📱</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-serif font-black text-xs uppercase tracking-wider text-stone-900">
                  Instale o Gestão Modello
                </h4>
                <p className="text-xs leading-relaxed text-stone-600 mt-1">
                  {isIOS
                    ? "Toque em Compartilhar e depois em Adicionar à Tela de Início."
                    : "Acesse mais rápido, receba uma experiência semelhante a aplicativo e evite precisar digitar o endereço novamente."}
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
              {!isIOS && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="flex-1 bg-stone-900 hover:bg-stone-800 text-white py-2.5 px-4 rounded-lg text-xs font-bold cursor-pointer transition"
                >
                  Instalar Agora
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
