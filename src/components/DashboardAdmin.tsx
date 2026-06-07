import React, { useState } from 'react';
import { Comanda, FinancialRecord, Professional, Appointment } from '../types';
import { formatCurrency } from '../utils';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  CalendarDays, 
  Scissors, 
  Users, 
  Receipt,
  PiggyBank
} from 'lucide-react';

interface DashboardAdminProps {
  salonId: string;
  comandas: Comanda[];
  financials: FinancialRecord[];
  professionals: Professional[];
  appointments: Appointment[];
  onNavigateToTab: (tab: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DashboardAdmin({
  salonId,
  comandas,
  financials,
  professionals,
  appointments,
  onNavigateToTab
}: DashboardAdminProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Month and Year filter logic
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Filter lists based on selected month & year
  const getRecordDateDetails = (dateStr: string) => {
    // Expecting YYYY-MM-DD
    const parts = dateStr.split('-');
    return {
      year: parseInt(parts[0]),
      month: parseInt(parts[1])
    };
  };

  const getComandaDateDetails = (dateStr: string) => {
    // Expecting YYYY-MM-DDTHH:MM or YYYY-MM-DD
    const dateOnly = dateStr.split('T')[0];
    const parts = dateOnly.split('-');
    return {
      year: parseInt(parts[0]),
      month: parseInt(parts[1])
    };
  };

  // Monthly filtered records
  const monthlyFinancials = financials.filter(f => {
    try {
      const { year, month } = getRecordDateDetails(f.date);
      return year === selectedYear && month === selectedMonth;
    } catch {
      return false;
    }
  });

  const monthlyComandas = comandas.filter(c => {
    try {
      const { year, month } = getComandaDateDetails(c.dateCreated);
      return year === selectedYear && month === selectedMonth;
    } catch {
      return false;
    }
  });

  const monthlyAppointments = appointments.filter(a => {
    try {
      const { year, month } = getRecordDateDetails(a.date);
      return year === selectedYear && month === selectedMonth;
    } catch {
      return false;
    }
  });

  // Calculate accounts payable (Contas a Pagar em Aberto)
  // For safety, look at either general status pending or overdue
  const contasAPagarAberto = monthlyFinancials.filter(f => f.type === 'despesa' && f.status === 'pendente' && !(f.category === 'Comissão' || f.category === 'Pessoal / Comissões' || f.category?.toLowerCase()?.includes('comis')));
  const contasAPagarCount = contasAPagarAberto.length;
  const contasAPagarValue = contasAPagarAberto.reduce((sum, f) => sum + f.amount, 0);

  // Calculate accounts receivable (Contas a Receber em Aberto / Duplicatas)
  const contasAReceberAberto = monthlyFinancials.filter(f => f.type === 'receita' && f.status === 'pendente');
  const contasAReceberCount = contasAReceberAberto.length;
  const contasAReceberValue = contasAReceberAberto.reduce((sum, f) => sum + f.amount, 0);

  // Faturamento Operacional Bruto (somente comandas faturadas, sem duplicidade financeira)
  const faturamentoAvista = monthlyComandas
    .filter(c => c.status === 'Concluido' && !c.isFiado)
    .reduce((sum, c) => sum + c.totalValue, 0);

  const faturamentoDuplicata = monthlyComandas
    .filter(c => c.status === 'Concluido' && c.isFiado)
    .reduce((sum, c) => sum + c.totalValue, 0);

  const faturamentoTotal = faturamentoAvista + faturamentoDuplicata;

  // Realized Liquid Profit calculation
  const despesasPagas = monthlyFinancials
    .filter(f => f.type === 'despesa' && f.status === 'pago')
    .reduce((sum, f) => sum + f.amount, 0);

  const lucroLiquidoRealizado = faturamentoAvista - despesasPagas;

  // Professional Commission list
  const profCommissions = professionals.map(p => {
    // Find all concluded services this professional completed
    let servicesCount = 0;
    let totalGenerated = 0;
    let earnedCommission = 0;

    monthlyComandas.forEach(c => {
      if (c.status === 'Concluido') {
        c.services.forEach(s => {
          if (s.professionalId === p.id) {
            servicesCount += 1;
            totalGenerated += s.price;
            earnedCommission += s.commissionValue;
          }
        });
      }
    });

    return {
      professional: p,
      servicesCount,
      totalGenerated,
      earnedCommission
    };
  }).sort((a, b) => b.totalGenerated - a.totalGenerated);

  // Services distribution details (Pie Chart)
  const serviceStatsMap: { [key: string]: number } = {};
  monthlyComandas.forEach(c => {
    if (c.status === 'Concluido') {
      c.services.forEach(s => {
        serviceStatsMap[s.name] = (serviceStatsMap[s.name] || 0) + 1;
      });
    }
  });

  const pieChartData = Object.keys(serviceStatsMap).map(name => ({
    name,
    value: serviceStatsMap[name]
  })).sort((a, b) => b.value - a.value).slice(0, 5); // top 5 services

  // Payment methods distribution (Pie Chart)
  const paymentStatsMap: { [key: string]: number } = {};
  monthlyComandas.forEach(c => {
    if (c.status === 'Concluido') {
      const method = c.isFiado ? 'Caderno/Duplicata' : (c.paymentMethod || 'Pix');
      paymentStatsMap[method] = (paymentStatsMap[method] || 0) + c.totalValue;
    }
  });

  const paymentChartData = Object.keys(paymentStatsMap).map(name => ({
    name,
    value: paymentStatsMap[name]
  })).sort((a, b) => b.value - a.value);

  // Daily comparison values for LineChart
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dailyDataMap: { [day: number]: { dia: number; Receitado: number; Despendido: number } } = {};
  for (let i = 1; i <= daysInMonth; i++) {
    dailyDataMap[i] = { dia: i, Receitado: 0, Despendido: 0 };
  }

  // Populate daily revenues from comandas
  monthlyComandas.forEach(c => {
    if (c.status === 'Concluido') {
      try {
        const day = parseInt(c.dateCreated.split('T')[0].split('-')[2]);
        if (dailyDataMap[day]) {
          dailyDataMap[day].Receitado += c.totalValue;
        }
      } catch {}
    }
  });

  // Populate financials
  monthlyFinancials.forEach(f => {
    try {
      const day = parseInt(f.date.split('-')[2]);
      if (dailyDataMap[day]) {
        if (f.type === 'receita') {
          dailyDataMap[day].Receitado += f.amount;
        } else {
          dailyDataMap[day].Despendido += f.amount;
        }
      }
    } catch {}
  });

  // Select exactly 1 week (last 7 days of active interval up to today or end of month)
  const isCurrentMonth = selectedMonth === (new Date().getMonth() + 1) && selectedYear === new Date().getFullYear();
  const endDay = isCurrentMonth ? Math.min(daysInMonth, new Date().getDate()) : daysInMonth;
  const startDay = Math.max(1, endDay - 6);

  const chartDataGrouped: { diaLabel: string; Receitado: number; Despendido: number }[] = [];
  for (let d = startDay; d <= endDay; d++) {
    chartDataGrouped.push({
      diaLabel: `${String(d).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}`,
      Receitado: dailyDataMap[d] ? dailyDataMap[d].Receitado : 0,
      Despendido: dailyDataMap[d] ? dailyDataMap[d].Despendido : 0
    });
  }

  return (
    <div className="space-y-6">
      
      {/* Top filter and header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gold-200/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-gray-950 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-gold-500" />
            <span>Dashboard Administrativo</span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">Visão geral do faturamento do salão, contas em aberto, serviços e repasses de comissão.</p>
        </div>

        {/* Month Selector dropdown filters */}
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-[#FCF9F2] text-xs font-bold border border-stone-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none flex-1 md:flex-initial"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-[#FCF9F2] text-xs font-bold border border-stone-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Overdue / Pending Accounts Payable */}
        <div 
          onClick={() => onNavigateToTab('financeiro')}
          className="bg-white hover:bg-rose-50/10 cursor-pointer p-6 rounded-xl border border-rose-100 shadow-sm transition flex items-center justify-between"
          title="Contas a pagar que se encontram em aberto"
        >
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Contas a Pagar em Aberto</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-sans font-black text-rose-700">{formatCurrency(contasAPagarValue)}</span>
            </div>
            <p className="text-[11px] text-rose-500 font-medium">{contasAPagarCount} lançamentos pendentes</p>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Receivables / Duplicatas */}
        <div 
          onClick={() => onNavigateToTab('financeiro')}
          className="bg-white hover:bg-blue-50/10 cursor-pointer p-6 rounded-xl border border-blue-100 shadow-sm transition flex items-center justify-between"
          title="Duplicatas e contas a receber pendentes"
        >
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Duplicatas a Receber</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-sans font-black text-blue-700">{formatCurrency(contasAReceberValue)}</span>
            </div>
            <p className="text-[11px] text-blue-500 font-medium">{contasAReceberCount} faturamentos pendentes</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-500">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Paid / Received Cashflow (Faturamento Operacional Bruto) */}
        <div className="bg-white p-6 rounded-xl border border-gold-200/30 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600 block">Faturamento Bruto</span>
            <span className="text-2xl font-sans font-black text-stone-900">{formatCurrency(faturamentoTotal)}</span>
            <div className="flex flex-col gap-0.5 text-[10px] text-stone-400">
              <span>À Vista: {formatCurrency(faturamentoAvista)}</span>
              <span>Duplicatas: {formatCurrency(faturamentoDuplicata)}</span>
            </div>
          </div>
          <div className="p-3 bg-[#FCF9F2] border border-gold-100 rounded-lg text-gold-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Real Cash Net Profit */}
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Resultado Caixa (Mês)</span>
            <span className="text-2xl font-sans font-black text-emerald-700">{formatCurrency(lucroLiquidoRealizado)}</span>
            <p className="text-[11px] text-stone-400">Recebido à Vista - Despesas Pagas</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Graphs visualization section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Line graph comparison: Revenue vs Expense */}
        <div className="md:col-span-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-150">
            <h3 className="text-xs font-bold tracking-widest text-[#937b42] uppercase font-sans">Evolução de Fluxo de Caixa Diário (Última Semana)</h3>
            <span className="text-[10px] text-stone-400 font-mono">Visão Semanal de Caixa</span>
          </div>
          <div className="h-72 w-full text-xs font-sans">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDataGrouped}>
                <XAxis dataKey="diaLabel" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="Receitado" name="Faturamento (R$)" stroke="#B5A175" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Despendido" name="Despesa (R$)" stroke="#e06a55" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie graph: top categories of services */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-150">
              <h3 className="text-xs font-bold tracking-widest text-[#937b42] uppercase font-sans">Principais Serviços</h3>
              <span className="text-[10px] text-stone-400 font-mono">Volumetria</span>
            </div>
            {pieChartData.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs italic">
                Nenhum serviço faturado neste período.
              </div>
            ) : (
              <div className="h-56 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-[11px] font-sans">
            {pieChartData.map((item, index) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2 font-sans truncate max-w-[200px]">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-stone-700 font-medium truncate">{item.name}</span>
                </div>
                <span className="font-bold font-mono text-stone-900 shrink-0">{item.value} atendimentos</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie graph: distribution by payment methods */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-150">
              <h3 className="text-xs font-bold tracking-widest text-[#937b42] uppercase font-sans">Formas de Pagamento</h3>
              <span className="text-[10px] text-stone-400 font-mono">Receitas Faturadas</span>
            </div>
            {paymentChartData.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs italic">
                Nenhum faturamento registrado neste período.
              </div>
            ) : (
              <div className="h-56 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell key={`cell-pay-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-[11px] font-sans">
            {paymentChartData.map((item, index) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2 font-sans truncate max-w-[200px]">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }} />
                  <span className="text-stone-700 font-medium truncate">{item.name}</span>
                </div>
                <span className="font-bold font-mono text-stone-900 shrink-0">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Two-column layout for Professionals performance & Appointments overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Table: Professional Commission Split & Billing performance */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-150">
            <h3 className="text-xs font-bold tracking-widest text-gold-500 uppercase font-sans">Performance & Comissões de Profissionais</h3>
            <span className="bg-stone-100 text-[10px] font-bold px-2 py-0.5 rounded-full text-stone-600">Este Mês</span>
          </div>

          <div className="overflow-x-auto text-xs font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-400 uppercase tracking-wider text-[10px] font-bold border-b border-stone-200">
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">Atendimentos</th>
                  <th className="p-3 text-right">Faturado Brutal</th>
                  <th className="p-3 text-right">Taxa Repasse</th>
                  <th className="p-3 text-right">Comissão Devida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {profCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 py-6 text-center text-stone-400 italic">Nenhum repasse mapeado.</td>
                  </tr>
                ) : (
                  profCommissions.map(pData => (
                    <tr key={pData.professional.id} className="hover:bg-[#FCF9F2]/30">
                      <td className="p-3 font-bold text-stone-900">{pData.professional.name}</td>
                      <td className="p-3 font-mono">{pData.servicesCount} serviços</td>
                      <td className="p-3 text-right font-bold text-stone-800">{formatCurrency(pData.totalGenerated)}</td>
                      <td className="p-3 text-right font-semibold text-gold-500">{pData.professional.commissionRate}%</td>
                      <td className="p-3 text-right font-black text-[#1c1c18]">{formatCurrency(pData.earnedCommission)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Widget: Appointments schedule overview and current day indicators */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-150">
            <h3 className="text-xs font-bold tracking-widest text-gold-500 uppercase font-sans font-sans">Agendas & Horários</h3>
            <span className="text-[10px] text-stone-400 font-mono">Saturação</span>
          </div>

          <div className="space-y-4 font-sans text-xs">
            <div className="bg-[#FCF9F2] border border-gold-200/40 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-gold-600">Reservas Agendadas</p>
                <p className="text-2xl font-serif font-black text-stone-900 mt-1">{monthlyAppointments.length}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Agendamentos no mês selecionado</p>
              </div>
              <CalendarDays className="w-8 h-8 text-gold-300" />
            </div>

            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-stone-500">Valor Estimado das Agendas</p>
                <p className="text-xl font-bold text-stone-800 mt-1">
                  {formatCurrency(monthlyAppointments.reduce((sum, a) => sum + a.price, 0))}
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-stone-300" />
            </div>

            <div className="space-y-1.5 pt-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Atalhos rápidos de navegação</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-stone-800">
                <button 
                  onClick={() => onNavigateToTab('agendamentos')}
                  className="p-2 border border-stone-200 rounded-lg hover:border-gold-500 hover:bg-[#FCF9F2]/40 text-left transition"
                >
                  🗓️ Agenda Geral
                </button>
                <button 
                  onClick={() => onNavigateToTab('comandas')}
                  className="p-2 border border-stone-200 rounded-lg hover:border-gold-500 hover:bg-[#FCF9F2]/40 text-left transition"
                >
                  📝 Comandas
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
