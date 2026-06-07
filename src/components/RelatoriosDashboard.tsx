import React, { useState } from 'react';
import { FinancialRecord, Comanda, Professional } from '../types';
import { formatCurrency, exportToCSV } from '../utils';
import AlertModal from './AlertModal';
import { 
  TrendingUp, 
  Printer, 
  Download, 
  Calendar, 
  FileText, 
  BarChart3,
  Search,
  CheckCircle,
  Clock,
  ArrowRightLeft,
  FileCheck
} from 'lucide-react';
import { calculateDRE } from '../dataStore';

const generatePrintableHTML = (title: string, contentHtml: string) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #171717;
      background-color: #ffffff;
      margin: 0;
      padding: 40px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #e5b35f;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title {
      font-size: 22px;
      font-weight: bold;
      color: #111;
      margin: 0;
    }
    .subtitle {
      font-size: 13px;
      color: #71717a;
      margin: 5px 0 0 0;
    }
    .meta {
      text-align: right;
      font-size: 11px;
      color: #52525b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 12px;
    }
    th {
      background-color: #fcf9f2;
      border-bottom: 1px solid #e5b35f;
      padding: 12px 10px;
      font-weight: bold;
      text-align: left;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      color: #78350f;
    }
    td {
      padding: 12px 10px;
      border-bottom: 1px solid #e4e4e7;
    }
    .text-right {
      text-align: right;
    }
    .font-bold {
      font-weight: bold;
    }
    .font-mono {
      font-family: monospace;
    }
    .total-box {
      background-color: #fcf9f2;
      border: 1px solid #e5b35f;
      border-radius: 6px;
      padding: 15px;
      text-align: right;
      font-size: 13px;
      font-weight: bold;
      margin-top: 20px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: bold;
    }
    .status-pago {
      background-color: #d1fae5;
      color: #065f46;
    }
    .status-pendente {
      background-color: #fef3c7;
      color: #92400e;
    }
    .dre-row-indent-1 {
      padding-left: 20px;
    }
    .dre-row-indent-2 {
      padding-left: 40px;
    }
    .dre-row-divider {
      background-color: #f9f9f9;
      font-weight: bold;
    }
    .dre-resultado {
      background-color: #1c1917;
      color: #eed093;
      font-weight: bold;
      font-size: 14px;
    }
    .dre-resultado td {
      border-bottom: none;
      padding: 15px 10px;
    }
    .signature-area {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }
    .signature-line {
      width: 250px;
      border-top: 1px solid #ccc;
      text-align: center;
      padding-top: 8px;
      font-size: 11px;
      color: #71717a;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
    .print-btn-bar {
      margin-bottom: 25px;
      background-color: #f4f4f5;
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #e4e4e7;
    }
    .btn {
      background-color: #e5b35f;
      color: black;
      border: none;
      padding: 8px 16px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .btn:hover {
      background-color: #000000;
      color: white;
    }
  </style>
</head>
<body>
  <div class="print-btn-bar no-print">
    <span style="font-size: 12px; color: #52525b; font-weight: 500;">Este é um Relatório do Sistema Modello Salon. Pronto para Impressão / PDF:</span>
    <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  </div>
  ${contentHtml}
  <script>
    // PD-22: impressão NÃO é mais disparada automaticamente.
    // O usuário deve clicar no botão "Imprimir / Salvar PDF" acima para abrir a caixa de diálogo do navegador.
  </script>
</body>
</html>`;
};

interface RelatoriosDashboardProps {
  salonId: string;
  financials: FinancialRecord[];
  comandas: Comanda[];
  professionals: Professional[];
}

export default function RelatoriosDashboard({
  salonId,
  financials,
  comandas,
  professionals
}: RelatoriosDashboardProps) {
  // Selected period
  const [selectedMonth, setSelectedMonth] = useState((new Date()).getMonth());
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeReportTab, setActiveReportTab] = useState<'dre' | 'receber' | 'pagar' | 'comissoes'>('dre');

  // Receivables report state filters
  const [receivablesFilter, setReceivablesFilter] = useState<'pendente' | 'pago' | 'todos'>('todos');
  const [reportDateType, setReportDateType] = useState<'vencimento' | 'pagamento'>('vencimento');

  // Commission report filters
  const [reportFilterProf, setReportFilterProf] = useState<string>('');
  const [reportFilterCommStatus, setReportFilterCommStatus] = useState<'pending' | 'paid' | 'todos'>('todos');

  // Payables report state filters
  const [payablesFilter, setPayablesFilter] = useState<'pendente' | 'pago' | 'todos'>('todos');
  const [isPrintPreviewActive, setIsPrintPreviewActive] = useState(false);
  const [alertState, setAlertState] = useState<{message: string; variant?: 'info' | 'success' | 'error'} | null>(null);

  // Months lists
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Date parsing helper
  const dateInPeriod = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear);
  };

  // Extract client name helper (matching FinanceiroDashboard)
  const getRecordClientAndDetail = (item: FinancialRecord) => {
    if (item.relatedComandaId) {
      const com = comandas.find(c => c.id === item.relatedComandaId);
      if (com) {
        return {
          clientName: com.clientName,
          detail: `${com.ticketNumber} - ${com.services.map(s => s.name).join(', ')}`
        };
      }
    }
    const match = item.description.match(/para o cliente (.*)$/);
    if (match && match[1]) {
      return {
        clientName: match[1].trim(),
        detail: item.description.replace(/ para o cliente .*$/, '')
      };
    }
    return {
      clientName: "Lançamento Manual / Outros",
      detail: item.description
    };
  };

  // DRE Live calculation
  const dre = calculateDRE(salonId, selectedMonth, selectedYear);

  // Filtered Receivables for Report (combining open/pending + selected month's paid, depending on filter)
  const getFilteredReceivables = () => {
    const list = financials.filter(f => f.type === 'receita');
    
    return list.filter(f => {
      // 1. Status filter matching
      if (receivablesFilter === 'pendente' && f.status !== 'pendente') return false;
      if (receivablesFilter === 'pago' && f.status !== 'pago') return false;

      // 2. Period filter matching (only applies strict month filter to paid entries, 
      // OR to everything if we explicitly want "todos" but they belong to the period)
      if (f.status === 'pendente') {
        // Pending items are ALWAYS shown because they are outstanding, unless they are outside our scope
        // If they want to restrict by period, we use due date/emission date.
        // We always show all pending receivables so they don't get lost, or if we filter by current month.
        return true; 
      } else {
        // Paid items are shown only if paid in the selected month
        return dateInPeriod(f.paymentDate || f.date);
      }
    });
  };

  // Filtered Payables for Report
  const getFilteredPayables = () => {
    const list = financials.filter(f => f.type === 'despesa');
    
    return list.filter(f => {
      const isCommission = f.category === 'Comissão' || f.category === 'Pessoal / Comissões' || f.category?.toLowerCase()?.includes('comis');
      
      // If it is a commission and it's unpaid (pendente), exclude it completely from Contas a Pagar reports
      if (isCommission && f.status === 'pendente') {
        return false;
      }

      if (payablesFilter === 'pendente' && f.status !== 'pendente') return false;
      if (payablesFilter === 'pago' && f.status !== 'pago') return false;

      if (f.status === 'pendente') {
        return true; // Keep all unpaid open bills visible so they can track them
      } else {
        return dateInPeriod(f.paymentDate || f.date);
      }
    });
  };

  const finalReceivables = getFilteredReceivables();
  const finalPayables = getFilteredPayables();

  // Sums in current view
  const sumReceivables = finalReceivables.reduce((acc, f) => acc + f.amount, 0);
  const sumPayables = finalPayables.reduce((acc, f) => acc + f.amount, 0);

  const handleExportCSV = () => {
    if (activeReportTab === 'dre') {
      const exportDRE = [
        { Rubrica: '1. Receita Operacional Bruta', Valor: dre.receitaBruta },
        { Rubrica: '↳ À Vista', Valor: dre.receitaRecebida },
        { Rubrica: '↳ A Prazo (Caderno/Duplicatas)', Valor: dre.receitaAReceber },
        { Rubrica: '(-) Descontos Concedidos', Valor: dre.descontos },
        { Rubrica: '2. Receita Operacional Líquida', Valor: dre.receitaLiquida },
        { Rubrica: '(-) Custos de Mercadorias / Consumíveis', Valor: dre.custosMercadorias },
        { Rubrica: '(-) Comissões aos Profissionais', Valor: dre.comissoesPagas },
        { Rubrica: '(-) Custos e Despesas Gerais de Instalações', Valor: dre.outrasDespesas },
        { Rubrica: 'Resultado Líquido do Exercício (Lucro Real)', Valor: dre.resultadoOperacional }
      ];
      exportToCSV(exportDRE, `DRE_Salão_${String(selectedMonth + 1).padStart(2, '0')}_${selectedYear}`);
    } else if (activeReportTab === 'receber') {
      const data = finalReceivables.map(r => {
        const { clientName, detail } = getRecordClientAndDetail(r);
        return {
          Cliente: clientName,
          Detalhe: detail,
          Categoria: r.category,
          DataEmissao: r.date,
          Vencimento: r.dueDate || r.date,
          Valor: r.amount,
          Status: r.status === 'pago' ? 'Recebido/Pago' : 'Pendente'
        };
      });
      exportToCSV(data, `Relatório_Contas_Receber_${String(selectedMonth + 1).padStart(2, '0')}_${selectedYear}`);
    } else {
      const data = finalPayables.map(r => ({
        Fornecedor_Descricao: r.description,
        Categoria: r.category,
        DataEmissao: r.date,
        Vencimento: r.dueDate || r.date,
        Valor: r.amount,
        Status: r.status === 'pago' ? 'Pago/Quitado' : 'Pendente'
      }));
      exportToCSV(data, `Relatório_Contas_Pagar_${String(selectedMonth + 1).padStart(2, '0')}_${selectedYear}`);
    }
  };

  const handleDownloadPrintHTML = () => {
    const monthName = months[selectedMonth];
    const reportTitle = activeReportTab === 'dre' 
      ? `DRE - ${monthName} de ${selectedYear}`
      : activeReportTab === 'receber'
        ? `Contas a Receber - ${monthName} de ${selectedYear}`
        : `Contas a Pagar - ${monthName} de ${selectedYear}`;
    
    let activeContentHtml = '';

    if (activeReportTab === 'dre') {
      activeContentHtml = `
        <div class="header">
          <div>
            <h1 class="title">Demonstração do Resultado do Exercício (DRE)</h1>
            <p class="subtitle">Modello Salon — Período: ${monthName} / ${selectedYear}</p>
          </div>
          <div class="meta">
            <p class="font-bold">Relatório de Competência / Caixa</p>
            <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Identificação do Lançamento</th>
              <th class="text-right">Valor Acumulado (R$)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold">1. Receita Operacional Bruta (Faturamento)</td>
              <td class="text-right font-bold">${formatCurrency(dre.receitaBruta)}</td>
            </tr>
            <tr>
              <td class="dre-row-indent-1">↳ (+) Receitas Recebidas À Vista (Caixa)</td>
              <td class="text-right" style="color: #065f46;">${formatCurrency(dre.receitaRecebida)}</td>
            </tr>
            <tr>
              <td class="dre-row-indent-1">↳ (+) Receitas a Receber a Prazo (Duplicatas)</td>
              <td class="text-right" style="color: #b45309;">${formatCurrency(dre.receitaAReceber)}</td>
            </tr>
            <tr>
              <td class="dre-row-indent-1 text-stone-500">(-) Descontos Concedidos</td>
              <td class="text-right font-mono" style="color: #6b7280;">(${formatCurrency(dre.descontos)})</td>
            </tr>
            <tr class="dre-row-divider">
              <td class="font-bold">2. Receita Operacional Líquida</td>
              <td class="text-right font-bold" style="color: #065f46;">${formatCurrency(dre.receitaLiquida)}</td>
            </tr>
            <tr>
              <td class="dre-row-indent-1">(-) Custos de Mercadorias e Consumíveis</td>
              <td class="text-right font-mono" style="color: #b91c1c;">(${formatCurrency(dre.custosMercadorias)})</td>
            </tr>
            <tr>
              <td class="dre-row-indent-1">(-) Comissões aos Profissionais</td>
              <td class="text-right font-mono" style="color: #b91c1c;">(${formatCurrency(dre.comissoesPagas)})</td>
            </tr>
            <tr class="dre-row-divider">
              <td class="font-bold">3. Custos e Despesas Gerais (Instalações, Aluguel, etc)</td>
              <td class="text-right font-bold" style="color: #b91c1c;">(${formatCurrency(dre.outrasDespesas)})</td>
            </tr>
            <tr class="dre-resultado">
              <td>4. Resultado Líquido do Exercício (Lucro Líquido Real)</td>
              <td class="text-right">
                ${formatCurrency(dre.resultadoOperacional)}
                <span style="font-size: 10px; display: block; font-weight: normal; margin-top: 3px; color: #eed093;">
                  ${dre.resultadoOperacional >= 0 ? 'Superávit Financeiro' : 'Déficit Financeiro'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="signature-area">
          <div class="signature-line">Assinatura do Gerente</div>
          <div class="signature-line">Auditoria Interna / Contabilidade</div>
        </div>
      `;
    } else if (activeReportTab === 'receber') {
      const rowsHtml = finalReceivables.map(item => {
        const { clientName, detail } = getRecordClientAndDetail(item);
        const statusClass = item.status === 'pago' ? 'status-badge status-pago' : 'status-badge status-pendente';
        const statusText = item.status === 'pago' ? 'Pago' : 'Pendente';
        return `
          <tr>
            <td class="font-bold">${clientName}</td>
            <td>${detail}</td>
            <td>${item.category}</td>
            <td class="font-mono">${item.date.split('-').reverse().join('/')}</td>
            <td class="font-mono">${(item.dueDate || item.date).split('-').reverse().join('/')}</td>
            <td class="text-right font-bold" style="color: #78350f;">${formatCurrency(item.amount)}</td>
            <td class="text-right">
              <span class="${statusClass}">${statusText}</span>
            </td>
          </tr>
        `;
      }).join('');

      activeContentHtml = `
        <div class="header">
          <div>
            <h1 class="title">Relatório de Contas a Receber (Créditos)</h1>
            <p class="subtitle">Modello Salon — Período: ${monthName} de ${selectedYear}</p>
          </div>
          <div class="meta">
            <p class="font-bold">Total Acumulado: ${formatCurrency(sumReceivables)}</p>
            <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Procedimentos / Detalhe</th>
              <th>Plano de Contas</th>
              <th>Data Lançamento</th>
              <th>Vencimento</th>
              <th class="text-right">Valor</th>
              <th class="text-right">Situação</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="7" style="text-align: center; padding: 30px; font-style: italic; color: #666;">Nenhum lançamento registrado neste período.</td></tr>'}
          </tbody>
        </table>

        <div class="total-box">
          VALOR SOMA DO RELATÓRIO: ${formatCurrency(sumReceivables)}
        </div>

        <div class="signature-area">
          <div class="signature-line">Assinatura do Gerente</div>
          <div class="signature-line">Auditoria Interna / Contabilidade</div>
        </div>
      `;
    } else {
      const rowsHtml = finalPayables.map(item => {
        const statusClass = item.status === 'pago' ? 'status-badge status-pago' : 'status-badge status-pendente';
        const statusText = item.status === 'pago' ? 'Quitado' : 'Aberto';
        return `
          <tr>
            <td class="font-bold">${item.description}</td>
            <td>${item.category}</td>
            <td class="font-mono">${item.date.split('-').reverse().join('/')}</td>
            <td class="font-mono">${(item.dueDate || item.date).split('-').reverse().join('/')}</td>
            <td class="text-right font-bold" style="color: #991b1b;">${formatCurrency(item.amount)}</td>
            <td class="text-right">
              <span class="${statusClass}">${statusText}</span>
            </td>
          </tr>
        `;
      }).join('');

      activeContentHtml = `
        <div class="header">
          <div>
            <h1 class="title">Relatório de Contas a Pagar (Débitos)</h1>
            <p class="subtitle">Modello Salon — Período: ${monthName} de ${selectedYear}</p>
          </div>
          <div class="meta">
            <p class="font-bold">Total Acumulado: ${formatCurrency(sumPayables)}</p>
            <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Fornecedor / Descrição</th>
              <th>Plano de Contas</th>
              <th>Data Lançamento</th>
              <th>Vencimento</th>
              <th class="text-right">Valor</th>
              <th class="text-right">Situação</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="6" style="text-align: center; padding: 30px; font-style: italic; color: #666;">Nenhum lançamento registrado neste período.</td></tr>'}
          </tbody>
        </table>

        <div class="total-box">
          VALOR SOMA DO RELATÓRIO: ${formatCurrency(sumPayables)}
        </div>

        <div class="signature-area">
          <div class="signature-line">Assinatura do Gerente</div>
          <div class="signature-line">Auditoria Interna / Contabilidade</div>
        </div>
      `;
    }

    const htmlContent = generatePrintableHTML(reportTitle, activeContentHtml);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportTitle.replace(/[\s/\\|:*?"<>]/g, '_')}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    setIsPrintPreviewActive(true);
  };

  return (
    <div className="space-y-8 print:bg-white print:text-black">
      
      {/* HEADER BAR FOR PRINT AND DISPLAY FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gold-200/40 print:hidden">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gold-600 shrink-0" />
            <span>Painel de Relatórios & DRE</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Gere auditorias, relatórios financeiros detalhados e o demonstrativo DRE para emitir/imprimir.</p>
        </div>

        {/* Dash Filter Selection */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex flex-col w-32">
            <span className="text-[10px] uppercase text-stone-400 font-bold ml-1 mb-1">Mês Base</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-[#FCF9F2] text-xs font-bold border border-gray-200 rounded-lg py-2 px-3 focus:outline-none"
            >
              {months.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col w-24">
            <span className="text-[10px] uppercase text-stone-400 font-bold ml-1 mb-1">Ano Base</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-[#FCF9F2] text-xs font-bold border border-gray-200 rounded-lg py-2 px-3 focus:outline-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABS SELECTOR CONTAINER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-gray-100 bg-[#FCF9F2]/65 print:hidden gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 max-w-full no-scrollbar flex-nowrap shrink-0 snap-x">
            {[
              { id: 'dre', label: 'DRE do Salão', icon: TrendingUp },
              { id: 'receber', label: 'Contas a Receber (Créditos)', icon: FileText },
              { id: 'pagar', label: 'Contas a Pagar (Débitos)', icon: ArrowRightLeft }
            ].map(tabSpec => {
              const Icon = tabSpec.icon;
              return (
                <button
                  key={tabSpec.id}
                  onClick={() => setActiveReportTab(tabSpec.id as any)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap snap-center ${
                    activeReportTab === tabSpec.id 
                      ? 'bg-black text-white font-black' 
                      : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tabSpec.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mt-2 sm:mt-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 border border-stone-300 text-stone-700 bg-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-stone-50 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-stone-500" />
              <span>Exportar Excel/CSV</span>
            </button>
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 bg-[#e5b35f] hover:bg-black text-black hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Imprimir / Emitir PDF</span>
            </button>
          </div>
        </div>

        {/* activeReportTab === 'dre' */}
        {activeReportTab === 'dre' && (
          <div className="p-6 space-y-6">
            <div className="bg-[#FCF9F2] p-4 rounded-lg border border-gold-150">
              <h3 className="font-serif font-bold text-gray-900 text-base">Demonstração do Resultado do Exercício (DRE)</h3>
              <p className="text-xs text-stone-500 mt-1">Relatório estruturado de apuração de competência e fluxo de caixa de lucros do salão.</p>
            </div>

            <div className="border border-gray-150 rounded-xl bg-white overflow-x-auto w-full max-w-full no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <tbody>
                  <tr className="bg-stone-50 border-b border-stone-150 font-bold text-stone-800 text-xs text-xs">
                    <td className="px-6 py-4 uppercase tracking-wider font-extrabold text-[#775a19]">Identificação / Lançamento</td>
                    <td className="px-6 py-4 text-right">VALOR ACUMULADO (EM R$)</td>
                  </tr>
                  
                  <tr className="border-b border-gray-100 hover:bg-slate-55 text-xs text-gray-900 font-sans">
                    <td className="px-6 py-3.5 pl-8 font-semibold">1. Receita Operacional Bruta (Faturamento de Competência)</td>
                    <td className="px-6 py-3.5 text-right font-bold text-gray-950">{formatCurrency(dre.receitaBruta)}</td>
                  </tr>

                  <tr className="border-b border-gray-100 hover:bg-slate-55 text-xs text-stone-600 font-sans">
                    <td className="px-6 py-2.5 pl-12">↳ (+) Receitas Recebidas À Vista (Dinheiro, Pix, Cartões)</td>
                    <td className="px-6 py-2.5 text-right font-medium text-emerald-700">{formatCurrency(dre.receitaRecebida)}</td>
                  </tr>

                  <tr className="border-b border-gray-100 hover:bg-slate-55 text-xs text-stone-600 font-sans">
                    <td className="px-6 py-2.5 pl-12">↳ (+) Receitas a Receber a Prazo (Duplicatas emitidas no mês)</td>
                    <td className="px-6 py-2.5 text-right font-medium text-amber-700">{formatCurrency(dre.receitaAReceber)}</td>
                  </tr>
                  
                  <tr className="border-b border-gray-100 hover:bg-slate-50 text-xs text-gray-900 font-sans">
                    <td className="px-6 py-3.5 pl-12 text-stone-500">(-) Descontos concedidos</td>
                    <td className="px-6 py-3.5 text-right font-mono text-stone-500">{formatCurrency(dre.descontos)}</td>
                  </tr>

                  <tr className="bg-slate-100 border-b border-slate-200 font-bold text-stone-900 text-xs">
                    <td className="px-6 py-4 uppercase font-bold pl-8">2. Receita Operacional Líquida</td>
                    <td className="px-6 py-4 text-right font-bold text-green-700">{formatCurrency(dre.receitaLiquida)}</td>
                  </tr>

                  <tr className="border-b border-gray-100 hover:bg-slate-50 text-xs text-gray-900 font-sans">
                    <td className="px-6 py-3.5 pl-12 text-stone-500">(-) Custos de Mercadorias e Consumíveis utilizados</td>
                    <td className="px-6 py-3.5 text-right font-mono text-rose-500">({formatCurrency(dre.custosMercadorias)})</td>
                  </tr>
                  
                  <tr className="border-b border-gray-100 hover:bg-slate-50 text-xs text-gray-900 font-sans">
                    <td className="px-6 py-3.5 pl-12 text-stone-500">(-) Comissões pagas aos profissionais</td>
                    <td className="px-6 py-3.5 text-right font-mono text-rose-500">({formatCurrency(dre.comissoesPagas)})</td>
                  </tr>

                  <tr className="bg-slate-50 border-b border-gray-200 font-bold text-stone-900 text-xs">
                    <td className="px-6 py-4 uppercase font-bold pl-8">3. Custos e Despesas Gerais de Instalações, Aluguel e Marketing</td>
                    <td className="px-6 py-4 text-right font-bold text-rose-600">({formatCurrency(dre.outrasDespesas)})</td>
                  </tr>

                  <tr className="bg-zinc-900 text-[#eed093] font-bold text-xs uppercase tracking-wide border-t-2 border-gold-400">
                    <td className="px-6 py-4 font-black">4. Resultado Líquido do Exercício (Lucro Líquido Real)</td>
                    <td className="px-6 py-4 text-right font-black text-xl">
                      {formatCurrency(dre.resultadoOperacional)}
                      <span className="text-[10px] text-green-400 block font-normal tracking-normal lowercase mt-0.5">
                        {dre.resultadoOperacional >= 0 ? "(Superávit Financeiro)" : "(Déficit Financeiro)"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl text-[11px] text-stone-500 leading-relaxed font-sans">
              * Nota Fiscal / Auditoria: O DRE acima é gerado em tempo de execução com base no cruzamento das comandas fechadas no banco de dados e lançamentos manuais registrados no plano de contas para {months[selectedMonth]} de {selectedYear}.
            </div>
          </div>
        )}

        {/* activeReportTab === 'receber' */}
        {activeReportTab === 'receber' && (
          <div className="p-6 space-y-6">
            
            {/* Report Header Filter Options */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FCF9F2] p-4 rounded-xl border border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-stone-600">Filtro de Status:</span>
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-white">
                  <button
                    onClick={() => setReceivablesFilter('todos')}
                    className={`text-[11px] font-bold px-3 py-1 rounded-md transition-all ${
                      receivablesFilter === 'todos' ? 'bg-black text-white' : 'text-stone-500'
                    }`}
                  >
                    Ambos (Todos)
                  </button>
                  <button
                    onClick={() => setReceivablesFilter('pendente')}
                    className={`text-[11px] font-bold px-3 py-1 rounded-md transition-all ${
                      receivablesFilter === 'pendente' ? 'bg-amber-100 text-[#775a19]' : 'text-stone-500'
                    }`}
                  >
                    Contas a Receber (Em Aberto)
                  </button>
                  <button
                    onClick={() => setReceivablesFilter('pago')}
                    className={`text-[11px] font-bold px-3 py-1 rounded-md transition-all ${
                      receivablesFilter === 'pago' ? 'bg-green-100 text-green-700' : 'text-stone-500'
                    }`}
                  >
                    Contas Recebidas (Pagas)
                  </button>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase text-stone-400 font-black">SOMA DO RELATÓRIO</p>
                <p className="text-lg font-serif font-black text-gold-700">{formatCurrency(sumReceivables)}</p>
              </div>
            </div>

            {/* Main Report Table */}
            <div className="border border-gray-150 rounded-xl bg-white overflow-x-auto w-full max-w-full no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-150 text-[11px] font-sans font-bold text-stone-400 uppercase tracking-widest">
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Procedimentos / Detalhe</th>
                    <th className="px-6 py-3">Plano de Contas</th>
                    <th className="px-6 py-3">Data Lançamento</th>
                    <th className="px-6 py-3">Vencimento</th>
                    <th className="px-6 py-3 text-right">Valor</th>
                    <th className="px-6 py-3 text-right">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-sans text-stone-700">
                  {finalReceivables.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                        Não existem lançamentos de contas a receber correspondentes aos filtros definidos.
                      </td>
                    </tr>
                  ) : (
                    finalReceivables.map(item => {
                      const { clientName, detail } = getRecordClientAndDetail(item);
                      return (
                        <tr key={item.id} className="hover:bg-gold-50/10 transition-all font-sans">
                          <td className="px-6 py-4 font-bold text-stone-900">{clientName}</td>
                          <td className="px-6 py-4 text-stone-500 line-clamp-1 max-w-xs">{detail}</td>
                          <td className="px-6 py-4 font-medium text-stone-600">{item.category}</td>
                          <td className="px-6 py-4 font-mono text-stone-400">{item.date.split('-').reverse().join('/')}</td>
                          <td className="px-6 py-4 font-mono text-stone-400">{(item.dueDate || item.date).split('-').reverse().join('/')}</td>
                          <td className="px-6 py-4 text-right font-bold text-gold-700">{formatCurrency(item.amount)}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] ${
                              item.status === 'pago' 
                                ? 'bg-green-50 border border-green-200 text-green-700' 
                                : 'bg-amber-50 border border-amber-200 text-amber-700'
                            }`}>
                              {item.status === 'pago' ? (
                                <>
                                  <FileCheck className="w-3 h-3" />
                                  <span>Pago</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>Pendente</span>
                                </>
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* activeReportTab === 'pagar' */}
        {activeReportTab === 'pagar' && (
          <div className="p-6 space-y-6">
            
            {/* Report Header Filter Options */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FCF9F2] p-4 rounded-xl border border-gray-150">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-stone-600">Filtro de Status:</span>
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-white">
                  <button
                    onClick={() => setPayablesFilter('todos')}
                    className={`text-[11px] font-bold px-3 py-1 rounded-md transition-all ${
                      payablesFilter === 'todos' ? 'bg-black text-white' : 'text-stone-500'
                    }`}
                  >
                    Ambos (Todos)
                  </button>
                  <button
                    onClick={() => setPayablesFilter('pendente')}
                    className={`text-[11px] font-bold px-3 py-1 rounded-md transition-all ${
                      payablesFilter === 'pendente' ? 'bg-rose-100 text-rose-700' : 'text-stone-500'
                    }`}
                  >
                    Contas a Pagar (Em Aberto)
                  </button>
                  <button
                    onClick={() => setPayablesFilter('pago')}
                    className={`text-[11px] font-bold px-3 py-1 rounded-md transition-all ${
                      payablesFilter === 'pago' ? 'bg-green-100 text-green-700' : 'text-stone-500'
                    }`}
                  >
                    Contas Pagas (Quitadas)
                  </button>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase text-stone-400 font-black">SOMA DO RELATÓRIO</p>
                <p className="text-lg font-serif font-black text-rose-600">{formatCurrency(sumPayables)}</p>
              </div>
            </div>

            {/* Main Report Table */}
            <div className="border border-gray-150 rounded-xl bg-white overflow-x-auto w-full max-w-full no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-150 text-[11px] font-sans font-bold text-stone-400 uppercase tracking-widest">
                    <th className="px-6 py-3">Fornecedor / Descrição</th>
                    <th className="px-6 py-3">Plano de Contas</th>
                    <th className="px-6 py-3">Data Lançamento</th>
                    <th className="px-6 py-3">Vencimento</th>
                    <th className="px-6 py-3 text-right">Valor</th>
                    <th className="px-6 py-3 text-right">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-sans text-stone-700">
                  {finalPayables.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                        Não existem lançamentos de contas a pagar correspondentes aos filtros definidos.
                      </td>
                    </tr>
                  ) : (
                    finalPayables.map(item => (
                      <tr key={item.id} className="hover:bg-rose-50/10 transition-all font-sans">
                        <td className="px-6 py-4 font-bold text-stone-900">{item.description}</td>
                        <td className="px-6 py-4 font-medium text-stone-600">{item.category}</td>
                        <td className="px-6 py-4 font-mono text-stone-400">{item.date.split('-').reverse().join('/')}</td>
                        <td className="px-6 py-4 font-mono text-stone-400">{(item.dueDate || item.date).split('-').reverse().join('/')}</td>
                        <td className="px-6 py-4 text-right font-bold text-rose-600">{formatCurrency(item.amount)}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            item.status === 'pago' 
                              ? 'bg-green-50 border border-green-200 text-green-700' 
                              : 'bg-rose-50 border border-rose-200 text-rose-700'
                          }`}>
                            {item.status === 'pago' ? (
                              <>
                                <FileCheck className="w-3 h-3" />
                                <span>Quitado</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>Aberto</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      
      {/* FULLSCREEN PRINT PREVIEW MODAL OPERATES OVER EXCLUSIVELY EVERYTHING FOR PERFECT RENDERING */}
      {isPrintPreviewActive && (
        <div className="fixed inset-0 z-50 bg-[#1c1917] overflow-y-auto font-sans">
          
          {/* Top Sticky Navigation Action Bar */}
          <div className="sticky top-0 bg-stone-900 border-b border-stone-800 text-stone-200 p-4 print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FCF9F2]/10 rounded-lg text-[#e5b35f]">
                <Printer className="w-5 h-5 bg-white/5 rounded-md p-0.5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-100 tracking-tight">Painel de Emissão de Documento / PDF</h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Visualização em formato A4 real. Se as restrições do navegador (iframe sandbox) bloquearam a impressão direta, use <kbd className="bg-stone-800 px-1.5 py-0.5 rounded text-stone-300 font-mono text-[10px]">Ctrl + P</kbd> ou clique em <strong className="text-amber-300">"Baixar Relatório HTML"</strong> para imprimir localmente!
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={handleDownloadPrintHTML}
                className="px-4 py-2 bg-stone-800 border border-stone-700 text-stone-200 hover:text-white hover:bg-stone-750 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Atalhado para exportar cópia impressa independente"
              >
                <Download className="w-4 h-4 text-stone-400" />
                <span>Baixar Relatório HTML</span>
              </button>
              
              <button
                onClick={() => {
                  try {
                    window.print();
                  } catch (e) {
                    setAlertState({message: "Utilize as teclas Ctrl + P ou Cmd + P para imprimir, ou clique em baixar Relatório!"});
                  }
                }}
                className="px-4 py-2 bg-[#e5b35f] text-black hover:bg-[#cf9e4d] rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Disparar Impressão / PDF</span>
              </button>
              
              <button
                onClick={() => setIsPrintPreviewActive(false)}
                className="px-3.5 py-2 bg-stone-700 text-stone-200 hover:text-white hover:bg-stone-600 rounded-lg text-xs font-bold transition cursor-pointer ml-1"
              >
                Sair da Visualização ✕
              </button>
            </div>
          </div>

          {/* Centered Paper Layout A4 Wrapper */}
          <div className="min-h-screen bg-stone-900 pb-20 pt-6 print:bg-white print:pb-0 print:pt-0 overflow-x-auto w-full">
            <div className="min-w-[750px] md:min-w-0 print:min-w-0 print:max-w-none print:w-full max-w-[800px] mx-auto bg-white text-stone-950 p-4 sm:p-12 shadow-2xl rounded-sm border border-stone-800/10 font-sans print:border-none print:shadow-none print:p-0">
              
              {/* Document DRE Layout */}
              {activeReportTab === 'dre' && (
                <div className="space-y-8 font-sans">
                  {/* Ledger Header */}
                  <div className="border-b-2 border-[#e5b35f] pb-6 flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Demonstração do Resultado do Exercício (DRE)</h1>
                      <p className="text-xs text-stone-500 mt-1">Modello Salon — Período: {months[selectedMonth]} de {selectedYear}</p>
                    </div>
                    <div className="text-right text-[11px] text-stone-500 font-sans">
                      <p className="font-bold text-stone-800">Relatório Consolidado</p>
                      <p className="mt-0.5">Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour12: false })}</p>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <table className="w-full text-left border-collapse font-sans text-xs">
                    <thead>
                      <tr className="bg-[#FCF9F2] border-b border-[#e5b35f]">
                        <th className="px-4 py-3 font-bold text-[#78350f] uppercase tracking-wider text-[10px]">Identificação do Lançamento / Rubrica</th>
                        <th className="px-4 py-3 text-right font-bold text-[#78350f] uppercase tracking-wider text-[10px]">Valor Acumulado (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-stone-900">1. Receita Operacional Bruta (Faturamento)</td>
                        <td className="px-4 py-3.5 text-right font-bold text-stone-950">{formatCurrency(dre.receitaBruta)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 pl-8 text-stone-600">↳ (+) Receitas Recebidas À Vista (Caixa)</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{formatCurrency(dre.receitaRecebida)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 pl-8 text-stone-600">↳ (+) Receitas a Receber a Prazo (Duplicatas)</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-amber-700">{formatCurrency(dre.receitaAReceber)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 pl-8 text-stone-400">(-) Descontos Concedidos</td>
                        <td className="px-4 py-2.5 text-right font-mono text-stone-400">({formatCurrency(dre.descontos)})</td>
                      </tr>
                      <tr className="bg-stone-50 font-bold text-stone-900 bg-stone-50/70">
                        <td className="px-4 py-3.5 pl-8 uppercase font-bold">2. Receita Operacional Líquida</td>
                        <td className="px-4 py-3.5 text-right text-emerald-800 font-extrabold">{formatCurrency(dre.receitaLiquida)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 pl-8 text-stone-500">(-) Custos de Mercadorias / Consumíveis</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-600">({formatCurrency(dre.custosMercadorias)})</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 pl-8 text-stone-500">(-) Comissões pagas aos profissionais</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-600">({formatCurrency(dre.comissoesPagas)})</td>
                      </tr>
                      <tr className="bg-stone-50 font-bold text-stone-900 bg-stone-50/70">
                        <td className="px-4 py-3.5 pl-8 uppercase font-bold">3. Custos e Despesas Gerais de Instalações, Aluguel e Marketing</td>
                        <td className="px-4 py-3.5 text-right text-rose-700">({formatCurrency(dre.outrasDespesas)})</td>
                      </tr>
                      <tr className="bg-stone-950 text-[#eed093] font-bold text-xs tracking-wide">
                        <td className="px-4 py-5 font-black uppercase text-[#eed093] bg-neutral-900">4. Resultado Líquido do Exercício (Lucro Líquido Real)</td>
                        <td className="px-4 py-5 text-right font-black text-base bg-neutral-900 text-[#eed093]">
                          {formatCurrency(dre.resultadoOperacional)}
                          <span className="text-[9px] text-green-300 block font-normal lowercase tracking-normal mt-0.5">
                            {dre.resultadoOperacional >= 0 ? "(Superávit de Período)" : "(Déficit de Período)"}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Audit / Notes */}
                  <div className="bg-stone-50 border border-stone-200 p-4 rounded text-[10px] text-stone-500 leading-relaxed font-sans mt-8">
                    * Nota Fiscal / Auditoria: O DRE acima é gerado em tempo de execução com base no cruzamento das comandas fechadas no banco de dados e lançamentos manuais registrados no plano de contas para {months[selectedMonth]} de {selectedYear}.
                  </div>

                  {/* Signature block */}
                  <div className="mt-16 pt-12 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500">
                    <div className="w-1/3 text-center border-t border-stone-300 pt-2 pb-1">
                      Assinatura do Gerente
                    </div>
                    <div className="w-1/3 text-center border-t border-stone-300 pt-2 pb-1">
                      Responsável Contábil
                    </div>
                  </div>
                </div>
              )}

              {/* Document Receivables Layout */}
              {activeReportTab === 'receber' && (
                <div className="space-y-8 font-sans">
                  {/* Ledger Header */}
                  <div className="border-b-2 border-[#e5b35f] pb-6 flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Relatório de Contas a Receber (Créditos)</h1>
                      <p className="text-xs text-stone-500 mt-1">Modello Salon — Período: {months[selectedMonth]} de {selectedYear}</p>
                    </div>
                    <div className="text-right text-[11px] text-stone-500 font-sans">
                      <p className="font-bold text-stone-800">Soma: {formatCurrency(sumReceivables)}</p>
                      <p className="mt-0.5">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <table className="w-full text-left border-collapse font-sans text-xs">
                    <thead>
                      <tr className="bg-[#FCF9F2] border-b border-[#e5b35f]">
                        <th className="px-4 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Cliente</th>
                        <th className="px-4 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Procedimentos / Detalhe</th>
                        <th className="px-4 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Plano de Contas</th>
                        <th className="px-4 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Lançamento</th>
                        <th className="px-4 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Vencimento</th>
                        <th className="px-4 py-3 text-right text-stone-800 font-bold uppercase tracking-wider text-[9px]">Valor</th>
                        <th className="px-3 py-3 text-right text-stone-800 font-bold uppercase tracking-wider text-[9px]">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-[11px]">
                      {finalReceivables.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-stone-400 italic">
                            Nenhum registro de Contas a Receber localizado para este período.
                          </td>
                        </tr>
                      ) : (
                        finalReceivables.map(item => {
                          const { clientName, detail } = getRecordClientAndDetail(item);
                          return (
                            <tr key={item.id}>
                              <td className="px-4 py-3 font-semibold text-stone-900">{clientName}</td>
                              <td className="px-4 py-3 text-stone-500">{detail}</td>
                              <td className="px-4 py-3 text-stone-500">{item.category}</td>
                              <td className="px-4 py-3 font-mono text-stone-400">{item.date.split('-').reverse().join('/')}</td>
                              <td className="px-4 py-3 font-mono text-stone-400">{(item.dueDate || item.date).split('-').reverse().join('/')}</td>
                              <td className="px-4 py-3 text-right font-bold text-stone-800">{formatCurrency(item.amount)}</td>
                              <td className="px-3 py-3 text-right">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                  item.status === 'pago' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.status === 'pago' ? 'Recebido' : 'Pendente'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Summary Box */}
                  <div className="p-4 bg-[#FCF9F2] border border-[#e5b35f] rounded-lg text-right font-bold text-stone-800 text-xs">
                    TOTAL SOMA DO RELATÓRIO: {formatCurrency(sumReceivables)}
                  </div>

                  {/* Signature block */}
                  <div className="mt-16 pt-12 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500">
                    <div className="w-1/3 text-center border-t border-stone-300 pt-2 pb-1">
                      Assinatura do Gerente
                    </div>
                    <div className="w-1/3 text-center border-t border-stone-300 pt-2 pb-1">
                      Responsável Contábil
                    </div>
                  </div>
                </div>
              )}

              {/* Document Payables Layout */}
              {activeReportTab === 'pagar' && (
                <div className="space-y-8 font-sans">
                  {/* Ledger Header */}
                  <div className="border-b-2 border-[#e5b35f] pb-6 flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Relatório de Contas a Pagar (Débitos)</h1>
                      <p className="text-xs text-stone-500 mt-1">Modello Salon — Período: {months[selectedMonth]} de {selectedYear}</p>
                    </div>
                    <div className="text-right text-[11px] text-stone-500 font-sans">
                      <p className="font-bold text-stone-800">Soma: {formatCurrency(sumPayables)}</p>
                      <p className="mt-0.5">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <table className="w-full text-left border-collapse font-sans text-xs">
                    <thead>
                      <tr className="bg-[#FCF9F2] border-b border-[#e5b35f]">
                        <th className="px-4 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Fornecedor / Descrição</th>
                        <th className="px-4 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Plano de Contas</th>
                        <th className="px-4 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Lançamento</th>
                        <th className="px-4 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Vencimento</th>
                        <th className="px-4 py-3 text-right text-stone-800 font-bold uppercase tracking-wider text-[9px]">Valor</th>
                        <th className="px-3 py-3 text-right text-stone-800 font-bold uppercase tracking-wider text-[9px]">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-[11px]">
                      {finalPayables.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-stone-400 italic">
                            Nenhum registro de Contas a Pagar localizado para este período.
                          </td>
                        </tr>
                      ) : (
                        finalPayables.map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-semibold text-stone-900">{item.description}</td>
                            <td className="px-4 py-3 text-stone-500">{item.category}</td>
                            <td className="px-4 py-3 font-mono text-stone-400">{item.date.split('-').reverse().join('/')}</td>
                            <td className="px-4 py-3 font-mono text-stone-400">{(item.dueDate || item.date).split('-').reverse().join('/')}</td>
                            <td className="px-4 py-3 text-right font-bold text-rose-700">{formatCurrency(item.amount)}</td>
                            <td className="px-3 py-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                item.status === 'pago' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {item.status === 'pago' ? 'Quitado' : 'Aberto'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Summary Box */}
                  <div className="p-4 bg-[#FCF9F2] border border-[#e5b35f] rounded-lg text-right font-bold text-stone-800 text-xs">
                    TOTAL SOMA DO RELATÓRIO: {formatCurrency(sumPayables)}
                  </div>

                  {/* Signature block */}
                  <div className="mt-16 pt-12 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500">
                    <div className="w-1/3 text-center border-t border-stone-300 pt-2 pb-1">
                      Assinatura do Gerente
                    </div>
                    <div className="w-1/3 text-center border-t border-stone-300 pt-2 pb-1">
                      Responsável Contábil
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <AlertModal
        open={!!alertState}
        message={alertState?.message || ''}
        variant={alertState?.variant || 'info'}
        onClose={() => setAlertState(null)}
      />
    </div>
  );
}
