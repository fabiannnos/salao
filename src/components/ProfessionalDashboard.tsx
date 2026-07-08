import React, { useState } from 'react';
import { Comanda, Professional, Salon } from '../types';
import { formatCurrency, getMonthName, getComissaoReferenceDate, formatDateBR } from '../utils';
import { Award, Scissors, Percent, FileText, Calendar, Filter, Users, Download, Search } from 'lucide-react';
import GestaoModelloLogo from './GestaoModelloLogo';

interface ProfessionalDashboardProps {
  professional: Professional;
  comandas: Comanda[];
  salon?: Salon | null;
  onLogout: () => void;
}

export default function ProfessionalDashboard({
  professional,
  comandas,
  salon,
  onLogout
}: ProfessionalDashboardProps) {
  // Filters values
  const [selectedMonth, setSelectedMonth] = useState((new Date()).getMonth());
  const [selectedYear, setSelectedYear] = useState(2026);
  const [searchQuery, setSearchQuery] = useState('');

  const commissionAccrualRule = salon?.commissionAccrualRule ?? 'caixa';

  const professionalServices = comandas
    .filter(c => c.status === 'Concluido')
    .flatMap(c =>
      c.services
        .filter(s => s.professionalId === professional.id)
        .map(s => {
          const refDate = getComissaoReferenceDate(c, commissionAccrualRule);
          if (!refDate) return null;
          const pDate = new Date(refDate);
          return {
            comandaId: c.id,
            ticketNumber: c.ticketNumber,
            clientName: c.clientName,
            serviceName: s.name,
            totalPrice: s.price,
            commissionRate: s.commissionRate,
            commissionValue: s.commissionValue,
            paymentDate: refDate,
            paymentDateObj: pDate,
            commissionPaid: s.commissionPaid || false
          };
        })
    )
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter(item => {
      return item.paymentDateObj.getMonth() === selectedMonth &&
             item.paymentDateObj.getFullYear() === selectedYear;
    })
    .filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return item.clientName.toLowerCase().includes(q) ||
             item.ticketNumber.toLowerCase().includes(q) ||
             item.serviceName.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const dateCmp = a.paymentDate.localeCompare(b.paymentDate);
      if (dateCmp !== 0) return dateCmp;
      return a.ticketNumber.localeCompare(b.ticketNumber);
    });

  // Calculate metrics
  const totalServiceCount = professionalServices.length;
  const totalFaturamento = professionalServices.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalComissoes = professionalServices.reduce((sum, item) => sum + item.commissionValue, 0);

  // Group services list for mix of service percentages
  const mixMap: { [key: string]: number } = {};
  professionalServices.forEach(item => {
    // simplify categorizing based on keywords
    let cat = 'Outros';
    if (item.serviceName.toLowerCase().includes('corte')) cat = 'Corte';
    else if (item.serviceName.toLowerCase().includes('color')) cat = 'Coloração';
    else if (item.serviceName.toLowerCase().includes('escova') || item.serviceName.toLowerCase().includes('hidra')) cat = 'Hidratação';
    else if (item.serviceName.toLowerCase().includes('unha') || item.serviceName.toLowerCase().includes('manicure')) cat = 'Manicure';
    
    mixMap[cat] = (mixMap[cat] || 0) + 1;
  });

  const mixArray = Object.entries(mixMap).map(([name, val]) => ({
    name,
    count: val,
    percentage: totalServiceCount > 0 ? Math.round((val / totalServiceCount) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="min-h-screen bg-[#FCF9F2] pb-12 font-sans">
      
      {/* Premium Header Menu Bar */}
      <header className="sticky top-0 z-40 bg-white shadow-xs border-b border-gray-150 px-6 sm:px-12 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-4">
            {salon && salon.logoUrl ? (
              <img 
                src={salon.logoUrl} 
                className="w-10 h-10 rounded-lg object-contain bg-white border border-stone-200 shrink-0" 
                referrerPolicy="no-referrer" 
                alt={salon.name} 
              />
            ) : (
              <GestaoModelloLogo className="w-10 h-10 shrink-0" />
            )}
            <div>
              <h2 className="font-serif font-bold text-lg text-gray-950 leading-none">
                {salon ? salon.name : "Gestão Modello"}
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#701a75] mt-1 inline-block">Área do Profissional</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-gray-900 text-sm font-sans">{professional.name}</p>
              <p className="text-[10px] text-stone-500 uppercase font-extrabold tracking-wider">{professional.category} • Tel: {professional.phone}</p>
            </div>
            <div className="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>
            <button
              onClick={onLogout}
              className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-full transition-all cursor-pointer"
            >
              Sair da conta
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel Canvas Area */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 py-10 space-y-8">
        
        {/* Filter list header title */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 pb-4 border-b border-gold-200/20">
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-950 tracking-tight">Painel de Comissões</h1>
            <p className="text-xs text-stone-500 mt-1">Acompanhe seu desempenho de atendimentos e comissões provisionadas.</p>
          </div>

          {/* Selector filters for Month & Year */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex flex-col w-1/2 md:w-32">
              <span className="text-[10px] uppercase text-stone-400 font-bold ml-1 mb-1">Mês</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-white text-xs font-bold border border-gray-200 rounded-lg py-2 px-3 focus:outline-none"
              >
                {months.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col w-1/2 md:w-24">
              <span className="text-[10px] uppercase text-stone-400 font-bold ml-1 mb-1">Ano</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-white text-xs font-bold border border-gray-200 rounded-lg py-2 px-3 focus:outline-none"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* Informative Bento Grid Cards row */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {/* KPI: Services count */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200/60 flex flex-col items-center text-center justify-center relative group">
            <span className="text-[10px] uppercase tracking-widest text-[#775a19] font-bold mb-4 flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5 text-gold-500" />
              <span>Total de Serviços</span>
            </span>
            <span className="text-5xl font-serif font-bold text-gray-950">{totalServiceCount}</span>
            <p className="text-[11px] text-stone-400 mt-3 font-semibold">Atendimentos no período de {months[selectedMonth]}</p>
          </div>

          {/* KPI: Total value produced */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200/60 flex flex-col items-center text-center justify-center relative">
            <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-4">
              Faturamento Gerado
            </span>
            <span className="text-4xl font-serif font-bold text-stone-850">
              {formatCurrency(totalFaturamento)}
            </span>
            <p className="text-[10px] text-gray-400 mt-3 font-semibold">Valor comanda integral pré-comissão</p>
          </div>

          {/* KPI: Earned commission */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200/60 flex flex-col items-center text-center justify-center relative">
            <span className="text-[10px] uppercase tracking-widest text-[#775a19] font-bold mb-4 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-gold-500" />
              <span>Sua Comissão Líquida</span>
            </span>
            <span className="text-4xl font-serif font-bold text-gold-500">
              {formatCurrency(totalComissoes)}
            </span>
            <p className="text-[10px] text-stone-400 mt-3 font-semibold">Taxa de repasse direto: {professional.commissionRate}%</p>
          </div>

          {/* MIX OF SERVICES CHART (RECONSTRUCTED HIGH FIDELITY SVG) */}
          <div className="md:col-span-3 lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200/60 flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-[#775a19] font-bold mb-4 block">Mix de Serviços</span>
            
            {totalServiceCount === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center text-gray-400 italic text-xs py-8">
                Sem dados de mix no período.
              </div>
            ) : (
              <div className="flex-1 flex flex-row lg:flex-col items-center justify-around gap-4">
                {/* SVG Radial representation */}
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" fill="none" r="15.915" stroke="#FCF9F2" strokeWidth="4"></circle>
                    {/* Segment 1: Corte */}
                    <circle 
                      cx="18" 
                      cy="18" 
                      fill="none" 
                      r="15.915" 
                      stroke="#775a19" 
                      strokeWidth="4" 
                      strokeDasharray={`${mixArray[0]?.percentage || 0} ${100 - (mixArray[0]?.percentage || 0)}`} 
                      strokeDashoffset="0"
                    ></circle>
                    {/* Segment 2: Coloração */}
                    {mixArray[1] && (
                      <circle 
                        cx="18" 
                        cy="18" 
                        fill="none" 
                        r="15.915" 
                        stroke="#1c1b1b" 
                        strokeWidth="4" 
                        strokeDasharray={`${mixArray[1].percentage} ${100 - mixArray[1].percentage}`} 
                        strokeDashoffset={`-${mixArray[0]?.percentage || 0}`}
                      ></circle>
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center leading-none text-center">
                    <span className="text-[9px] text-gray-400 uppercase font-sans">Top</span>
                    <span className="text-xs font-bold text-gray-900 font-sans">{mixArray[0]?.name || '---'}</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="space-y-1.5 text-xs">
                  {mixArray.map((item, index) => {
                    const colors = ['bg-gold-500', 'bg-black', 'bg-gray-450', 'bg-amber-300'];
                    return (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${colors[index] || 'bg-stone-300'}`} />
                        <span className="text-[#1c1c18] font-bold font-sans">
                          {item.name} ({item.percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Data Grid table listing completed services finished by this professional */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-[#FCF9F2]/50">
            <div>
              <h3 className="font-serif font-bold text-gray-950 text-base">Relação de Serviços Executados</h3>
              <p className="text-xs text-gray-400 mt-1">Extrato de recebidos do profissional de acordo com as comandas dadas como concluídas.</p>
            </div>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-widest font-mono">
              {totalServiceCount} Atendimentos concluídos
            </span>
          </div>

          <div className="px-8 py-3 border-b border-gray-100 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-450 w-4 h-4" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 bg-[#FCF9F2] text-xs border border-gray-250 rounded-lg focus:border-gold-500 focus:outline-none"
                placeholder="Buscar por cliente, código da comanda ou serviço..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 font-sans">
                  <th className="px-8 py-4 text-[11px] font-bold text-stone-400 uppercase tracking-widest">Data Referência</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-stone-400 uppercase tracking-widest">Código da Comanda</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-stone-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-stone-400 uppercase tracking-widest">Serviço Prestado</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-stone-400 uppercase tracking-widest">Valor do Serviço</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-stone-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-stone-400 uppercase tracking-widest text-right">Sua Comissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-sans">
                {professionalServices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400 italic">
                      Nenhum serviço faturado e concluído para você em {months[selectedMonth]} de {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  professionalServices.map((item, index) => (
                    <tr key={index} className="hover:bg-gold-50/10 transition-colors">
                      <td className="px-8 py-5 text-stone-400 font-mono">
                        {formatDateBR(item.paymentDate)}
                      </td>
                      <td className="px-8 py-5">
                        <span className="bg-stone-100 text-stone-800 font-bold px-2 py-0.5 rounded text-[10px] font-mono">
                          {item.ticketNumber}
                        </span>
                      </td>
                      <td className="px-8 py-5 font-bold text-stone-900">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gold-200 text-gold-900 text-[10px] font-black uppercase flex items-center justify-center">
                            {item.clientName.substring(0, 2)}
                          </div>
                          <span>{item.clientName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-4 bg-[#775a19] rounded-full" />
                          <span className="font-medium text-stone-700">{item.serviceName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-bold font-sans text-stone-750">
                        {formatCurrency(item.totalPrice)}
                      </td>
                      <td className="px-8 py-5 text-center">
                        {item.commissionPaid ? (
                          <span className="bg-[#e6f4ea] text-[#137333] border border-[#ceead6] text-[10px] font-bold px-2.5 py-1 rounded-full inline-block font-sans">
                            Pago
                          </span>
                        ) : (
                          <span className="bg-[#fef7e0] text-[#b06000] border border-[#fde293] text-[10px] font-bold px-2.5 py-1 rounded-full inline-block font-sans">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 font-black text-right text-gold-500 font-sans">
                        {formatCurrency(item.commissionValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </main>

      {/* Floating copyright footer */}
      <footer className="py-8 text-center border-t border-gray-200/50 mt-12 bg-white/40">
        <p className="text-[11px] text-stone-400">© 2026 Gestão Modello • Todos os dados síncronos e processados • Desenvolvido para a Excelência em Gestão</p>
      </footer>

    </div>
  );
}
