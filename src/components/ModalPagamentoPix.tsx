import { useState, useEffect, useRef, useCallback } from "react";
import { ShieldCheck, ShieldAlert, Copy, Check, X } from "lucide-react";

interface PixData {
  encodedImage: string;
  payload: string;
  paymentId: string;
}

interface ModalPagamentoPixProps {
  open: boolean;
  pixData: PixData | null;
  onClose: () => void;
  onPaymentConfirmed: () => void;
}

type PixStep = "pix" | "confirmed" | "failed";

export default function ModalPagamentoPix({
  open,
  pixData,
  onClose,
  onPaymentConfirmed,
}: ModalPagamentoPixProps) {
  const [step, setStep] = useState<PixStep>("pix");
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopPolling();
      setStep("pix");
      setCopied(false);
      return;
    }
    setStep(pixData ? "pix" : "failed");
  }, [open, pixData, stopPolling]);

  useEffect(() => {
    if (!open || step !== "pix" || !pixData) {
      stopPolling();
      return;
    }

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/payment-status/${pixData.paymentId}`);
        const data = await res.json();
        if (data.success && (data.status === "approved")) {
          stopPolling();
          setStep("confirmed");
        }
      } catch {
        // keep polling
      }
    }, 5000);

    return () => stopPolling();
  }, [open, step, pixData, stopPolling]);

  const handleCopyCode = async () => {
    if (!pixData) return;
    try {
      await navigator.clipboard.writeText(pixData.payload);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = pixData.payload;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleClose = () => {
    stopPolling();
    if (step === "confirmed") {
      onPaymentConfirmed();
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 border-2 border-emerald-500 shadow-2xl text-center space-y-4 font-sans animate-scale-up">

        {/* Icon */}
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-2xs">
          {step === "pix" && (
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          )}
          {step === "confirmed" && (
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          )}
          {step === "failed" && (
            <ShieldAlert className="w-8 h-8 text-rose-600" />
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-stone-900 leading-none">
            {step === "pix" && "Pagamento via PIX"}
            {step === "confirmed" && "Pagamento Confirmado!"}
            {step === "failed" && "Falha no Pagamento"}
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed px-2 mt-2">
            {step === "pix" && "Escaneie o QR Code abaixo com seu aplicativo bancário para pagar."}
            {step === "confirmed" && "Seu pagamento foi confirmado. Sua assinatura será renovada automaticamente."}
            {step === "failed" && "Houve um problema ao gerar o pagamento. Tente novamente."}
          </p>
        </div>

        {/* PIX QR Code & Copy */}
        {step === "pix" && pixData && (
          <>
            <div className="bg-white rounded-xl p-2 border border-stone-200 mx-auto w-56 h-56 flex items-center justify-center">
              <img
                src={`data:image/png;base64,${pixData.encodedImage}`}
                alt="QR Code PIX"
                className="w-52 h-52"
              />
            </div>

            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <p className="text-[9px] text-stone-400 uppercase font-bold tracking-wider mb-1">
                Código Copia e Cola
              </p>
              <div className="w-full text-left text-[10px] font-mono text-stone-800 bg-white border border-stone-200 rounded-md p-2 break-all max-h-20 overflow-y-auto mb-2">
                {pixData.payload}
              </div>
              <button
                onClick={handleCopyCode}
                className="w-full flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] py-2 rounded-lg border border-emerald-200 transition cursor-pointer"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5" /><span>Copiado!</span></>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /><span>Copiar Código PIX</span></>
                )}
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[10px] text-amber-800 leading-relaxed">
              Após realizar o pagamento, nosso sistema identificará o recebimento automaticamente em até 2 minutos.
            </div>
          </>
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          className="w-full bg-zinc-950 hover:bg-black text-white font-bold text-xs py-2.5 rounded-lg shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          {step === "confirmed" ? (
            <><ShieldCheck className="w-4 h-4" /><span>Ver Painel</span></>
          ) : (
            <><X className="w-4 h-4" /><span>Fechar</span></>
          )}
        </button>
      </div>
    </div>
  );
}
