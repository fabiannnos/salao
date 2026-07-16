import React from 'react';
import { Calculator, X, Clock, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDateBR } from '../../utils';

interface Props {
  detailItem: any;
  onClose: () => void;
}

function paymentDateLabel(item: any): string {
  if (item.paymentDate) return formatDateBR(item.paymentDate);
  if (item.competenceDate) return formatDateBR(item.competenceDate);
  return formatDateBR(item.refDate);
}

export default function CommissionDetailsModal({ detailItem, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[100] animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md border border-stone-200 overflow-y-auto max-h-[95vh] animate-scale-up p-5 sm:p-6 space-y-4 sm:space-y-5 font-sans text-[#1c1917]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-stone-400" />
            <h3 className="font-serif font-black text-xs uppercase tracking-wider text-stone-900">Extrato da Comissão</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
            aria-label="Fechar extrato"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 sm:space-y-4 text-xs">

          {/* BLOCK: Serviço */}
          <div className="space-y-2.5">
            <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold block">Serviço</span>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Serviço realizado</span>
              <span className="font-bold text-stone-900 text-right max-w-[60%]">{detailItem.serviceName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Comanda</span>
              <span className="font-bold font-mono text-stone-900">{detailItem.ticketNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Valor do serviço</span>
              <span className="font-bold text-stone-900">{formatCurrency(detailItem.totalPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Comissão cadastrada</span>
              <span className="font-bold text-stone-900">{detailItem.commissionRate}%</span>
            </div>
          </div>

          {/* BLOCK: Cálculo da comissão bruta */}
          <div className="border-t border-stone-100 pt-3 space-y-2.5">
            <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold block">Cálculo da comissão bruta</span>
            <div className="bg-stone-50 rounded-lg p-3 flex items-center justify-center gap-2 sm:gap-3 text-sm flex-wrap">
              <span className="font-bold text-stone-900">{formatCurrency(detailItem.totalPrice)}</span>
              <span className="text-stone-400 font-bold">×</span>
              <span className="font-bold text-stone-900">{detailItem.commissionRate}%</span>
              <span className="text-stone-400 font-bold">=</span>
              {detailItem.originalCommissionValue !== undefined ? (
                <span className="font-black text-stone-900 text-base">{formatCurrency(detailItem.originalCommissionValue)}</span>
              ) : (
                <span className="font-black text-stone-400 text-base">—</span>
              )}
            </div>
          </div>

          {/* BLOCK: Pagamento */}
          <div className="border-t border-stone-100 pt-3 space-y-2.5">
            <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold block">Pagamento</span>

            <div className="flex items-center justify-between">
              <span className="text-stone-500">Data de pagamento</span>
              <span className="font-bold text-stone-900">{paymentDateLabel(detailItem)}</span>
            </div>

            {(detailItem.paymentMethod === 'Cartão Credito' || detailItem.paymentMethod === 'Cartão Debito') ? (
              <>
                {detailItem.cardAcquirerName && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Adquirente</span>
                    <span className="font-bold text-stone-900">{detailItem.cardAcquirerName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Operação</span>
                  <span className="font-bold text-stone-900">
                    {detailItem.paymentMethod === 'Cartão Débito' ? 'Cartão de Débito' : 'Cartão de Crédito'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Bandeira</span>
                  <span className="font-bold text-stone-900">{detailItem.cardBrand || '—'}</span>
                </div>
                {detailItem.cardInstallments && detailItem.cardInstallments > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Parcelamento</span>
                    <span className="font-bold text-stone-900">{detailItem.cardInstallments}x</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Tipo</span>
                <span className="font-bold text-stone-900">
                  {detailItem.paymentMethod === 'Pix' ? 'PIX' : detailItem.paymentMethod || '—'}
                </span>
              </div>
            )}
          </div>

          {/* BLOCK: Taxa da operação */}
          {(detailItem.paymentMethod === 'Cartão Credito' || detailItem.paymentMethod === 'Cartão Debito') && detailItem.cardFeeRateUsed ? (
            <div className="border-t border-stone-100 pt-3 space-y-2.5">
              <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold block">Taxa da operação</span>

              <div className="flex items-center justify-between">
                <span className="text-stone-500">Taxa aplicada</span>
                <span className="font-bold text-stone-900">{detailItem.cardFeeRateUsed}%</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-500">Valor total da taxa</span>
                <div className="text-right">
                  <span className="text-stone-400 text-[10px] mr-1">{formatCurrency(detailItem.totalValue)} × {detailItem.cardFeeRateUsed}%</span>
                  <span className="font-bold text-stone-900">= {formatCurrency(detailItem.cardFeeAmount)}</span>
                </div>
              </div>

              <div className="bg-stone-50 rounded-lg p-3 space-y-2">
                <div className="text-[10px] text-stone-400 uppercase tracking-wider font-bold mb-1.5">Responsabilidade pela taxa</div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Profissional</span>
                  <span className="font-bold text-stone-900">
                    {detailItem.profDeductPercentage ?? 0}% ({formatCurrency(detailItem.profCardFeeDeduction ?? 0)})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Salão</span>
                  <span className="font-bold text-stone-900">
                    {detailItem.salonDeductPercentage ?? (100 - (detailItem.profDeductPercentage ?? 0))}% ({formatCurrency(detailItem.salonCardFeeDeduction ?? 0)})
                  </span>
                </div>
                <div className="text-[9px] text-stone-400 italic mt-1">Configuração definida pelo salão.</div>
              </div>
            </div>
          ) : (
            <div className="border-t border-stone-100 pt-3 space-y-2.5">
              <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold block">Taxa da operação</span>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Desconto</span>
                <span className="font-bold text-emerald-600">Não houve desconto de taxa nesta operação.</span>
              </div>
            </div>
          )}

          {/* BLOCK: Resultado final - destaque */}
          <div className="border-t border-stone-100 pt-3">
            <div className="bg-gradient-to-br from-gold-50 to-amber-50 rounded-xl p-4 sm:p-5 border border-gold-200/60 space-y-3">
              <div className="text-center space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Comissão bruta</span>
                <div className="text-xl sm:text-2xl font-black text-stone-900">
                  {detailItem.originalCommissionValue !== undefined ? formatCurrency(detailItem.originalCommissionValue) : '—'}
                </div>
              </div>

              {/* Visual status card */}
              {detailItem.commissionPaid ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Comissão Paga</p>
                    <p className="text-[10px] text-emerald-600">Pagamento realizado.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-amber-700 uppercase tracking-wider">Comissão Pendente</p>
                    <p className="text-[10px] text-amber-600">Ainda não repassada pelo salão.</p>
                  </div>
                </div>
              )}

              {(detailItem.paymentMethod === 'Cartão Credito' || detailItem.paymentMethod === 'Cartão Débito') && detailItem.cardFeeRateUsed && (detailItem.profCardFeeDeduction ?? 0) > 0 && (
                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-rose-500 font-bold">(–) Desconto da taxa</span>
                  <div className="text-base font-bold text-rose-500">
                    {formatCurrency(detailItem.profCardFeeDeduction)}
                  </div>
                </div>
              )}

              <div className="border-t border-gold-300/40"></div>

              <div className="text-center space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-gold-700 font-bold">Você receberá</span>
                <div className="text-2xl sm:text-3xl font-black text-gold-700">
                  {formatCurrency(detailItem.commissionValue)}
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="bg-zinc-950 hover:bg-black text-white py-2 px-5 rounded-lg text-[11px] font-bold cursor-pointer transition shadow-xs"
            aria-label="Fechar extrato"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
