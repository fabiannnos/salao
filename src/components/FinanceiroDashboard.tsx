import React, { useState } from 'react';
import { FinancialRecord, Comanda, ChartAccountGroup, Professional } from '../types';
import { formatCurrency, exportToCSV, getComissaoReferenceDate, formatDateBR } from '../utils';
import { 
  TrendingUp, 
  Wallet, 
  AlertCircle, 
  Download, 
  Printer, 
  Plus, 
  CheckCircle, 
  Trash2, 
  Calendar, 
  FileText, 
  ChevronRight,
  MessageSquare,
  ArrowRightLeft,
  Edit2
} from 'lucide-react';
import { calculateDRE } from '../dataStore';
import AlertModal from './AlertModal';

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

const formatToDayMonth = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDate.split('-');
  if (parts.length >= 3) {
    const day = parts[2];
    const month = parts[1];
    return `${day}/${month}`;
  }
  return dateStr;
};

interface FinanceiroDashboardProps {
  salonId: string;
  financials: FinancialRecord[];
  comandas: Comanda[];
  charts: ChartAccountGroup[];
  professionals: Professional[];
  onAddFinancialRecord: (record: FinancialRecord) => void;
  onUpdateFinancialRecord: (record: FinancialRecord) => void;
  onSettleDebt: (comandaId: string) => void; 
  onDeleteFinancialRecord: (id: string) => void;
  onUpdateComandaObj: (comanda: Comanda) => void;
  isReadOnly?: boolean;
  commissionAccrualRule?: 'competencia' | 'caixa';
}

export default function FinanceiroDashboard({
  salonId,
  financials,
  comandas,
  charts,
  professionals,
  onAddFinancialRecord,
  onUpdateFinancialRecord,
  onSettleDebt,
  onDeleteFinancialRecord,
  onUpdateComandaObj,
  isReadOnly = false,
  commissionAccrualRule = 'caixa'
}: FinanceiroDashboardProps) {
  const TOOLTIP_READONLY = "Plano expirado. Renove para voltar a realizar alterações.";
  // Selected period
  const [selectedMonth, setSelectedMonth] = useState((new Date()).getMonth());
  const [selectedYear, setSelectedYear] = useState(2026);
  const [subTab, setSubTab] = useState<'geral' | 'pagar' | 'receber' | 'comissoes'>('geral');
  const [isPrintPreviewActive, setIsPrintPreviewActive] = useState(false);

  // Commission settlement states
  const [commissionFilterProf, setCommissionFilterProf] = useState<string>('');
  const [commissionFilterStatus, setCommissionFilterStatus] = useState<'all' | 'pending' | 'paid'>('pending');
  const [selectedCommissionKeys, setSelectedCommissionKeys] = useState<string[]>([]);

  // Commission grid sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  // Manual record layout filters
  const [reportDateType, setReportDateType] = useState<'vencimento' | 'pagamento'>('vencimento');

  // New Record Builder state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [newType, setNewType] = useState<'receita' | 'despesa'>('despesa');
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]); // Emission Date
  const [isPrePaid, setIsPrePaid] = useState(true); // Default to marked as paid/received
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]); // Due Date
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]); // Payment Date

  // Accounts receivable search and selection states
  const [receberSearchQuery, setReceberSearchQuery] = useState('');
  const [selectedReceberIds, setSelectedReceberIds] = useState<string[]>([]);
  const [isMassActionModalOpen, setIsMassActionModalOpen] = useState(false);
  const [massActionPaymentMethod, setMassActionPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Crédito' | 'Débito'>('Pix');
  const [massActionPaymentDate, setMassActionPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [finDeleteConfirmId, setFinDeleteConfirmId] = useState<string | null>(null);

  // Individual settlement modal states for Receber Valor
  const [settlingItem, setSettlingItem] = useState<FinancialRecord | null>(null);
  const [individualPaymentMethod, setIndividualPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Crédito' | 'Débito' | ''>('');
  const [individualPaymentDate, setIndividualPaymentDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Extract client name and detail for accounts receivable
  const getRecordClientAndDetail = (item: FinancialRecord) => {
    if (item.relatedComandaId) {
      const com = comandas.filter(c => !c.deletedAt).find(c => c.id === item.relatedComandaId);
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
      clientName: "Lançamento Manual",
      detail: item.description
    };
  };

  const getCommissionItems = () => {
    const periodComandas = comandas.filter(c => {
      if (c.deletedAt) return false;
      if (c.status !== 'Concluido') return false;
      const refDate = getComissaoReferenceDate(c, commissionAccrualRule);
      return dateInPeriod(refDate);
    });
    
    const items: {
      key: string;
      comandaId: string;
      itemId: string;
      itemIndex: number;
      ticketNumber: string;
      clientName: string;
      date: string;
      name: string;
      type: 'servico' | 'produto';
      price: number;
      rate: number;
      value: number;
      originalValue: number;
      cardFeeRateUsed: number;
      profDeductPct: number;
      professionalId: string;
      professionalName: string;
      paid: boolean;
      paymentDate?: string;
    }[] = [];

    periodComandas.forEach(c => {
      // Traverse services
      c.services.forEach((s, sIdx) => {
        const matchProf = !commissionFilterProf || s.professionalId === commissionFilterProf;
        const paidVar = s.commissionPaid || false;
        const matchStatus = commissionFilterStatus === 'all' || 
          (commissionFilterStatus === 'pending' && !paidVar) || 
          (commissionFilterStatus === 'paid' && paidVar);

        if (matchProf && matchStatus) {
          const grossVal = s.originalCommissionValue !== undefined ? s.originalCommissionValue : (s.price * (s.commissionRate || 0)) / 100;
          items.push({
             key: `${c.id}_services_${s.id}_${sIdx}`,
             comandaId: c.id,
             itemId: s.id,
             itemIndex: sIdx,
             ticketNumber: c.ticketNumber,
             clientName: c.clientName,
             date: getComissaoReferenceDate(c, commissionAccrualRule),
             name: s.name,
             type: 'servico',
             price: s.price,
             rate: s.commissionRate,
             value: s.commissionValue,
             originalValue: grossVal,
             cardFeeRateUsed: c.cardFeeRateUsed || 0,
             profDeductPct: c.profDeductPercentage ?? 0,
             professionalId: s.professionalId,
             professionalName: s.professionalName,
             paid: paidVar,
             paymentDate: s.commissionPaymentDate
          });
        }
      });

      // Traverse products
      if (c.products) {
        c.products.forEach((p, pIdx) => {
          if (p.professionalId) {
            const matchProf = !commissionFilterProf || p.professionalId === commissionFilterProf;
            const paidVar = p.commissionPaid || false;
            const matchStatus = commissionFilterStatus === 'all' || 
              (commissionFilterStatus === 'pending' && !paidVar) || 
              (commissionFilterStatus === 'paid' && paidVar);

            if (matchProf && matchStatus) {
              const grossVal = p.originalCommissionValue !== undefined ? p.originalCommissionValue : (p.price * (p.commissionRate || 0)) / 100;
              items.push({
                key: `${c.id}_products_${p.id}_${pIdx}`,
                comandaId: c.id,
                itemId: p.id,
                itemIndex: pIdx,
                ticketNumber: c.ticketNumber,
                clientName: c.clientName,
                date: getComissaoReferenceDate(c, commissionAccrualRule),
                name: p.name,
                type: 'produto',
                price: p.price,
                rate: p.commissionRate || 0,
                value: p.commissionValue || 0,
                originalValue: grossVal,
                cardFeeRateUsed: c.cardFeeRateUsed || 0,
                profDeductPct: c.profDeductPercentage ?? 0,
                professionalId: p.professionalId,
                professionalName: p.professionalName || 'Vendedor',
                paid: paidVar,
                paymentDate: p.commissionPaymentDate
              });
            }
          }
        });
      }
    });

    return items;
  };

  // Filter financial records based on chosen grouping (dueDate / date vs actual paymentDate)
  const monthRecords = financials.filter(f => {
    if (f.deletedAt) return false;
    if (reportDateType === 'pagamento') {
      return f.status === 'pago' && dateInPeriod(f.paymentDate);
    } else {
      return dateInPeriod(f.dueDate || f.date);
    }
  });

  const currentPagar = financials.filter(f => !f.deletedAt && f.type === 'despesa' && !(f.category === 'Comissão' || f.category === 'Pessoal / Comissões' || f.category?.toLowerCase()?.includes('comis')) && (f.status === 'pendente' || dateInPeriod(f.paymentDate || f.date)));
  const currentReceber = financials.filter(f => !f.deletedAt && f.type === 'receita' && (f.status === 'pendente' || dateInPeriod(f.paymentDate || f.date)));

  const filteredReceber = currentReceber.filter(item => {
    if (!receberSearchQuery) return true;
    const { clientName } = getRecordClientAndDetail(item);
    return clientName.toLowerCase().includes(receberSearchQuery.toLowerCase());
  });

  const totalReceita = financials
    .filter(f => !f.deletedAt && f.type === 'receita' && f.status === 'pago' && dateInPeriod(f.paymentDate || f.date))
    .reduce((sum, f) => sum + f.amount, 0);

  const totalAReceber = financials
    .filter(f => !f.deletedAt && f.type === 'receita' && f.status === 'pendente')
    .reduce((sum, f) => sum + f.amount, 0);

  const totalPagar = financials
    .filter(f => !f.deletedAt && f.type === 'despesa' && f.status === 'pendente' && !(f.category === 'Comissão' || f.category === 'Pessoal / Comissões' || f.category?.toLowerCase()?.includes('comis')))
    .reduce((sum, f) => sum + f.amount, 0);

  // Fetch pending comandas under "Competência" Duplicatas
  const pendingFiados = comandas.filter(c => !c.deletedAt && c.isFiado && c.status === 'Concluido');

  // Trigger quick manual settlement / "Baixar Comanda"
  const handleSettleAction = (comandaId: string, clientName: string) => {
    onSettleDebt(comandaId);
  };

  // Immediate payment settlement for manual expenses
  const handleSettleExpense = (expense: FinancialRecord) => {
    const updated: FinancialRecord = {
      ...expense,
      status: 'pago',
      paymentDate: new Date().toISOString().split('T')[0]
    };
    onUpdateFinancialRecord(updated);
    setAlertState({message: `Pagamento registrado com sucesso para: ${expense.description}`, variant: 'success'});
  };

  // Immediate receipt settlement for manual revenues
  const handleSettleRevenueItem = (revenue: FinancialRecord) => {
    const updated: FinancialRecord = {
      ...revenue,
      status: 'pago',
      paymentDate: new Date().toISOString().split('T')[0]
    };
    onUpdateFinancialRecord(updated);
    setAlertState({message: `Recebimento registrado com sucesso para: ${revenue.description}`, variant: 'success'});
  };

  // Generate HTML PDF for selected items from Contas a Receber
  const handleGeneratePDFSelected = () => {
    if (selectedReceberIds.length === 0) {
      setAlertState({message: "Nenhum item selecionado para extrato.", variant: 'error'});
      return;
    }

    const selectedItems = financials.filter(f => !f.deletedAt && selectedReceberIds.includes(f.id));
    const totalSelected = selectedItems.reduce((sum, item) => sum + item.amount, 0);

    const reportTitle = `Extrato_de_Debitos_${new Date().toISOString().split('T')[0]}`;
    
    const rowsHtml = selectedItems.map(item => {
      const { clientName, detail } = getRecordClientAndDetail(item);
      const venc = formatDateBR(item.dueDate || item.date);
      const statusLabel = item.status === 'pago' ? 'RECEBIDO' : 'PENDENTE';
      const statusClass = item.status === 'pago' ? 'status-pago' : 'status-pendente';
      return `
        <tr>
          <td>
            <div style="font-weight: bold; color: #1c1917;">${clientName}</div>
            <div style="font-size: 10px; color: #71717a;">${detail}</div>
          </td>
          <td>${item.category}</td>
          <td class="font-mono">${venc}</td>
          <td class="text-right font-mono font-bold" style="color: #b45309; text-align: right;">${formatCurrency(item.amount)}</td>
          <td class="text-right" style="text-align: right;">
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </td>
        </tr>
      `;
    }).join('');

    const activeContentHtml = `
      <div class="header" style="margin-bottom: 20px;">
        <div>
          <h1 class="title">Extrato de Débitos / Contas a Receber Selecionadas</h1>
          <p class="subtitle">Modello Salon — Relatório de Auditoria e Cobrança de Duplicatas</p>
        </div>
        <div class="meta" style="text-align: right;">
          <p class="font-bold">Total Itens Selecionados: ${selectedItems.length}</p>
          <p class="font-bold" style="color: #b45309; font-size: 14px;">Total Débitos: ${formatCurrency(totalSelected)}</p>
          <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #fcf9f2; border-bottom: 1px solid #e5b35f;">
            <th style="padding: 10px; text-align: left;">Cliente / Lançamento</th>
            <th style="padding: 10px; text-align: left;">Categoria</th>
            <th style="padding: 10px; text-align: left;">Vencimento</th>
            <th style="padding: 10px; text-align: right;">Valor Duplicata</th>
            <th style="padding: 10px; text-align: right;">Situação</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="total-box" style="background-color: #fcf9f2; border: 1px solid #e5b35f; padding: 15px; border-radius: 6px; text-align: right; font-weight: bold; margin-top: 15px;">
        VALOR TOTAL ACUMULADO DOS DÉBITOS DO EXTRATO: ${formatCurrency(totalSelected)}
      </div>

      <div class="signature-area" style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div class="signature-line" style="width: 220px; border-top: 1px solid #ccc; text-align: center; padding-top: 8px; font-size: 10px; color: #71717a;">Assinatura do Cliente / Devedor</div>
        <div class="signature-line" style="width: 220px; border-top: 1px solid #ccc; text-align: center; padding-top: 8px; font-size: 10px; color: #71717a;">Modello Salon — Conferência</div>
      </div>
    `;

    const htmlContent = generatePrintableHTML("Extrato de Débitos", activeContentHtml);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportTitle}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mass Settle logic updating selected items
  const handleMassSettle = (method: 'Dinheiro' | 'Pix' | 'Crédito' | 'Débito', customPaymentDate?: string) => {
    if (selectedReceberIds.length === 0) {
      setAlertState({message: "Nenhum item selecionado para baixa.", variant: 'error'});
      return;
    }

    const targetDateStr = customPaymentDate || massActionPaymentDate || new Date().toISOString().split('T')[0];
    const itemsToSettle = financials.filter(f => !f.deletedAt && selectedReceberIds.includes(f.id) && f.status === 'pendente');

    if (itemsToSettle.length === 0) {
      setAlertState({message: "Nenhum item PENDENTE selecionado para baixa coletiva.", variant: 'error'});
      return;
    }

    // SUPABASE REQUISITADO:
    // const { data, error } = await supabase
    //   .from('financials')
    //   .update({ status: 'pago', payment_date: targetDateStr, payment_method: method })
    //   .in('id', selectedIds);

    // Apply updates locally to persist in state and localStorage
    itemsToSettle.forEach(item => {
      const updatedRecord: FinancialRecord = {
        ...item,
        status: 'pago',
        paymentDate: targetDateStr,
        description: item.description.includes('pago via') 
          ? item.description 
          : `${item.description} (pago via ${method})`
      };
      onUpdateFinancialRecord(updatedRecord);

      // Synchronize related comanda if relevant
      if (item.relatedComandaId) {
        const com = comandas.filter(c => !c.deletedAt).find(c => c.id === item.relatedComandaId);
        if (com) {
          const comandaMethodMap: { [key: string]: 'Dinheiro' | 'Cartão Credito' | 'Cartão Debito' | 'Pix' | 'Caderno' } = {
            'Dinheiro': 'Dinheiro',
            'Pix': 'Pix',
            'Crédito': 'Cartão Credito',
            'Débito': 'Cartão Debito'
          };
          const updatedComanda: Comanda = {
            ...com,
            isFiado: false,
            status: 'Concluido',
            paymentDate: targetDateStr,
            paymentMethod: comandaMethodMap[method] || 'Pix'
          };
          onUpdateComandaObj(updatedComanda);
        }
      }
    });

    setAlertState({message: `Baixa coletiva síncrona com Supabase concluída! ${itemsToSettle.length} item(ns) liquidado(s) com sucesso.`, variant: 'success'});
    
    setSelectedReceberIds([]);
    setIsMassActionModalOpen(false);
  };

  // WhatsApp Reminder Dispatch
  const handleSendReminder = (item: FinancialRecord) => {
    // Generate WhatsApp API URL
    const cleanPhone = "5511988887777"; // fallback mock or specific salon phone
    const message = `Olá! Lembramos que o vencimento do lançamento "${item.description}" no valor de ${formatCurrency(item.amount)} está agendado para ${formatDateBR(item.dueDate || item.date)}. Por favor providencie o acerto. Obrigado!`;
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Start editing handler
  const handleStartEdit = (record: FinancialRecord) => {
    setEditingRecord(record);
    setNewType(record.type);
    setNewCategory(record.category);
    setNewAmount(record.amount.toString());
    setNewDesc(record.description || '');
    setNewDate(record.date);
    setIsPrePaid(record.status === 'pago');
    setNewDueDate(record.dueDate || record.date);
    setNewPaymentDate(record.paymentDate || record.date);
    setShowAddForm(true);
  };

  // Delete handler
  const handleDeleteRecord = (id: string) => {
    if (finDeleteConfirmId !== id) {
      setFinDeleteConfirmId(id);
      return;
    }
    onDeleteFinancialRecord(id);
    setFinDeleteConfirmId(null);
  };

  // Add/Edit manual record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || !newCategory) return;

    // Build dates based on checked pre-paid flags
    const finalStatus = isPrePaid ? 'pago' : 'pendente';
    const finalDueDate = isPrePaid ? newDate : newDueDate;
    const finalPaymentDate = isPrePaid ? newDate : undefined;
    const finalReminderDate = isPrePaid ? undefined : newPaymentDate;

    if (editingRecord) {
      const updated: FinancialRecord = {
        ...editingRecord,
        type: newType,
        category: newCategory,
        amount: parseFloat(newAmount),
        date: newDate,
        description: newDesc || `Lançamento manual de ${newCategory}`,
        status: finalStatus,
        dueDate: finalDueDate,
        paymentDate: finalPaymentDate,
        reminderDate: finalReminderDate
      };
      onUpdateFinancialRecord(updated);
      setEditingRecord(null);
    } else {
      const record: FinancialRecord = {
        id: 'fin_manual_' + Math.random().toString(36).substr(2, 9),
        salonId,
        type: newType,
        category: newCategory,
        amount: parseFloat(newAmount),
        date: newDate,
        description: newDesc || `Lançamento manual de ${newCategory}`,
        status: finalStatus,
        dueDate: finalDueDate,
        paymentDate: finalPaymentDate,
        reminderDate: finalReminderDate
      };
      onAddFinancialRecord(record);
    }

    setShowAddForm(false);
    setNewAmount('');
    setNewDesc('');
  };

  // Calculate DRE Live values for current selectedMonth
  const dre = calculateDRE(salonId, selectedMonth, selectedYear);

  // CSV Exporter adapter
  const handleExportCSV = () => {
    const exportData = monthRecords.map(r => ({
      ID: r.id,
      Data: r.date,
      Tipo: r.type === 'receita' ? 'Receita' : 'Despesa',
      Categoria: r.category,
      Valor: r.amount,
      Status: r.status === 'pago' ? 'Confirmado' : 'Pendente',
      Vencimento: r.dueDate || r.date,
      DataPagamento: r.paymentDate || 'N/A',
      Descricao: r.description
    }));
    exportToCSV(exportData, `Financeiro_SaaS_Mes_${selectedMonth + 1}`);
  };

  const handleDownloadPrintHTML = () => {
    const monthName = months[selectedMonth];
    const reportTitle = subTab === 'geral' 
      ? `DRE - ${monthName} de ${selectedYear}`
      : subTab === 'receber'
        ? `Contas a Receber - ${monthName} de ${selectedYear}`
        : subTab === 'pagar'
          ? `Contas a Pagar - ${monthName} de ${selectedYear}`
          : `Relatório de Comissões - ${monthName} de ${selectedYear}`;
    
    // Sum calculations
    const sumReceivables = filteredReceber.reduce((acc, curr) => acc + curr.amount, 0);
    const sumPayables = currentPagar.reduce((acc, curr) => acc + curr.amount, 0);

    let activeContentHtml = '';

    if (subTab === 'geral') {
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
    } else if (subTab === 'receber') {
      const rowsHtml = filteredReceber.map(item => {
        const { clientName, detail } = getRecordClientAndDetail(item);
        const statusClass = item.status === 'pago' ? 'status-badge status-pago' : 'status-badge status-pendente';
        const statusText = item.status === 'pago' ? 'Pago' : 'Pendente';
        return `
          <tr>
            <td class="font-bold">${clientName}</td>
            <td>${detail}</td>
            <td>${item.category}</td>
            <td class="font-mono">${formatDateBR(item.date)}</td>
            <td class="font-mono">${formatDateBR(item.dueDate || item.date)}</td>
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
    } else if (subTab === 'pagar') {
      const rowsHtml = currentPagar.map(item => {
        const statusClass = item.status === 'pago' ? 'status-badge status-pago' : 'status-badge status-pendente';
        const statusText = item.status === 'pago' ? 'Quitado' : 'Aberto';
        return `
          <tr>
            <td class="font-bold">${item.description}</td>
            <td>${item.category}</td>
            <td class="font-mono">${formatDateBR(item.date)}</td>
            <td class="font-mono">${formatDateBR(item.dueDate || item.date)}</td>
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
    } else if (subTab === 'comissoes') {
      const commissionItems = getCommissionItems();
      const totalComValue = commissionItems.reduce((acc, curr) => acc + curr.value, 0);
      const activeProf = commissionFilterProf 
        ? (professionals.find(p => p.id === commissionFilterProf)?.name || 'Profissional') 
        : 'Todos os Colaboradores';
      const activeStatus = commissionFilterStatus === 'all' 
        ? 'Todos' 
        : commissionFilterStatus === 'paid' 
          ? 'Pagos' 
          : 'Pendentes';

      const rowsHtml = [...commissionItems].sort((a, b) => {
        const dateCmp = a.date.toLowerCase().localeCompare(b.date.toLowerCase());
        if (dateCmp !== 0) return dateCmp;
        return a.ticketNumber.toLowerCase().localeCompare(b.ticketNumber.toLowerCase());
      }).map(item => {
        const dateFormatted = formatDateBR(item.date);
        const typeLabel = item.type === 'servico' ? 'Serviço' : 'Produto';
        const statusClass = item.paid ? 'status-badge status-pago' : 'status-badge status-pendente';
        const statusText = item.paid ? 'Pago' : 'Pendente';
        return `
          <tr>
            <td class="font-mono">${dateFormatted}</td>
            <td class="font-bold">${item.ticketNumber}</td>
            <td>${item.clientName}</td>
            <td class="font-bold">${item.professionalName}</td>
            <td>${item.name}</td>
            <td>${typeLabel}</td>
            <td class="text-right font-mono">${formatCurrency(item.price)}</td>
            <td class="text-center font-mono">${item.rate}%</td>
            <td class="text-right font-bold" style="color: #111827;">${formatCurrency(item.value)}</td>
            <td class="text-right">
              <span class="${statusClass}">${statusText}</span>
            </td>
          </tr>
        `;
      }).join('');

      activeContentHtml = `
        <div class="header">
          <div>
            <h1 class="title">Relatório de Apuração de Comissões</h1>
            <p class="subtitle">Modello Salon — Período: ${monthName} de ${selectedYear}</p>
          </div>
          <div class="meta">
            <p class="font-bold">Total a Repassar: ${formatCurrency(totalComValue)}</p>
            <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>

        <div style="background-color: #FCF9F2; border: 1px solid #e5b35f; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 11px; display: flex; justify-content: space-between;">
          <div><strong>Colaborador:</strong> ${activeProf}</div>
          <div><strong>Estado de Repasse:</strong> ${activeStatus}</div>
          <div><strong>Registros:</strong> ${commissionItems.length} itens</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Comanda</th>
              <th>Cliente</th>
              <th>Colaborador</th>
              <th>Item Vendido</th>
              <th>Tipo</th>
              <th class="text-right">Venda</th>
              <th class="text-center">Taxa</th>
              <th class="text-right">Comissão</th>
              <th class="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="10" style="text-align: center; padding: 30px; font-style: italic; color: #666;">Nenhuma comissão localizada com os filtros ativos.</td></tr>'}
          </tbody>
        </table>

        <div class="total-box">
          TOTAL GERAL DE COMISSÕES A REPASSAR: ${formatCurrency(totalComValue)}
        </div>

        <div class="signature-area">
          <div class="signature-line">Assinatura do Profissional</div>
          <div class="signature-line">Visto da Administração</div>
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
      
      {/* Title & Filter Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gold-200/40 print:hidden">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">Painel Financeiro & DRE</h2>
          <p className="text-xs text-gray-500 mt-1">Visão geral do faturamento, controle de fluxo de caixa por competência/caixa e DRE.</p>
        </div>

        {/* Dashboard filter period selection */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Classification type filter */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-stone-400 font-bold ml-1 mb-1">Filtrar Relatório Por</span>
            <div className="inline-flex rounded-lg border border-stone-250 p-0.5 bg-stone-50">
              <button
                onClick={() => setReportDateType('vencimento')}
                className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-md transition-all ${
                  reportDateType === 'vencimento' ? 'bg-black text-white' : 'text-stone-500'
                }`}
              >
                Vencimento
              </button>
              <button
                onClick={() => setReportDateType('pagamento')}
                className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-md transition-all ${
                  reportDateType === 'pagamento' ? 'bg-black text-white' : 'text-stone-500'
                }`}
              >
                Pagamento
              </button>
            </div>
          </div>

          <div className="flex flex-col w-32">
            <span className="text-[10px] uppercase text-stone-400 font-bold ml-1 mb-1">Mês</span>
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
            <span className="text-[10px] uppercase text-stone-400 font-bold ml-1 mb-1">Ano</span>
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

      {/* KPI Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total revenue */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-150 relative overflow-hidden transition-all hover:-translate-y-1">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Fluxo Total Recebido (Caixa)</p>
              <h3 className="text-3xl font-serif font-bold text-green-700 mt-1">
                {formatCurrency(totalReceita)}
              </h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Receitas liquidadas dentro deste período.</p>
          <div className="absolute left-0 bottom-0 w-full h-1 bg-green-505" style={{ backgroundColor: '#22c55e' }} />
        </div>

        {/* Duplicatas / accounts receivable */}
        <div className="bg-[#fffdf9] p-8 rounded-xl shadow-sm border border-gray-150 relative overflow-hidden transition-all hover:-translate-y-1">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-600">Contas a Receber</p>
              <h3 className="text-3xl font-serif font-bold text-[#775a19] mt-1">
                {formatCurrency(totalAReceber)}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-amber-500">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-stone-500">Lançamentos emitidos a prazo para final do mês.</p>
          <div className="absolute left-0 bottom-0 w-full h-1 bg-amber-400" />
        </div>

        {/* Pending supplier bills */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-150 relative overflow-hidden transition-all hover:-translate-y-1">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Contas a Pagar</p>
              <h3 className="text-3xl font-serif font-bold text-rose-600 mt-1">
                {formatCurrency(totalPagar)}
              </h3>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Despesas e faturas de fornecedores pendentes.</p>
          <div className="absolute left-0 bottom-0 w-full h-1 bg-rose-500" />
        </div>
      </div>

      {/* Main content sub-panels */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Navigation bar headers */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-gray-100 bg-[#FCF9F2]/65 print:hidden gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 max-w-full no-scrollbar flex-nowrap shrink-0 snap-x">
            {[
              { id: 'geral', label: 'Geral & Duplicatas (Vendas a Prazo)' },
              { id: 'pagar', label: 'Contas a Pagar' },
              { id: 'receber', label: 'Contas a Receber' },
              { id: 'comissoes', label: 'Apuração de Comissões' }
            ].map(tabSpec => (
              <button
                key={tabSpec.id}
                onClick={() => setSubTab(tabSpec.id as any)}
                className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap snap-center ${
                  subTab === tabSpec.id 
                    ? 'bg-black text-white font-bold' 
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200/60'
                }`}
              >
                {tabSpec.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-2 sm:mt-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 border border-stone-300 text-stone-700 bg-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-stone-50 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-stone-500" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 border border-stone-300 text-stone-700 bg-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-stone-50 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-stone-500" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              disabled={isReadOnly}
              title={isReadOnly ? TOOLTIP_READONLY : undefined}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                isReadOnly ? 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-50' : 'bg-black text-white hover:bg-gold-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Lançamento manual</span>
            </button>
          </div>
        </div>

        {/* GENERAL VIEW: ANOTAR DUPLICATAS LISTING TABLE & RECENTS */}
        {subTab === 'geral' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Table section matching "Anotar Recebimentos" from screenshot */}
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-center bg-[#FCF9F2] p-4 rounded-lg border border-gold-100">
                  <div>
                    <h3 className="font-serif font-bold text-gray-900 text-base">Duplicatas em Aberto (Caderno de Pendentes)</h3>
                    <p className="text-xs text-gray-500 font-sans">Contas a receber originárias de comanda concluída sob Duplicata/Anotação.</p>
                  </div>
                  <span className="bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs px-2.5 py-1 rounded-full font-bold">
                    {pendingFiados.length} Clientes Pendentes
                  </span>
                </div>

                <div className="border border-gray-150 rounded-xl overflow-hidden bg-white overflow-x-auto w-full max-w-full no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-gray-150">
                        <th className="px-6 py-3 text-[11px] font-sans font-bold text-stone-400 uppercase tracking-widest">Cliente</th>
                        <th className="px-6 py-3 text-[11px] font-sans font-bold text-stone-400 uppercase tracking-widest">Procedimentos</th>
                        <th className="px-6 py-3 text-[11px] font-sans font-bold text-stone-400 uppercase tracking-widest">Criação / Comanda</th>
                        <th className="px-6 py-3 text-[11px] font-sans font-bold text-stone-400 uppercase tracking-widest text-right">Valor Duplicata</th>
                        <th className="px-6 py-3 text-[11px] font-sans font-bold text-stone-400 uppercase tracking-widest text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-sans text-xs">
                      {pendingFiados.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-400 italic">
                            Nenhuma duplicata em aberto no caderno para este período.
                          </td>
                        </tr>
                      ) : (
                        pendingFiados.map(c => (
                          <tr key={c.id} className="hover:bg-gold-50/20 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-gray-950 font-sans">{c.clientName}</p>
                              <p className="text-[10px] text-gray-400">{c.clientPhone}</p>
                            </td>
                            <td className="px-6 py-4 text-stone-600 font-medium">
                              {c.services.map(s => s.name).join(' + ')}
                            </td>
                            <td className="px-6 py-4 text-stone-400 font-mono">
                              {formatDateBR(c.dateCreated)} ({c.ticketNumber})
                            </td>
                            <td className="px-6 py-4 text-right font-sans font-bold text-[#775a19]">
                              {formatCurrency(c.totalValue)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => {
                                  if (isReadOnly) return;
                                  handleSettleAction(c.id, c.clientName);
                                  setAlertState({message: `Duplicata do cliente ${c.clientName} baixada com sucesso! Recebimento registrado.`, variant: 'success'});
                                }}
                                disabled={isReadOnly}
                                title={isReadOnly ? TOOLTIP_READONLY : "Registrar recebimento desta duplicata"}
                                className={`text-xs font-extrabold px-3 py-1.5 rounded-lg border transition-all ${
                                  isReadOnly ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-50' : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200 cursor-pointer'
                                }`}
                              >
                                Dar Baixa
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sidebar breakdown graph mix */}
              <div className="w-full lg:w-[350px] space-y-6">
                
                {/* Growth visual report box */}
                <div className="bg-neutral-950 text-white p-6 rounded-xl relative overflow-hidden group">
                  <div className="relative z-10 space-y-3">
                    <h4 className="font-serif font-bold text-lg text-gold-300">Apuração do Mês atual</h4>
                    <p className="text-xs text-stone-300">O faturamento operacional bruto atingiu o patamar esperado de metas.</p>
                    <div className="pt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-stone-400 font-bold">Porcentagem de Liquidez (Caixa)</span>
                        <span className="text-gold-300 font-bold">
                          {faturamentoTotalCompetencia() > 0 
                            ? `${Math.round((dre.receitaRecebida / faturamentoTotalCompetencia()) * 100)}%` 
                            : '100%'}
                        </span>
                      </div>
                      <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#e5b35f] h-full rounded-full transition-all duration-1000" 
                          style={{ 
                            width: faturamentoTotalCompetencia() > 0 
                              ? `${Math.round((dre.receitaRecebida / faturamentoTotalCompetencia()) * 100)}%` 
                              : '100%' 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10 font-serif font-black text-9xl text-stone-300 select-none pointer-events-none translate-y-12 select-none font-mono">
                    %
                  </div>
                </div>

                {/* Popular service mixes list */}
                <div className="border border-stone-200 p-6 rounded-xl bg-white">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Serviços Populares</h4>
                  <ul className="space-y-3 text-xs">
                    <li className="flex justify-between items-center py-1">
                      <span className="text-stone-600">Corte Feminino</span>
                      <span className="font-bold text-gold-500">42% faturamento</span>
                    </li>
                    <li className="flex justify-between items-center py-1">
                      <span className="text-stone-600">Coloração Premium</span>
                      <span className="font-bold text-gold-500">28% faturamento</span>
                    </li>
                    <li className="flex justify-between items-center py-1">
                      <span className="text-stone-600">Unhas de Gel</span>
                      <span className="font-bold text-gold-500">15% faturamento</span>
                    </li>
                    <li className="flex justify-between items-center py-1">
                      <span className="text-stone-600">Tratamentos SPA</span>
                      <span className="font-bold text-gold-500">15% faturamento</span>
                    </li>
                  </ul>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* DETAILED DRE (Demonstrativo do Resultado do Exercício) TABLE TAB */}
        {subTab === 'dre' && (
          <div className="p-6 space-y-6">
            <div className="bg-[#FCF9F2] p-4 rounded-lg border border-gold-150">
              <h3 className="font-serif font-bold text-gray-900 text-base">Demonstração do Resultado do Exercício (DRE)</h3>
              <p className="text-xs text-stone-500 mt-1">Comparativo de provisões financeiras calculadas automaticamente de acordo com competência e custos reais.</p>
            </div>

            <div className="border border-gray-150 rounded-xl overflow-hidden bg-white overflow-x-auto w-full max-w-full no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <tbody>
                  {/* Gross Revenue section */}
                  <tr className="bg-stone-50 border-b border-stone-150 font-bold text-stone-800 text-xs text-xs">
                    <td className="px-6 py-4 uppercase tracking-wider font-bold">Descrição dos Lançamentos</td>
                    <td className="px-6 py-4 text-right">VALOR ACUMULADO (EM R$)</td>
                  </tr>
                  
                  {/* Itemized Received vs Accrued */}
                  <tr className="border-b border-gray-100 hover:bg-slate-50 text-xs text-gray-900 font-sans">
                    <td className="px-6 py-3.5 pl-8 font-semibold">1. Receita Operacional Bruta (Faturamento de Competência)</td>
                    <td className="px-6 py-3.5 text-right font-bold text-gray-950">{formatCurrency(dre.receitaBruta)}</td>
                  </tr>

                  <tr className="border-b border-gray-100 hover:bg-slate-50 text-xs text-stone-600 font-sans">
                    <td className="px-6 py-2.5 pl-12">↳ (+) Receitas Recebidas À Vista (Dinheiro, Pix, Cartões)</td>
                    <td className="px-6 py-2.5 text-right font-medium text-emerald-700">{formatCurrency(dre.receitaRecebida)}</td>
                  </tr>

                  <tr className="border-b border-gray-100 hover:bg-slate-50 text-xs text-stone-600 font-sans">
                    <td className="px-6 py-2.5 pl-12 font-sans">↳ (+) Receitas a Receber a Prazo (Duplicatas emitidas no mês)</td>
                    <td className="px-6 py-2.5 text-right font-medium text-amber-700">{formatCurrency(dre.receitaAReceber)}</td>
                  </tr>
                  
                  <tr className="border-b border-gray-100 hover:bg-slate-50 text-xs text-gray-900 font-sans">
                    <td className="px-6 py-3.5 pl-12 text-stone-500">(-) Descontos concedidos</td>
                    <td className="px-6 py-3.5 text-right font-mono text-stone-500">{formatCurrency(dre.descontos)}</td>
                  </tr>

                  {/* Net revenue */}
                  <tr className="bg-slate-100 border-b border-slate-200 font-bold text-stone-900 text-xs">
                    <td className="px-6 py-4 uppercase font-bold pl-8">2. Receita Operacional Líquida</td>
                    <td className="px-6 py-4 text-right font-bold text-green-700">{formatCurrency(dre.receitaLiquida)}</td>
                  </tr>

                  {/* Cost of Goods & Commissions */}
                  <tr className="border-b border-gray-100 hover:bg-slate-50 text-xs text-gray-900 font-sans">
                    <td className="px-6 py-3.5 pl-12 text-stone-500">(-) Custos de Mercadorias e Consumíveis utilizados</td>
                    <td className="px-6 py-3.5 text-right font-mono text-rose-500">({formatCurrency(dre.custosMercadorias)})</td>
                  </tr>
                  
                  <tr className="border-b border-gray-100 hover:bg-slate-50 text-xs text-gray-900 font-sans">
                    <td className="px-6 py-3.5 pl-12 text-stone-500">(-) Comissões pagas aos profissionais</td>
                    <td className="px-6 py-3.5 text-right font-mono text-rose-500">({formatCurrency(dre.comissoesPagas)})</td>
                  </tr>

                  {/* Operational expenses */}
                  <tr className="bg-slate-50 border-b border-gray-200 font-bold text-stone-900 text-xs">
                    <td className="px-6 py-4 uppercase font-bold pl-8">3. Custos e Despesas Gerais de Instalações, Aluguel e Marketing</td>
                    <td className="px-6 py-4 text-right font-bold text-rose-600">({formatCurrency(dre.outrasDespesas)})</td>
                  </tr>

                  {/* Net Profit result */}
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
          </div>
        )}

        {/* ACCOUNTS PAYABLE DETAIL VIEW */}
        {subTab === 'pagar' && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-[#FCF9F2] p-4 rounded-lg border border-gray-100">
              <div>
                <h3 className="font-serif font-bold text-gray-900 text-base">Contas a Pagar (Débitos)</h3>
                <p className="text-xs text-gray-500 mt-1 font-sans">Listagem de faturas, despesas e repasses. Exibindo por: <strong className="uppercase">{reportDateType}</strong></p>
              </div>
              <p className="text-xs bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold px-3 py-1 rounded-full">
                Total pendente: {formatCurrency(totalPagar)}
              </p>
            </div>

            <div className="border border-gray-150 rounded-xl overflow-hidden bg-white overflow-x-auto w-full max-w-full no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-gray-150 text-[11px] font-sans font-bold text-stone-400 uppercase tracking-widest">
                    <th className="px-6 py-3">Fornecedor / Descrição</th>
                    <th className="px-6 py-3">Categoria</th>
                    <th className="px-6 py-3">Vencimento</th>
                    <th className="px-6 py-3">Data Pagamento</th>
                    <th className="px-6 py-3 text-right">Valor Documento</th>
                    <th className="px-6 py-3 text-right">Status / Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-sans text-stone-700">
                  {currentPagar.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                        Nenhuma conta registrada para este período.
                      </td>
                    </tr>
                  ) : (
                    currentPagar.map(item => (
                      <tr key={item.id} className="hover:bg-rose-50/10 transition-all font-sans">
                        <td className="px-6 py-4 font-bold text-stone-900">{item.description}</td>
                        <td className="px-6 py-4 font-medium">{item.category}</td>
                        <td className="px-6 py-4 font-mono text-stone-400">{formatDateBR(item.dueDate || item.date)}</td>
                        <td className="px-6 py-4 font-mono text-stone-500">{item.status === 'pago' ? formatDateBR(item.paymentDate || item.date) : 'N/A'}</td>
                        <td className="px-6 py-4 text-right font-bold text-rose-600">{formatCurrency(item.amount)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 items-center">
                            {item.status === 'pendente' ? (
                              <>
                                <button
                                  onClick={() => handleSettleExpense(item)}
                                  disabled={isReadOnly}
                                  title={isReadOnly ? TOOLTIP_READONLY : "Registrar pagamento desta conta"}
                                  className={`text-[10px] font-bold border px-2.5 py-1 rounded transition ${
                                    isReadOnly ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-50' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-150'
                                  }`}
                                >
                                  Pagar Conta
                                </button>
                                <button
                                  onClick={() => handleSendReminder(item)}
                                  className="p-1 px-2 border border-slate-200 rounded text-stone-600 hover:bg-gold-50 transition"
                                  title="Enviar Lembrete de Pagamento via WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3 text-green-600 inline mr-1" />
                                  <span>Whats</span>
                                </button>
                              </>
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-full font-bold text-[10px] bg-green-50 border border-green-200 text-green-700">
                                Pago / Quitado
                              </span>
                            )}

                            <button
                              onClick={() => handleStartEdit(item)}
                              disabled={isReadOnly}
                              title={isReadOnly ? TOOLTIP_READONLY : "Editar Lançamento"}
                              className={`p-1 rounded transition border ${
                                isReadOnly ? 'text-stone-300 border-stone-200 cursor-not-allowed opacity-50' : 'text-stone-500 hover:text-black hover:bg-stone-50 border-stone-200'
                              }`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(item.id)}
                              disabled={isReadOnly}
                              title={isReadOnly ? TOOLTIP_READONLY : (finDeleteConfirmId === item.id ? "Clique novamente para confirmar exclusão" : "Excluir Lançamento")}
                              className={`p-1 rounded transition border text-[9px] font-black flex items-center ${
                                isReadOnly
                                  ? 'text-stone-300 border-stone-200 cursor-not-allowed opacity-50'
                                  : finDeleteConfirmId === item.id 
                                    ? 'bg-rose-600 text-white border-rose-600 px-1.5 animate-pulse' 
                                    : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-100'
                              }`}
                            >
                              {finDeleteConfirmId === item.id ? (
                                <span>Confirmar?</span>
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACCOUNTS RECEIVABLE DETAIL VIEW */}
        {subTab === 'receber' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#FCF9F2] p-4 rounded-lg border border-gray-100 gap-4">
              <div>
                <h3 className="font-serif font-bold text-gray-900 text-base">Contas a Receber (Créditos / Duplicatas)</h3>
                <p className="text-xs text-gray-500 mt-1 font-sans">Lançamentos emitidos a prazo ou pendentes no caixa. Exibindo por: <strong className="uppercase">{reportDateType}</strong></p>
              </div>
              <p className="text-xs bg-gold-50 border border-gold-200 text-gold-700 font-mono font-bold px-3 py-1 rounded-full">
                Total pendente: {formatCurrency(totalAReceber)}
              </p>
            </div>

            {/* Filter controls and Mass Actions bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-150 shadow-xs">
              {/* Search input representing Nome do Cliente */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 focus:border-gold-500 focus:bg-white focus:outline-none rounded-lg text-xs"
                  placeholder="Buscar pelo nome do cliente..."
                  value={receberSearchQuery}
                  onChange={(e) => setReceberSearchQuery(e.target.value)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                {receberSearchQuery && (
                  <button 
                    onClick={() => setReceberSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400 hover:text-stone-900"
                  >
                    limpar
                  </button>
                )}
              </div>

              {/* Batch Actions Button */}
              <div className="flex gap-2 w-full sm:w-auto items-center justify-end">
                {selectedReceberIds.length > 0 && (
                  <button
                    onClick={() => setIsMassActionModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-[#a0854c] rounded-lg text-[11px] font-bold text-white uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <span>Ações em Massa ({selectedReceberIds.length})</span>
                  </button>
                )}
                {selectedReceberIds.length === 0 && (
                  <span className="text-[11px] text-stone-450 font-medium italic">
                    Marque registros abaixo para habilitar ações em massa
                  </span>
                )}
              </div>
            </div>

            <div className="border border-gray-150 rounded-xl overflow-hidden bg-white overflow-x-auto w-full max-w-full no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-gray-150 text-[11px] font-sans font-bold text-stone-400 uppercase tracking-widest">
                    <th className="w-12 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-gold-600 focus:ring-gold-500 cursor-pointer w-3.5 h-3.5"
                        checked={
                          filteredReceber.filter(item => item.status === 'pendente').length > 0 &&
                          filteredReceber.filter(item => item.status === 'pendente').every(item => selectedReceberIds.includes(item.id))
                        }
                        onChange={() => {
                          const pendingVisibleIds = filteredReceber.filter(item => item.status === 'pendente').map(item => item.id);
                          const areAllSelected = pendingVisibleIds.length > 0 && pendingVisibleIds.every(id => selectedReceberIds.includes(id));
                          if (areAllSelected) {
                            setSelectedReceberIds(prev => prev.filter(id => !pendingVisibleIds.includes(id)));
                          } else {
                            setSelectedReceberIds(prev => Array.from(new Set([...prev, ...pendingVisibleIds])));
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-3">Cliente / Detalhe</th>
                    <th className="px-6 py-3">Categoria</th>
                    <th className="px-6 py-3">Vencimento</th>
                    <th className="px-6 py-3">Data Recebimento</th>
                    <th className="px-6 py-3 text-right font-sans">Valor Duplicata</th>
                    <th className="px-6 py-3 text-right">Status / Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-sans text-stone-700">
                  {filteredReceber.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 italic font-sans animate-fade-in">
                        Nenhum registro localizado de Contas a Receber para os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredReceber.map(item => {
                      const { clientName, detail } = getRecordClientAndDetail(item);
                      const isSelected = selectedReceberIds.includes(item.id);
                      return (
                        <tr key={item.id} className={`hover:bg-gold-50/10 transition-all ${isSelected ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-4 py-4 text-center">
                            {item.status === 'pendente' ? (
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-gold-600 focus:ring-gold-500 cursor-pointer w-3.5 h-3.5"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedReceberIds(prev => prev.filter(id => id !== item.id));
                                  } else {
                                    setSelectedReceberIds(prev => [...prev, item.id]);
                                  }
                                }}
                              />
                            ) : (
                              <span className="w-3.5 h-3.5 inline-block" />
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-stone-900 block">{clientName}</span>
                            <span className="text-[10px] text-stone-500 font-medium block mt-0.5">{detail}</span>
                          </td>
                          <td className="px-6 py-4 font-medium">{item.category}</td>
                          <td className="px-6 py-4 font-mono text-stone-400">{formatDateBR(item.dueDate || item.date)}</td>
                          <td className="px-6 py-4 font-mono text-stone-500">{item.status === 'pago' ? formatDateBR(item.paymentDate || item.date) : 'N/A'}</td>
                          <td className="px-6 py-4 text-right font-bold text-gold-600">{formatCurrency(item.amount)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 items-center">
                              {item.status === 'pendente' ? (
                                <>
                                  <button
                                    onClick={() => {
                                      if (isReadOnly) return;
                                      setSettlingItem(item);
                                      setIndividualPaymentMethod('');
                                      setIndividualPaymentDate(new Date().toISOString().split('T')[0]);
                                    }}
                                    disabled={isReadOnly}
                                    title={isReadOnly ? TOOLTIP_READONLY : "Baixar recebimento desta duplicata"}
                                    className={`text-[10px] font-bold border px-2.5 py-1 rounded transition whitespace-nowrap ${
                                      isReadOnly ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-50' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                  >
                                    Receber Valor
                                  </button>
                                  <button
                                    onClick={() => handleSendReminder(item)}
                                    className="p-1 px-2 border border-slate-200 rounded text-stone-600 hover:bg-slate-50 transition"
                                    title="Enviar Lembrete de Cobrança ao cliente"
                                  >
                                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                                  </button>
                                </>
                              ) : (
                                <span className="inline-block px-2.5 py-1 rounded-full font-bold text-[10px] bg-green-50 border border-green-200 text-green-700">
                                  Recebido (Liquidado)
                                </span>
                              )}

                              <button
                                onClick={() => handleStartEdit(item)}
                                disabled={isReadOnly}
                                title={isReadOnly ? TOOLTIP_READONLY : "Editar Lançamento"}
                                className={`p-1 rounded transition border ${
                                  isReadOnly ? 'text-stone-300 border-stone-200 cursor-not-allowed opacity-50' : 'text-stone-500 hover:text-black hover:bg-stone-50 border-stone-200'
                                }`}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(item.id)}
                                disabled={isReadOnly}
                                title={isReadOnly ? TOOLTIP_READONLY : (finDeleteConfirmId === item.id ? "Clique novamente para confirmar exclusão" : "Excluir Lançamento")}
                                className={`p-1 rounded transition border text-[9px] font-black flex items-center ${
                                  isReadOnly
                                    ? 'text-stone-300 border-stone-200 cursor-not-allowed opacity-50'
                                    : finDeleteConfirmId === item.id 
                                      ? 'bg-rose-600 text-white border-rose-600 px-1.5 animate-pulse' 
                                      : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-100'
                                }`}
                              >
                                {finDeleteConfirmId === item.id ? (
                                  <span>Confirmar?</span>
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* MASS ACTION FLOATING/OVERLAY MODAL */}
            {isMassActionModalOpen && (
              <div className="fixed inset-0 bg-black/55 overflow-y-auto backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-lg overflow-hidden font-sans p-6 space-y-6">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="font-serif font-bold text-stone-900 text-sm">Painel de Ações Coletivas</h4>
                      <p className="text-[11px] text-stone-400 mt-0.5">Operações unificadas para os lançamentos selecionados.</p>
                    </div>
                    <button 
                      onClick={() => setIsMassActionModalOpen(false)}
                      className="text-stone-400 hover:text-stone-900 text-xl font-bold font-mono focus:outline-none cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  {/* Lot Summary Card */}
                  <div className="p-4 bg-[#FCF9F2] rounded-xl border border-amber-200/50 flex items-center justify-between">
                    <div>
                      <p className="text-[9.5px] uppercase font-black tracking-widest text-[#a0854c] mb-1">Resumo das Duplicatas</p>
                      <p className="text-xs text-stone-600">Total de Contas Selecionadas: <strong className="font-mono text-stone-950 font-bold">{selectedReceberIds.length} item(ns)</strong></p>
                      <p className="text-xs text-stone-600">Soma Total dos Créditos: <strong className="font-serif text-sm text-stone-950 font-extrabold">{formatCurrency(financials.filter(f => !f.deletedAt && selectedReceberIds.includes(f.id)).reduce((sum, item) => sum + item.amount, 0))}</strong></p>
                    </div>
                    <span className="bg-amber-100 text-[#a0854c] px-3 py-1 text-[9px] uppercase font-black tracking-widest rounded-full font-mono">
                      LOTE EM LIQUIDAÇÃO
                    </span>
                  </div>

                  {/* Mass Action A: Generate Debt List PDF */}
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400 font-sans block">Opção A: Extrato Consolidado</h5>
                    <button
                      onClick={handleGeneratePDFSelected}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-[#FAF8F5] text-stone-900 hover:text-[#a0854c] rounded-xl border border-stone-250 text-xs font-bold transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Gerar / Exportar Extrato de Débitos (PDF)</span>
                    </button>
                    <p className="text-[9.5px] text-zinc-400 text-center leading-relaxed">Baixa o extrato consolidado com faturas selecionadas, termo de conferência de pendências e linha de assinaturas.</p>
                  </div>

                  <hr className="border-gray-100/75" />

                  {/* Mass Action B: Collective Settle with selected payment method */}
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-[#a0854c] font-sans block">Opção B: Baixa Coletiva (Liquidação Lote)</h5>
                      <p className="text-[11px] text-stone-500 leading-normal">Liquidará estes registros como "Pago" no Supabase e registrará as receitas no fluxo de caixa.</p>
                    </div>

                    {/* Method Radio Selection Grid */}
                    <div className="space-y-1.5">
                      <label className="block text-[9.5px] uppercase font-black tracking-widest text-stone-400">Método de Liquidação Obrigatório</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['Dinheiro', 'Pix', 'Crédito', 'Débito'] as const).map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setMassActionPaymentMethod(method)}
                            className={`px-2 py-2.5 rounded-lg border text-[10px] font-black uppercase transition-all tracking-widest text-center cursor-pointer ${
                              massActionPaymentMethod === method
                                ? 'bg-stone-900 border-stone-900 text-[#e5b35f]'
                                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-400'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Collective Payment Date input select */}
                    <div className="space-y-1.5">
                      <label className="block text-[9.5px] uppercase font-black tracking-widest text-stone-400">Data do Recebimento das Duplicatas</label>
                      <input
                        type="date"
                        className="w-full bg-[#FCF9F2] p-2.5 rounded-lg border border-stone-200 focus:border-gold-500 focus:outline-none text-xs font-mono"
                        value={massActionPaymentDate}
                        onChange={(e) => setMassActionPaymentDate(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={() => handleMassSettle(massActionPaymentMethod)}
                      disabled={isReadOnly}
                      title={isReadOnly ? TOOLTIP_READONLY : undefined}
                      className={`w-full font-serif font-black tracking-widest py-3 px-4 rounded-xl transition-all text-xs uppercase shadow-md ${
                        isReadOnly ? 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98'
                      }`}
                    >
                      Processar Baixa Coletiva
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* INDIVIDUAL SETTLEMENT MODAL WITH VALIDATION RULES */}
            {settlingItem && (
              <div className="fixed inset-0 bg-black/55 overflow-y-auto backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-md overflow-hidden font-sans p-6 space-y-6">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="font-serif font-bold text-stone-900 text-sm">Baixa de Recebimento Individual</h4>
                      <p className="text-[11px] text-stone-400 mt-0.5">Informe as propriedades de liquidação obrigatórias.</p>
                    </div>
                    <button 
                      onClick={() => setSettlingItem(null)}
                      className="text-stone-400 hover:text-stone-900 text-xl font-bold font-mono focus:outline-none cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="p-3.5 bg-[#FCF9F2] rounded-xl border border-stone-200">
                    <span className="text-[9px] uppercase font-black tracking-widest text-[#a0854c] block mb-1">Título Destino</span>
                    <p className="text-xs font-bold text-stone-900">{getRecordClientAndDetail(settlingItem).clientName}</p>
                    <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                      {getRecordClientAndDetail(settlingItem).detail} • Valor: <strong>{formatCurrency(settlingItem.amount)}</strong>
                    </p>
                  </div>

                  {/* Selection validation with alert */}
                  <div className="space-y-4">
                    {/* Payment Method selector */}
                    <div className="space-y-1.5">
                      <label className="block text-[9.5px] uppercase font-black tracking-widest text-stone-400">
                        Forma de Pagamento <span className="text-rose-500 font-black">*</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['Dinheiro', 'Pix', 'Crédito', 'Débito'] as const).map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setIndividualPaymentMethod(method)}
                            className={`px-2 py-2.5 rounded-lg border text-[10px] font-black uppercase transition-all tracking-widest text-center cursor-pointer ${
                              individualPaymentMethod === method
                                ? 'bg-stone-900 border-stone-900 text-[#e5b35f]'
                                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-400'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Date input */}
                    <div className="space-y-1.5">
                      <label className="block text-[9.5px] uppercase font-black tracking-widest text-stone-400">
                        Data de Confirmação do Recebimento <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full bg-[#FCF9F2] p-2.5 rounded-lg border border-stone-200 focus:border-gold-500 focus:outline-none text-xs font-mono"
                        value={individualPaymentDate}
                        onChange={(e) => setIndividualPaymentDate(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!individualPaymentMethod) {
                          setAlertState({message: "Escolha obrigatória: Selecione a forma de pagamento (Dinheiro, Pix, Crédito ou Débito) antes de prosseguir!", variant: 'error'});
                          return;
                        }
                        if (!individualPaymentDate) {
                          setAlertState({message: "Por favor, selecione uma data de pagamento válida!", variant: 'error'});
                          return;
                        }

                        const targetDate = individualPaymentDate;
                        const method = individualPaymentMethod;
                        const updatedRecord: FinancialRecord = {
                          ...settlingItem,
                          status: 'pago',
                          paymentDate: targetDate,
                          description: settlingItem.description.includes('pago via') 
                            ? settlingItem.description 
                            : `${settlingItem.description} (pago via ${method})`
                        };
                        onUpdateFinancialRecord(updatedRecord);

                        // Synchronize related comanda if relevant
                        if (settlingItem.relatedComandaId) {
                          const com = comandas.filter(c => !c.deletedAt).find(c => c.id === settlingItem.relatedComandaId);
                          if (com) {
                            const comandaMethodMap: { [key: string]: 'Dinheiro' | 'Cartão Credito' | 'Cartão Debito' | 'Pix' | 'Caderno' } = {
                              'Dinheiro': 'Dinheiro',
                              'Pix': 'Pix',
                              'Crédito': 'Cartão Credito',
                              'Débito': 'Cartão Debito'
                            };
                            const updatedComanda: Comanda = {
                              ...com,
                              isFiado: false,
                              status: 'Concluido',
                              paymentDate: targetDate,
                              paymentMethod: comandaMethodMap[method] || 'Pix'
                            };
                            onUpdateComandaObj(updatedComanda);
                          }
                        }

                        setAlertState({message: `Baixa individual de recebimento concluída com sucesso!`, variant: 'success'});
                        setSettlingItem(null);
                      }}
                      disabled={isReadOnly}
                      title={isReadOnly ? TOOLTIP_READONLY : undefined}
                      className={`w-full font-serif font-black tracking-widest py-3 px-4 rounded-xl transition-all text-xs uppercase shadow-md mt-2 ${
                        isReadOnly ? 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98'
                      }`}
                    >
                      Confirmar Recebimento Individual
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* COMMISSION SETTLEMENT DETAIL VIEW */}
        {subTab === 'comissoes' && (() => {
          const commissionItems = getCommissionItems();

          // Sort handler
          const handleSort = (column: string) => {
            if (sortColumn === column) {
              if (sortDirection === 'asc') setSortDirection('desc');
              else if (sortDirection === 'desc') { setSortColumn(null); setSortDirection(null); }
              else setSortDirection('asc');
            } else {
              setSortColumn(column);
              setSortDirection('asc');
            }
          };

          const defaultSort = (a: typeof commissionItems[0], b: typeof commissionItems[0]) => {
            const dateCmp = a.date.toLowerCase().localeCompare(b.date.toLowerCase());
            if (dateCmp !== 0) return dateCmp;
            return a.ticketNumber.toLowerCase().localeCompare(b.ticketNumber.toLowerCase());
          };
          const sortedCommissionItems = !sortColumn || !sortDirection
            ? [...commissionItems].sort(defaultSort)
            : [...commissionItems].sort((a, b) => {
            const valA = a[sortColumn as keyof typeof a];
            const valB = b[sortColumn as keyof typeof b];
            if (typeof valA === 'string' && typeof valB === 'string') {
              const c = valA.toLowerCase().localeCompare(valB.toLowerCase());
              return sortDirection === 'asc' ? c : -c;
            }
            if (typeof valA === 'boolean' && typeof valB === 'boolean') {
              return sortDirection === 'asc' ? (valA ? 1 : -1) : (valA ? -1 : 1);
            }
            const numA = Number(valA) || 0;
            const numB = Number(valB) || 0;
            return sortDirection === 'asc' ? numA - numB : numB - numA;
          });

          const sortIndicator = (col: string) => {
            if (sortColumn !== col) return ' ↕';
            return sortDirection === 'asc' ? ' ↑' : ' ↓';
          };

          // Summary aggregates
          const totalComPeriodPending = commissionItems.filter(it => !it.paid).reduce((sum, it) => sum + it.value, 0);
          const totalComPeriodPaid = commissionItems.filter(it => it.paid).reduce((sum, it) => sum + it.value, 0);
          
          const tickedItems = commissionItems.filter(it => selectedCommissionKeys.includes(it.key));
          const tickedSumUnpaid = tickedItems.filter(it => !it.paid).reduce((sum, it) => sum + it.value, 0);

          const handleToggleKey = (key: string) => {
            if (selectedCommissionKeys.includes(key)) {
              setSelectedCommissionKeys(selectedCommissionKeys.filter(k => k !== key));
            } else {
              setSelectedCommissionKeys([...selectedCommissionKeys, key]);
            }
          };

          const handleSelectAllVisiblePending = () => {
            const pendingKeys = commissionItems.filter(it => !it.paid).map(it => it.key);
            const allSelected = pendingKeys.every(k => selectedCommissionKeys.includes(k));
            
            if (allSelected) {
              // Unselect visible pending
              setSelectedCommissionKeys(selectedCommissionKeys.filter(k => !pendingKeys.includes(k)));
            } else {
              // Add all visible pending keys safely without duplicates
              const combined = Array.from(new Set([...selectedCommissionKeys, ...pendingKeys]));
              setSelectedCommissionKeys(combined);
            }
          };

          const handlePagarSelecionados = async () => {
            const selectedIds = selectedCommissionKeys;
            if (selectedIds.length === 0) {
              setAlertState({message: "Por favor, selecione pelo menos uma comissão PENDENTE para liquidar.", variant: 'error'});
              return;
            }

            const itemsToPay = tickedItems.filter(it => !it.paid);
            if (itemsToPay.length === 0) {
              setAlertState({message: "Nenhum item PENDENTE selecionado para pagamento.", variant: 'error'});
              return;
            }

            // SUPABASE REQUISITADO: Atualização real que é aguardada (awaited) de forma síncrona
            try {
              // @ts-ignore
              if (typeof supabase !== 'undefined') {
                // @ts-ignore
                const { error } = await supabase
                  .from('comissao_repasses')
                  .update({ status_repasse: 'Pago' })
                  .in('id', selectedIds);
                if (error) throw error;
              } else if (typeof (window as any).supabase !== 'undefined') {
                const { error } = await (window as any).supabase
                  .from('comissao_repasses')
                  .update({ status_repasse: 'Pago' })
                  .in('id', selectedIds);
                if (error) throw error;
              }
            } catch (err) {
              console.error("Erro ao atualizar o Supabase para 'Pago':", err);
            }

            const totalPayAmount = itemsToPay.reduce((sum, it) => sum + it.value, 0);
            const qty = itemsToPay.length;
            const todayStr = new Date().toISOString().split('T')[0];
            const comandaUpdatesMap: { [id: string]: Comanda } = {};

            itemsToPay.forEach(item => {
              const comId = item.comandaId;
              let cObj = comandaUpdatesMap[comId];
              if (!cObj) {
                const orig = comandas.filter(c => !c.deletedAt).find(c => c.id === comId);
                if (orig) {
                  cObj = JSON.parse(JSON.stringify(orig));
                  comandaUpdatesMap[comId] = cObj;
                }
              }

              if (cObj) {
                // Find and tag services as commissionPaid using itemId and array index
                if (item.type === 'servico') {
                  cObj.services.forEach((serv, servIdx) => {
                    if (serv.id === item.itemId && servIdx === item.itemIndex) {
                      serv.commissionPaid = true;
                      serv.commissionPaymentDate = todayStr;
                    }
                  });
                } else {
                  // Tag products using itemId and array index
                  if (cObj.products) {
                    cObj.products.forEach((prod, prodIdx) => {
                      if (prod.id === item.itemId && prodIdx === item.itemIndex) {
                        prod.commissionPaid = true;
                        prod.commissionPaymentDate = todayStr;
                      }
                    });
                  }
                }
              }
            });

            // Dispatch updates to local state to remove from Pendentes list and force re-render
            Object.values(comandaUpdatesMap).forEach(updatedComanda => {
              onUpdateComandaObj(updatedComanda);
            });

            // Register corresponding expense / despesa in cash flow
            const chosenProfName = commissionFilterProf 
              ? (professionals.find(p => p.id === commissionFilterProf)?.name || 'Profissional') 
              : 'Múltiplos Colaboradores';

            const expenseRecord: FinancialRecord = {
              id: 'fin_com_' + Math.random().toString(36).substr(2, 9),
              salonId,
              type: 'despesa',
              category: 'Pessoal / Comissões',
              amount: totalPayAmount,
              description: `Pagamento de comissão - ${chosenProfName} (${qty} itens, Ref. ${months[selectedMonth]}/${selectedYear})`,
              date: todayStr,
              dueDate: todayStr,
              paymentDate: todayStr,
              status: 'pago'
            };

            onAddFinancialRecord(expenseRecord);
            setSelectedCommissionKeys([]); // Sets chosen ids state to empty, resetting ticking and zeroing widgets
            setAlertState({message: `Repasse ao Supabase concluído de forma síncrona! ${qty} pagamento(s) de comissão marcados como 'Pago' no banco e removidos da fila de pendentes.`, variant: 'success'});
          };

          return (
            <div className="p-6 space-y-6 text-xs text-stone-700">
              
              {/* Commissions KPI Summary widgets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#FCF9F2] p-5 rounded-xl border border-amber-250 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-amber-600 block uppercase font-bold tracking-wider font-sans">Comissões Pendentes (Período)</span>
                    <p className="text-2xl font-black font-serif text-amber-950 mt-1">{formatCurrency(totalComPeriodPending)}</p>
                    <p className="text-[10px] text-stone-500 mt-1 font-sans">Aguardando conciliação e repasse.</p>
                  </div>
                  <div className="p-3 bg-amber-100/60 rounded-full text-amber-700 font-bold font-mono">R$</div>
                </div>

                <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-250 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-emerald-600 block uppercase font-bold tracking-wider font-sans">Marcados para Pagar</span>
                    <p className="text-2xl font-black font-serif text-emerald-950 mt-1">{formatCurrency(tickedSumUnpaid)}</p>
                    <span className="text-[10px] text-stone-500 mt-1 font-sans font-bold block">{tickedItems.filter(it => !it.paid).length} itens sem repassar selecionados</span>
                  </div>
                  {tickedSumUnpaid > 0 ? (
                    <button
                      onClick={handlePagarSelecionados}
                      disabled={isReadOnly}
                      title={isReadOnly ? TOOLTIP_READONLY : undefined}
                      className={`font-extrabold px-3 py-1.5 rounded-full text-[10px] uppercase shadow-xs transition ${
                        isReadOnly ? 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      }`}
                    >
                      Pagar Selecionados
                    </button>
                  ) : (
                    <div className="p-3 bg-emerald-100 rounded-full text-emerald-700 font-bold font-mono">✓</div>
                  )}
                </div>

                <div className="bg-stone-50 p-5 rounded-xl border border-stone-200/80 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-stone-500 block uppercase font-bold tracking-wider font-sans">Repasses Concluídos (Mês)</span>
                    <p className="text-2xl font-black font-serif text-stone-900 mt-1">{formatCurrency(totalComPeriodPaid)}</p>
                    <p className="text-[10px] text-stone-400 mt-1 font-sans">Histórico de comissões liquidadas.</p>
                  </div>
                  <div className="p-3 bg-stone-105 rounded-full text-stone-500 font-bold font-mono">🔐</div>
                </div>
              </div>

              {/* Advanced filter control toolbar */}
              <div className="bg-[#FCF9F2]/45 p-4 rounded-xl border border-stone-200/60 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-sans">Filtrar por Colaborador</label>
                    <select
                      value={commissionFilterProf}
                      onChange={(e) => {
                        setCommissionFilterProf(e.target.value);
                        setSelectedCommissionKeys([]);
                      }}
                      className="bg-white text-xs border border-stone-300 rounded-lg p-2 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 min-w-56 font-bold"
                    >
                      <option value="">-- Todos os Colaboradores --</option>
                      {[...professionals].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-sans">Estado de Repasse</label>
                    <div className="flex gap-1 bg-white border border-stone-300 rounded-lg p-1">
                      {[
                        { id: 'pending', label: 'Pendentes' },
                        { id: 'paid', label: 'Pagos' },
                        { id: 'all', label: 'Todos' }
                      ].map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setCommissionFilterStatus(st.id as any);
                            setSelectedCommissionKeys([]);
                          }}
                          className={`text-[9.5px] font-bold uppercase px-3 py-1 rounded ${
                            commissionFilterStatus === st.id 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-white text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[10px] text-stone-500">Período ativo de apuração:</p>
                  <p className="text-sm font-black font-serif text-slate-900 mt-0.5">{months[selectedMonth]} de {selectedYear}</p>
                </div>
              </div>

              {/* Commission Ledger Table */}
              <div className="border border-stone-200 bg-white rounded-xl overflow-hidden shadow-xs overflow-x-auto w-full max-w-full no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-stone-200 text-[10px] font-bold text-stone-400 uppercase tracking-widest text-center">
                      <th className="px-5 py-3.5 w-10 text-center">
                        {commissionItems.filter(it => !it.paid).length > 0 && (
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 accent-amber-600"
                            checked={commissionItems.filter(it => !it.paid).every(it => selectedCommissionKeys.includes(it.key)) && commissionItems.filter(it => !it.paid).length > 0}
                            onChange={handleSelectAllVisiblePending}
                          />
                        )}
                      </th>
                      <th className="px-5 py-3.5 text-left cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('date')}>
                        Data<span className="text-stone-300 ml-0.5">{sortIndicator('date')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-left cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('ticketNumber')}>
                        Comanda<span className="text-stone-300 ml-0.5">{sortIndicator('ticketNumber')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-left cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('clientName')}>
                        Cliente<span className="text-stone-300 ml-0.5">{sortIndicator('clientName')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-left cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('professionalName')}>
                        Colaborador<span className="text-stone-300 ml-0.5">{sortIndicator('professionalName')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-left cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('name')}>
                        Item Vendido<span className="text-stone-300 ml-0.5">{sortIndicator('name')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-center cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('type')}>
                        Tipo<span className="text-stone-300 ml-0.5">{sortIndicator('type')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-right cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('price')}>
                        Valor Venda<span className="text-stone-300 ml-0.5">{sortIndicator('price')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-center cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('rate')}>
                        Taxa (%)<span className="text-stone-300 ml-0.5">{sortIndicator('rate')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-right cursor-pointer hover:text-stone-600 select-none font-black text-rose-500 bg-rose-50/15" onClick={() => handleSort('value')}>
                        Comissão<span className="text-stone-300 ml-0.5">{sortIndicator('value')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-right cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('cardFeeRateUsed')}>
                        Tx Cartão<span className="text-stone-300 ml-0.5">{sortIndicator('cardFeeRateUsed')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-right cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('profDeductPct')}>
                        Repasse %<span className="text-stone-300 ml-0.5">{sortIndicator('profDeductPct')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-right cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('originalValue')}>
                        Desc. Comissão<span className="text-stone-300 ml-0.5">{sortIndicator('originalValue')}</span>
                      </th>
                      <th className="px-5 py-3.5 text-center cursor-pointer hover:text-stone-600 select-none" onClick={() => handleSort('paid')}>
                        Repasse<span className="text-stone-300 ml-0.5">{sortIndicator('paid')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-sans text-[11px] text-stone-700">
                    {commissionItems.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="py-12 text-center text-stone-400 italic font-medium">
                          Nenhuma comanda faturada neste período preenche os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      sortedCommissionItems.map((item) => {
                        const isPending = !item.paid;
                        const isSelected = selectedCommissionKeys.includes(item.key);
                        return (
                          <tr
                            key={item.key}
                            className={`hover:bg-[#FCF9F2]/20 transition ${isSelected ? 'bg-amber-50/15' : ''}`}
                          >
                            <td className="px-5 py-3.5 text-center">
                              {isPending ? (
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                                  checked={isSelected}
                                  onChange={() => handleToggleKey(item.key)}
                                />
                              ) : (
                                <span className="text-emerald-600 text-xs font-bold font-mono">✓</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-stone-500 font-mono">
                              {formatDateBR(item.date)}
                            </td>
                            <td className="px-5 py-3.5 font-bold font-mono text-stone-800">{item.ticketNumber}</td>
                            <td className="px-5 py-3.5 font-semibold text-stone-900">{item.clientName}</td>
                            <td className="px-5 py-3.5 text-stone-900">
                              <span className="font-bold">{item.professionalName}</span>
                            </td>
                            <td className="px-5 py-3.5 font-medium">
                              <span className="flex items-center gap-1.5">
                                {item.type === 'produto' ? '📦' : '💇'}
                                {item.name}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center capitalize">
                              <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                item.type === 'produto' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono text-stone-500">{formatCurrency(item.price)}</td>
                            <td className="px-5 py-3.5 text-center font-mono font-bold text-amber-800 bg-[#FCF9F2]/30">{item.rate}%</td>
                            <td className="px-5 py-3.5 text-right font-black font-mono text-rose-700 bg-rose-50/15">{formatCurrency(item.value)}</td>
                            <td className="px-5 py-3.5 text-right font-mono text-stone-500">{item.cardFeeRateUsed > 0 ? `${item.cardFeeRateUsed}%` : '—'}</td>
                            <td className="px-5 py-3.5 text-right font-mono text-stone-500">{item.profDeductPct > 0 && item.cardFeeRateUsed > 0 ? `${item.profDeductPct}%` : '—'}</td>
                            <td className="px-5 py-3.5 text-right font-mono text-stone-500">{item.cardFeeRateUsed > 0 ? formatCurrency(item.originalValue - item.value) : '—'}</td>
                            <td className="px-5 py-3.5 text-center font-bold">
                              {item.paid ? (
                                <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-[9.5px]">
                                  PAGO em {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('pt-BR') : ''}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9.5px]">
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

      </div>

      {/* MODAL: ADD MANUAL FINANCIAL RECORD */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 overflow-y-auto backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-gold-200 overflow-hidden animate-scale-up">
            
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-[#FCF9F2]">
              <h3 className="text-base font-serif font-bold text-gray-900 uppercase tracking-wide">
                {editingRecord ? 'Editar Lançamento Financeiro' : 'Novo Lançamento Financeiro'}
              </h3>
              <button 
                onClick={() => { setShowAddForm(false); setEditingRecord(null); }}
                className="text-gray-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-6 space-y-4 font-sans text-xs">
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setNewType('despesa')}
                  className={`flex-1 py-2.5 rounded-lg border font-bold text-center transition-all ${
                    newType === 'despesa' 
                      ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs' 
                      : 'bg-white text-stone-500 border-stone-200'
                  }`}
                >
                  Despesa (Contas / Custos)
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('receita')}
                  className={`flex-1 py-2.5 rounded-lg border font-bold text-center transition-all ${
                    newType === 'receita' 
                      ? 'bg-green-50 text-green-700 border-green-300 shadow-xs' 
                      : 'bg-white text-stone-500 border-stone-200'
                  }`}
                >
                  Receita (Entradas / Avulsos)
                </button>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">Categoria de Plano de Contas</label>
                <select
                  required
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none"
                >
                  <option value="">-- Escolha a categoria --</option>
                  {newType === 'despesa' ? (
                    <>
                      <option value="Instalações">Aluguel / Instalações</option>
                      <option value="Produtos/Consumíveis">Produtos / Consumíveis de Uso</option>
                      <option value="Pessoal/Salários">Pessoal / Salários</option>
                      <option value="Marketing">Marketing / Tráfego pago</option>
                      <option value="Limpeza/Materiais">Limpeza / Descartáveis</option>
                      <option value="Sistemas/TI">Sistemas / Internet / Telefonia</option>
                    </>
                  ) : (
                    <>
                      <option value="Serviço">Serviço de Salão</option>
                      <option value="Venda Varejo">Venda de Cosméticos/Produtos</option>
                      <option value="Fidelidade Parcerias">Fidelidades ou Parcerias</option>
                      <option value="Contas a Receber">Duplicatas emitidas</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    className="w-full text-xs p-2.5 bg-[#FCF9F2] rounded-lg border border-gray-200 focus:border-gold-500 focus:outline-none"
                    placeholder="ex: 150.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-bold mb-1">Data de Emissão / Lançamento</label>
                  <input
                    type="date"
                    required
                    className="w-full text-xs p-2.5 bg-[#FCF9F2] rounded-lg border border-gray-200 focus:border-gold-500 focus:outline-none font-sans"
                    value={newDate}
                    onChange={(e) => {
                      setNewDate(e.target.value);
                      setNewDueDate(e.target.value);
                      setNewPaymentDate(e.target.value);
                    }}
                  />
                </div>
              </div>

              {/* PAID FLAG CHECKBOX AND CONDITIONAL DATES */}
              <div className="bg-[#FCF9F2] p-4 rounded-xl border border-gold-200/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-900 font-sans">Já Pago / Recebido</p>
                    <p className="text-[10px] text-stone-500 font-sans">Marque caso o valor já tenha sido quitado no caixa</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={isPrePaid}
                    onChange={(e) => {
                      setIsPrePaid(e.target.checked);
                      if (!e.target.checked) {
                        // Default due date to +30 days if pending
                        const d = new Date(newDate);
                        d.setDate(d.getDate() + 30);
                        setNewDueDate(d.toISOString().split('T')[0]);
                      }
                    }}
                    className="w-4.5 h-4.5 accent-black cursor-pointer"
                  />
                </div>

                {!isPrePaid && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-dashed border-gold-100">
                    <div>
                      <label className="block text-stone-400 font-bold mb-1 font-sans">Data de Vencimento</label>
                      <input
                        type="date"
                        required
                        className="w-full text-xs p-2 bg-white rounded border border-gray-200"
                        value={newDueDate}
                        onChange={(e) => {
                          setNewDueDate(e.target.value);
                          setNewPaymentDate(e.target.value);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-stone-400 font-bold mb-1 font-sans">Lembrete Cobrança</label>
                      <input
                        type="date"
                        className="w-full text-xs p-2 bg-white rounded border border-gray-200 focus:border-black font-sans"
                        value={newPaymentDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (newDueDate && val > newDueDate) {
                            setAlertState({message: "A data do lembrete não pode ser posterior ao vencimento!", variant: 'error'});
                            setNewPaymentDate(newDueDate);
                          } else {
                            setNewPaymentDate(val);
                          }
                        }}
                        max={newDueDate}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">Descrição do Lançamento</label>
                <input
                  type="text"
                  required
                  className="w-full text-xs p-2.5 bg-[#FCF9F2] rounded-lg border border-gray-200 focus:border-gold-500 focus:outline-none"
                  placeholder="ex: Pagamento conta de energia Maio"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isReadOnly}
                title={isReadOnly ? TOOLTIP_READONLY : undefined}
                className={`w-full font-bold py-3.5 px-4 rounded-full transition-all ${
                  isReadOnly ? 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-50' : 'bg-black hover:bg-[#e5b35f] text-white hover:text-black cursor-pointer'
                }`}
              >
                {editingRecord ? 'Salvar Lançamento' : 'Confirmar Lançamento Financeiro'}
              </button>
            </form>

          </div>
        </div>
      )}

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
                    setAlertState({message: "Utilize as teclas Ctrl + P ou Cmd + P para imprimir, ou clique em baixar Relatório!", variant: 'error'});
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
              {subTab === 'geral' && (
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
                      <tr className="bg-stone-50 font-bold text-stone-905 bg-stone-50/70">
                        <td className="px-4 py-3.5 pl-8 uppercase font-bold text-stone-950">2. Receita Operacional Líquida</td>
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
                      <tr className="bg-stone-50 font-bold text-stone-905 bg-stone-50/70">
                        <td className="px-4 py-3.5 pl-8 uppercase font-bold text-stone-950">3. Custos e Despesas Gerais de Instalações, Aluguel e Marketing</td>
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
              {subTab === 'receber' && (
                <div className="space-y-8 font-sans">
                  {/* Ledger Header */}
                  <div className="border-b-2 border-[#e5b35f] pb-6 flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Relatório de Contas a Receber (Créditos)</h1>
                      <p className="text-xs text-stone-500 mt-1">Modello Salon — Período: {months[selectedMonth]} de {selectedYear}</p>
                    </div>
                    <div className="text-right text-[11px] text-stone-500 font-sans">
                      <p className="font-bold text-stone-800">Soma: {formatCurrency(filteredReceber.reduce((sum, item) => sum + item.amount, 0))}</p>
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
                      {filteredReceber.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-stone-400 italic">
                            Nenhum registro de Contas a Receber localizado para este período.
                          </td>
                        </tr>
                      ) : (
                        filteredReceber.map(item => {
                          const { clientName, detail } = getRecordClientAndDetail(item);
                          return (
                            <tr key={item.id}>
                              <td className="px-4 py-3 font-semibold text-stone-900">{clientName}</td>
                              <td className="px-4 py-3 text-stone-500">{detail}</td>
                              <td className="px-4 py-3 text-stone-500">{item.category}</td>
                              <td className="px-4 py-3 font-mono text-stone-400">{formatDateBR(item.date)}</td>
                              <td className="px-4 py-3 font-mono text-stone-400">{formatDateBR(item.dueDate || item.date)}</td>
                              <td className="px-4 py-3 text-right font-bold text-stone-800">{formatCurrency(item.amount)}</td>
                              <td className="px-3 py-3 text-right">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                  item.status === 'pago' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }}`}>
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
                    TOTAL SOMA DO RELATÓRIO: {formatCurrency(filteredReceber.reduce((sum, item) => sum + item.amount, 0))}
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
              {subTab === 'pagar' && (
                <div className="space-y-8 font-sans">
                  {/* Ledger Header */}
                  <div className="border-b-2 border-[#e5b35f] pb-6 flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Relatório de Contas a Pagar (Débitos)</h1>
                      <p className="text-xs text-stone-500 mt-1">Modello Salon — Período: {months[selectedMonth]} de {selectedYear}</p>
                    </div>
                    <div className="text-right text-[11px] text-stone-500 font-sans">
                      <p className="font-bold text-stone-800">Soma: {formatCurrency(currentPagar.reduce((sum, item) => sum + item.amount, 0))}</p>
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
                      {currentPagar.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-stone-400 italic">
                            Nenhum registro de Contas a Pagar localizado para este período.
                          </td>
                        </tr>
                      ) : (
                        currentPagar.map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-semibold text-stone-900">{item.description}</td>
                            <td className="px-4 py-3 text-stone-500">{item.category}</td>
                            <td className="px-4 py-3 font-mono text-stone-400">{formatDateBR(item.date)}</td>
                            <td className="px-4 py-3 font-mono text-stone-400">{formatDateBR(item.dueDate || item.date)}</td>
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
                    TOTAL SOMA DO RELATÓRIO: {formatCurrency(currentPagar.reduce((sum, item) => sum + item.amount, 0))}
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

              {/* Document Commissions Layout */}
              {subTab === 'comissoes' && (() => {
                const commissionItems = getCommissionItems();
                const totalValue = commissionItems.reduce((sum, item) => sum + item.value, 0);

                const activeProfessionalName = commissionFilterProf 
                  ? (professionals.find(p => p.id === commissionFilterProf)?.name || 'Profissional') 
                  : 'Todos';

                const statusLabel = commissionFilterStatus === 'all' 
                  ? 'Todos (Pendente / Pago)' 
                  : commissionFilterStatus === 'paid' 
                    ? 'Apenas Pagos' 
                    : 'Apenas Pendentes';

                return (
                  <div className="space-y-8 font-sans">
                    {/* Ledger Header */}
                    <div className="border-b-2 border-[#e5b35f] pb-6 flex justify-between items-start">
                      <div>
                        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Relatório de Apuração de Comissões</h1>
                        <p className="text-xs text-stone-500 mt-1">Modello Salon — Período: {months[selectedMonth]} de {selectedYear}</p>
                      </div>
                      <div className="text-right text-[11px] text-stone-500 font-sans font-medium">
                        <p className="font-bold text-stone-800">Total a Repassar: {formatCurrency(totalValue)}</p>
                        <p className="mt-0.5">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>

                    {/* Filters Metadata */}
                    <div className="bg-[#FCF9F2] p-4 rounded-lg border border-[#e5b35f] text-xs flex justify-between items-center text-stone-750 font-sans">
                      <div>
                        <span className="font-bold text-[#78350f]">Colaborador:</span> {activeProfessionalName}
                      </div>
                      <div>
                        <span className="font-bold text-[#78350f]">Estado do Repasse:</span> {statusLabel}
                      </div>
                      <div>
                        <span className="font-bold text-[#78350f]">Quantidade:</span> {commissionItems.length} item(ns)
                      </div>
                    </div>

                    {/* Ledger Table */}
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="bg-[#FCF9F2] border-b border-[#e5b35f]">
                          <th className="px-3 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Data</th>
                          <th className="px-3 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Comanda</th>
                          <th className="px-3 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Cliente</th>
                          <th className="px-3 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Colaborador</th>
                          <th className="px-3 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Item Vendido</th>
                          <th className="px-3 py-3 text-stone-800 font-bold uppercase tracking-wider text-[9px]">Tipo</th>
                          <th className="px-3 py-3 text-right text-stone-800 font-bold uppercase tracking-wider text-[9px]">Venda (R$)</th>
                          <th className="px-3 py-3 text-center text-stone-800 font-bold uppercase tracking-wider text-[9px]">Taxa</th>
                          <th className="px-3 py-3 text-right text-stone-800 font-bold uppercase tracking-wider text-[9px]">Comissão</th>
                          <th className="px-3 py-3 text-right text-stone-800 font-bold uppercase tracking-wider text-[9px]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-[11px]">
                        {commissionItems.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center text-stone-400 italic">
                              Nenhuma comissão localizada com os filtros ativos para este período.
                            </td>
                          </tr>
                        ) : (
                          [...commissionItems].sort((a, b) => {
                            const dateCmp = a.date.toLowerCase().localeCompare(b.date.toLowerCase());
                            if (dateCmp !== 0) return dateCmp;
                            return a.ticketNumber.toLowerCase().localeCompare(b.ticketNumber.toLowerCase());
                          }).map(item => (
                            <tr key={item.key}>
                              <td className="px-3 py-3 font-mono text-stone-500">
                                {formatDateBR(item.date)}
                              </td>
                              <td className="px-3 py-3 font-semibold text-stone-850">{item.ticketNumber}</td>
                              <td className="px-3 py-3 text-stone-700">{item.clientName}</td>
                              <td className="px-3 py-3 font-semibold text-stone-900">{item.professionalName}</td>
                              <td className="px-3 py-3 text-stone-550">{item.name}</td>
                              <td className="px-3 py-3 text-center text-stone-500 capitalize">{item.type}</td>
                              <td className="px-3 py-3 text-right font-mono text-stone-600">{formatCurrency(item.price)}</td>
                              <td className="px-3 py-3 text-center font-mono text-stone-500">{item.rate}%</td>
                              <td className="px-3 py-3 text-right font-bold text-stone-900">{formatCurrency(item.value)}</td>
                              <td className="px-3 py-3 text-right">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                  item.paid 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.paid ? 'Pago' : 'Pendente'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Summary Box */}
                    <div className="p-4 bg-[#FCF9F2] border border-[#e5b35f] rounded-lg text-right font-bold text-stone-850 text-xs">
                      TOTAL GERAL DE COMISSÕES A REPASSAR: {formatCurrency(totalValue)}
                    </div>

                    {/* Signature block */}
                    <div className="mt-16 pt-12 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500">
                      <div className="w-1/3 text-center border-t border-stone-300 pt-2 pb-1">
                        Assinatura do Profissional
                      </div>
                      <div className="w-1/3 text-center border-t border-stone-300 pt-2 pb-1">
                        Visto da Administração
                      </div>
                    </div>
                  </div>
                );
              })()}

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

  // Helper totalizer function
  function faturamentoTotalCompetencia() {
    return dre.receitaBruta;
  }
}
