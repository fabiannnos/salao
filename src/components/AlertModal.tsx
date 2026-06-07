import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

interface AlertModalProps {
  open: boolean;
  title?: string;
  message: string;
  variant?: 'info' | 'success' | 'error';
  confirmLabel?: string;
  onClose: () => void;
}

const variantStyles = {
  info: {
    icon: Info,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-gold-200',
    buttonBg: 'bg-zinc-950 hover:bg-black',
  },
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
    buttonBg: 'bg-zinc-950 hover:bg-black',
  },
  error: {
    icon: AlertTriangle,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    borderColor: 'border-rose-200',
    buttonBg: 'bg-rose-600 hover:bg-rose-700',
  },
};

export default function AlertModal({ open, title, message, variant = 'info', confirmLabel = 'OK', onClose }: AlertModalProps) {
  if (!open) return null;

  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl max-w-sm w-full border ${styles.borderColor} overflow-hidden animate-scale-up p-6 space-y-4 font-sans text-[#1c1917]`}>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full ${styles.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${styles.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-serif font-black text-xs uppercase tracking-wider text-stone-900">
              {title || (variant === 'error' ? 'Aviso' : variant === 'success' ? 'Sucesso' : 'Informação')}
            </h4>
            <p className="text-xs leading-relaxed text-stone-600 mt-2 whitespace-pre-wrap">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-0.5 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className={`${styles.buttonBg} text-white py-2 px-5 rounded-lg text-[11px] font-bold cursor-pointer transition shadow-xs`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
