import { useState, useEffect } from "react";
import { Trash2, X, ShieldAlert, Loader2, AlertTriangle } from "lucide-react";
import { TS, TAB } from "../forensic";

interface CascadePreview {
  comanda: {
    id: string;
    ticketNumber: string;
    totalValue: number;
    clientName: string;
    status: string;
  } | null;
  counts: {
    financialRecords: number;
  };
}

interface ModalConfirmCascadeDeleteProps {
  open: boolean;
  comandaId: string | null;
  onConfirm: (comandaId: string) => Promise<void>;
  onClose: () => void;
}

export default function ModalConfirmCascadeDelete({
  open,
  comandaId,
  onConfirm,
  onClose,
}: ModalConfirmCascadeDeleteProps) {
  const [preview, setPreview] = useState<CascadePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !comandaId) {
      setPreview(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/comandas/${comandaId}/cascade-preview`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setPreview(data);
        } else {
          setError(data.error || "Erro ao carregar prévia");
        }
      })
      .catch((err) => setError(err.message || "Erro de rede"))
      .finally(() => setLoading(false));
  }, [open, comandaId]);

  const handleConfirm = async () => {
    if (!comandaId || confirming) return;
    console.log(`[${TAB()}] [${TS()}] [DELETE_FLOW] ModalConfirmCascadeDelete: handleConfirm comandaId=${comandaId}`);
    setConfirming(true);
    try {
      await onConfirm(comandaId);
      console.log(`[${TAB()}] [${TS()}] [DELETE_FLOW] ModalConfirmCascadeDelete: onConfirm resolvido`);
      onClose();
    } catch (err) {
      console.error(`[${TAB()}] [${TS()}] [DELETE_FLOW] ModalConfirmCascadeDelete: erro`, err);
      setError("Erro ao excluir comanda");
    } finally {
      setConfirming(false);
    }
  };

  if (!open) return null;

  const n = preview?.counts;
  const totalDependencies = (n?.financialRecords || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 border-2 border-rose-500 shadow-2xl text-center space-y-4 font-sans animate-scale-up">

        {/* Icon */}
        <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto border-2 border-rose-200 shadow-2xs">
          {loading ? (
            <Loader2 className="w-7 h-7 text-stone-400 animate-spin" />
          ) : error ? (
            <AlertTriangle className="w-7 h-7 text-rose-600" />
          ) : (
            <Trash2 className="w-7 h-7 text-rose-600" />
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-stone-900 leading-none">
            {loading ? "Analisando dependências..." : error ? "Erro na prévia" : "Excluir Comanda"}
          </h3>
          {preview?.comanda && (
            <p className="text-xs text-stone-500 leading-relaxed px-2 mt-2">
              <strong>{preview.comanda.ticketNumber}</strong> — {preview.comanda.clientName} ({preview.comanda.status})
              {preview.comanda.totalValue > 0 && ` — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preview.comanda.totalValue)}`}
            </p>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
            <p className="text-xs text-stone-500">Buscando registros vinculados...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-rose-50 rounded-lg p-3 border border-rose-200 text-xs text-rose-700 leading-relaxed">
            {error}
          </div>
        )}

        {/* Cascade warning */}
        {!loading && !error && (
          <div className="space-y-3">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-left space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-800 leading-relaxed">
                  Ao apagar esta comanda, os registros vinculados abaixo também serão excluídos permanentemente para manter seu financeiro correto:
                </p>
              </div>
              <ul className="space-y-1.5 pl-6">
                <li className="text-xs text-rose-700 list-disc">
                  <strong>{n?.financialRecords || 0}</strong> lançamento{(n?.financialRecords || 0) !== 1 ? 's' : ''} de contas a receber/pagar e taxas de cartão
                </li>
                <li className="text-xs text-rose-700 list-disc">
                  Comissões de profissionais atreladas aos serviços (embutidas na comanda)
                </li>
                <li className="text-xs text-rose-700 list-disc">
                  Repasses e deduções de taxas de cartão calculadas
                </li>
              </ul>
            </div>

            <p className="text-xs font-bold text-stone-800">
              Deseja mesmo prosseguir com a exclusão em cascata?
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={confirming}
            className="flex-1 py-2.5 border border-stone-200 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5 inline mr-1" />
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !!error || confirming}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {confirming ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Excluindo...</span></>
            ) : (
              <><Trash2 className="w-3.5 h-3.5" /><span>Confirmar Exclusão</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}