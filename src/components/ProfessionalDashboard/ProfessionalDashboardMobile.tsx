import React from 'react';
import { Comanda, Professional, Salon } from '../../types';
import { formatCurrency, formatDateBR } from '../../utils';
import { Award, Scissors, Calculator, Search, TrendingUp } from 'lucide-react';
import GestaoModelloLogo from '../GestaoModelloLogo';
import { useCommissionData } from './useCommissionData';
import CommissionDetailsModal from './CommissionDetailsModal';

interface Props {
  professional: Professional;
  comandas: Comanda[];
  salon?: Salon | null;
  onLogout: () => void;
}

export default function ProfessionalDashboardMobile({
  professional,
  comandas,
  salon,
  onLogout
}: Props) {
  const {
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
    searchQuery, setSearchQuery,
    detailItem, setDetailItem,
    months,
    sortedServices,
    totalServiceCount,
    totalFaturamento,
    totalComissoes,
    mixArray,
  } = useCommissionData(professional, comandas, salon);

  return (
    <div className="min-h-screen bg-[#FCF9F2] pb-8 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-xs border-b border-gray-150 px-4 py-3">
        <div className="flex items-center gap-3">
          {salon && salon.logoUrl ? (
            <img
              src={salon.logoUrl}
              className="w-8 h-8 rounded-lg object-contain bg-white border border-stone-200 shrink-0"
              referrerPolicy="no-referrer"
              alt={salon.name}
            />
          ) : (
            <GestaoModelloLogo className="w-8 h-8 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm text-gray-950 leading-tight truncate">
              {salon ? salon.name : "Gestão Modello"}
            </h2>
            <p className="text-[10px] font-bold text-stone-400 truncate">{professional.name}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[10px] rounded-full transition-all cursor-pointer shrink-0"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Period filter row */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <div className="flex-1">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="w-full bg-white text-xs font-bold border border-gray-200 rounded-lg py-2 px-3 focus:outline-none appearance-none"
          >
            {months.map((m, idx) => (
              <option key={idx} value={idx}>{m}</option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full bg-white text-xs font-bold border border-gray-200 rounded-lg py-2 px-3 focus:outline-none appearance-none"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {/* KPI cards row */}
      <div className="px-4 py-2 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        <div className="snap-center shrink-0 w-[130px] bg-white rounded-xl shadow-sm border border-gray-200/60 p-4 flex flex-col items-center">
          <Scissors className="w-4 h-4 text-gold-500 mb-1.5" />
          <span className="text-2xl font-bold text-gray-950">{totalServiceCount}</span>
          <span className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider mt-0.5">Serviços</span>
        </div>
        <div className="snap-center shrink-0 w-[130px] bg-white rounded-xl shadow-sm border border-gray-200/60 p-4 flex flex-col items-center">
          <TrendingUp className="w-4 h-4 text-stone-500 mb-1.5" />
          <span className="text-lg font-bold text-stone-850 truncate w-full text-center">{formatCurrency(totalFaturamento)}</span>
          <span className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider mt-0.5">Faturamento</span>
        </div>
        <div className="snap-center shrink-0 w-[130px] bg-white rounded-xl shadow-sm border border-gray-200/60 p-4 flex flex-col items-center">
          <Award className="w-4 h-4 text-gold-500 mb-1.5" />
          <span className="text-lg font-bold text-gold-500 truncate w-full text-center">{formatCurrency(totalComissoes)}</span>
          <span className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider mt-0.5">Comissão</span>
        </div>
      </div>

      {/* Mix pill row */}
      {mixArray.length > 0 && (
        <div className="px-4 py-1 flex gap-2 flex-wrap">
          {mixArray.slice(0, 3).map((item, idx) => {
            const colors = ['bg-gold-500', 'bg-black', 'bg-gray-450'];
            return (
              <span key={item.name} className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-600 bg-white border border-stone-200 rounded-full px-2.5 py-1">
                <span className={`w-1.5 h-1.5 rounded-full ${colors[idx] || 'bg-stone-300'}`} />
                {item.name} {item.percentage}%
              </span>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-450 w-3.5 h-3.5" />
          <input
            type="text"
            className="w-full pl-8 pr-3 py-2 bg-white text-xs border border-gray-200 rounded-lg focus:border-gold-500 focus:outline-none"
            placeholder="Buscar cliente ou comanda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Service cards */}
      <div className="px-4 pt-1 pb-4 space-y-3">
        {sortedServices.length === 0 ? (
          <div className="text-center py-12 text-stone-400 italic text-xs">
            Nenhum serviço em {months[selectedMonth]} de {selectedYear}.
          </div>
        ) : (
          sortedServices.map((item, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200/70 p-4 space-y-2.5">
              {/* Top row: client + status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-full bg-gold-200 text-gold-900 text-[9px] font-black uppercase flex items-center justify-center shrink-0">
                    {item.clientName.substring(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{item.clientName}</p>
                    <p className="text-[10px] text-stone-400 font-medium truncate">{item.serviceName}</p>
                  </div>
                </div>
                {item.commissionPaid ? (
                  <span className="bg-[#e6f4ea] text-[#137333] border border-[#ceead6] text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                    Pago
                  </span>
                ) : (
                  <span className="bg-[#fef7e0] text-[#b06000] border border-[#fde293] text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                    Pendente
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-stone-100" />

              {/* Info rows */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400 font-medium">Comanda</span>
                <span className="font-bold font-mono text-stone-700 text-[10px]">{item.ticketNumber}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400 font-medium">Data</span>
                <span className="font-bold text-stone-700 text-[10px]">{formatDateBR(item.refDate)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400 font-medium">Valor</span>
                <span className="font-bold text-stone-800">{formatCurrency(item.totalPrice)}</span>
              </div>

              {/* Commission + CTA row */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[9px] text-stone-400 uppercase tracking-wider font-bold">Comissão</span>
                  <p className="text-base font-black text-gold-500">{formatCurrency(item.commissionValue)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailItem(item)}
                  className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-gold-200 text-stone-600 hover:text-gold-900 text-[10px] font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Calculator className="w-3 h-3" />
                  Ver extrato
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-gray-200/50 bg-white/40">
        <p className="text-[10px] text-stone-400">© 2026 Gestão Modello</p>
      </footer>

      {/* Commission Detail Modal */}
      {detailItem && (
        <CommissionDetailsModal
          detailItem={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}
