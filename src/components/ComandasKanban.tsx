import React, { useState } from 'react';
import { Comanda, ComandaStatus, Client, Professional, Service, Product, ServiceCategory, CardAcquirer, CardFeeRule, Salon } from '../types';
import { formatCurrency, formatPhone, generateWhatsAppLink, formatDateBR } from '../utils';
import { generatePixStatic, sanitizePixKey, generatePixTxid } from '../utils/pix/generatePixStatic';
import { fetchTenantPixConfig } from '../utils/pix/tenantPixConfig';
import QRCode from 'qrcode';
import { 
  Search, 
  PlusCircle, 
  CheckCircle2, 
  FileText, 
  Send, 
  Printer, 
  Trash2, 
  X, 
  Plus, 
  Calendar, 
  ShieldCheck, 
  CreditCard,
  ChevronRight,
  GripHorizontal,
  Edit2,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import AlertModal from './AlertModal';
import { TS, TAB, shortStack, checkWatchlist } from '../forensic';

interface ComandasKanbanProps {
  salonId: string;
  salonName: string;
  comandas: Comanda[];
  clients: Client[];
  professionals: Professional[];
  services: Service[];
  products: Product[];
  serviceCategories?: ServiceCategory[];
  cardAcquirers?: CardAcquirer[];
  onAddComanda: (comanda: Comanda) => void;
  onUpdateComandaObj: (comanda: Comanda) => void;
  onUpdateStatus: (id: string, status: ComandaStatus, payment?: string, isFiado?: boolean, cardDetails?: any, pixPayload?: string, overrides?: { competenceDate?: string; paymentDate?: string }) => Promise<void>;
  onDeleteComanda: (id: string) => void;
  currentSalon?: Salon | null;
  isReadOnly?: boolean;
}

export default function ComandasKanban({
  salonId,
  salonName,
  comandas,
  clients,
  professionals,
  services,
  products,
  serviceCategories = [],
  cardAcquirers = [],
  onAddComanda,
  onUpdateComandaObj,
  onUpdateStatus,
  onDeleteComanda,
  currentSalon = null,
  isReadOnly = false
}: ComandasKanbanProps) {
  const TOOLTIP_READONLY = "Plano expirado. Renove para voltar a realizar alterações.";

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportDateType, setReportDateType] = useState<'lancamento' | 'pagamento'>('lancamento');
  const [activeView, setActiveView] = useState<'kanban' | 'maintenance'>('kanban');

  // Modal State
  const [showNewComandaModal, setShowNewComandaModal] = useState(false);
  const [comandaToDelete, setComandaToDelete] = useState<Comanda | null>(null);
  const [editingComandaId, setEditingComandaId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{message: string; variant?: 'info' | 'success' | 'error'} | null>(null);
  const [editDateCreated, setEditDateCreated] = useState<string>('');
  const [editCompetenceDate, setEditCompetenceDate] = useState<string>('');
  const [editPaymentDate, setEditPaymentDate] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // New/Edit Comanda build state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [profSearchText, setProfSearchText] = useState('');
  const [showProfSearchResults, setShowProfSearchResults] = useState(false);
  
  // Accumulated services already chosen inside this comanda, each with its own professional!
  const [comandaServicesList, setComandaServicesList] = useState<{
    id: string;
    name: string;
    price: number;
    professionalId: string;
    professionalName: string;
    commissionRate: number;
    commissionValue: number;
  }[]>([]);

  // Accumulated products sold in this comanda
  const [comandaProductsList, setComandaProductsList] = useState<{
    id: string;
    name: string;
    price: number;
    professionalId?: string;
    professionalName?: string;
    commissionRate?: number;
    commissionValue?: number;
  }[]>([]);

  // Track which price input is focused for display formatting
  const [focusedPriceIndex, setFocusedPriceIndex] = useState<number | null>(null);

  // Category filter for step 3 service rendering
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  
  // Mandatory payment selection state
  const [paymentMethodSelected, setPaymentMethodSelected] = useState<string>('Pix');
  const [isFiado, setIsFiado] = useState(false);

  // Quick Inline Settle Checkout Panel on Card
  const [activeCheckoutComandaId, setActiveCheckoutComandaId] = useState<string | null>(null);
  const [cardPaymentMethod, setCardPaymentMethod] = useState<'Dinheiro' | 'Cartão Credito' | 'Cartão Debito' | 'Pix' | 'Duplicata'>('Pix');

  // Card payment custom fields states
  const [selectedAcquirerId, setSelectedAcquirerId] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('Visa');
  const [selectedInstallments, setSelectedInstallments] = useState<number>(1);
  const [profDeductPercentage, setProfDeductPercentage] = useState<number>(0);
  const [salonDeductPercentage, setSalonDeductPercentage] = useState<number>(100);
  const [showCardConfirmModal, setShowCardConfirmModal] = useState<{ comandaId: string, skipWA: boolean } | null>(null);
  const [pixBRCode, setPixBRCode] = useState<string>('');
  const pixCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const globalPct = currentSalon?.cardFeePercentProfDeduct !== undefined ? currentSalon.cardFeePercentProfDeduct : 0;
    setProfDeductPercentage(globalPct);
    setSalonDeductPercentage(100 - globalPct);
  }, [currentSalon?.cardFeePercentProfDeduct]);

  const activeComandaForPix = activeCheckoutComandaId
    ? comandas.filter(c => !c.deletedAt).find(c => c.id === activeCheckoutComandaId)
    : null;

  // Cache em memória do último PIX fetched para a sessão atual.
  // Nunca usar estado do tenant — sempre buscar via endpoint dedicado.
  const pixConfigCacheRef = React.useRef<{
    tenantId: string | null;
    config: { pix_key_type: string; pix_key: string } | null;
  }>({ tenantId: null, config: null });

  const generatePixQR = React.useCallback(async () => {
    if (!activeComandaForPix || !currentSalon?.id) {
      setPixBRCode('');
      return;
    }

    // Busca FRESCA da config PIX via endpoint dedicado (sem cache entre sessões).
    let cfg = pixConfigCacheRef.current.config;
    if (pixConfigCacheRef.current.tenantId !== currentSalon.id) {
      try {
        cfg = await fetchTenantPixConfig(currentSalon.id);
        pixConfigCacheRef.current = { tenantId: currentSalon.id, config: cfg };
      } catch {
        cfg = null;
      }
    }
    if (!cfg) {
      setPixBRCode('');
      return;
    }

    const merchantName = currentSalon.name || 'Salao';
    const merchantCity = currentSalon.city || 'Recife';
    const amount = activeComandaForPix.totalValue;

    try {
      // Gera txid determinístico a partir do ticketNumber da comanda
      // (ex: "CMD-0006") e do primeiro nome do cliente. Formato:
      // `CMD0006ALICE` (≤ 25 chars, alfanumérico puro, compatível
      // com apps bancários reais). Determinístico: mesmos inputs
      // → mesmo txid → mesmo BR Code.
      const txid = generatePixTxid(
        activeComandaForPix.ticketNumber,
        activeComandaForPix.clientName
      );

      const { qrPayload } = generatePixStatic({
        pixKey: sanitizePixKey(cfg.pix_key, cfg.pix_key_type as any),
        amount,
        merchantName,
        merchantCity,
        txid,
        bcbCompatible: true,
      });
      setPixBRCode(qrPayload);
    } catch {
      setPixBRCode('');
    }
  }, [activeComandaForPix, currentSalon]);

  React.useEffect(() => {
    if (cardPaymentMethod === 'Pix') {
      // generatePixQR agora é async — dispara sem await.
      void generatePixQR();
    } else {
      setPixBRCode('');
    }
  }, [cardPaymentMethod, generatePixQR]);

  React.useEffect(() => {
    if (!pixBRCode || !pixCanvasRef.current || cardPaymentMethod !== 'Pix') return;
    QRCode.toCanvas(pixCanvasRef.current, pixBRCode, {
      width: 180,
      margin: 2,
      color: { dark: '#1C1917', light: '#FFFFFF' }
    });
  }, [pixBRCode, cardPaymentMethod]);

  const handleCopyPixCode = async () => {
    if (!pixBRCode) return;
    try {
      await navigator.clipboard.writeText(pixBRCode);
      triggerToast('Código PIX Copia e Cola copiado!');
    } catch {
      triggerToast('Erro ao copiar código PIX');
    }
  };

  const handleRefreshPixQR = () => {
    // Invalida cache e refaz fetch fresh
    pixConfigCacheRef.current = { tenantId: null, config: null };
    void generatePixQR();
  };

  const getCardFeeCalculations = (totalValue: number, method: string) => {
    const isCredit = method === 'Cartão Credito' || method === 'Cartão Crédito';
    const isDebit = method === 'Cartão Debito' || method === 'Cartão Débito';
    if (!isCredit && !isDebit) {
      return { rate: 0, feeAmount: 0, profDeduction: 0, salonAbsorbed: 0, acquirerName: '', acquirerId: '' };
    }

    const acquirer = cardAcquirers.find(a => a.id === selectedAcquirerId) || cardAcquirers.find(a => a.isActive) || cardAcquirers[0];
    if (!acquirer) {
      return { rate: 0, feeAmount: 0, profDeduction: 0, salonAbsorbed: 0, acquirerName: '', acquirerId: '' };
    }

    const oper = isDebit ? 'debito' : 'credito';
    const inst = isDebit ? 1 : selectedInstallments;

    const rule = acquirer.rules?.find(r => r.brand === selectedBrand && r.operation === oper && r.installments === inst);
    const rate = rule ? rule.rate : 0;
    const feeAmount = totalValue * (rate / 100);

    const profDeduction = feeAmount * (profDeductPercentage / 100);
    const salonAbsorbed = feeAmount * (salonDeductPercentage / 100);

    return {
      rate,
      feeAmount,
      profDeduction,
      salonAbsorbed,
      acquirerName: acquirer.name,
      acquirerId: acquirer.id
    };
  };

  const distributeCardFeeDeduction = (
    servicesList: any[],
    productsList: any[],
    profDeduction: number,
    comandaTotalValue: number
  ) => {
    // PD-21: sempre recalcular a comissão-base a partir do preço e da taxa
    // (price * commissionRate / 100). Nunca usar `originalCommissionValue` persistido,
    // pois isso causaria dedução dupla em re-edições da comanda.
    if (profDeduction <= 0 || comandaTotalValue <= 0) {
      return {
        updatedServices: servicesList.map(s => {
          const { originalCommissionValue, ...rest } = s;
          const base = (s.price * s.commissionRate) / 100;
          return { ...rest, commissionValue: parseFloat(base.toFixed(2)) };
        }),
        updatedProducts: (productsList || []).map(p => {
          const { originalCommissionValue, ...rest } = p;
          const base = (p.price * (p.commissionRate || 0)) / 100;
          return { ...rest, commissionValue: parseFloat(base.toFixed(2)) };
        })
      };
    }

    const totalItems = servicesList.length + (productsList?.length || 0);
    if (totalItems === 0) return { updatedServices: [], updatedProducts: [] };

    // Update services
    const updatedServices = servicesList.map(s => {
      const { originalCommissionValue, ...rest } = s;
      const weight = s.price / comandaTotalValue;
      const deductionForThisItem = profDeduction * weight;
      const baseCommission = (s.price * s.commissionRate) / 100;
      return {
        ...rest,
        commissionValue: Math.max(0, parseFloat((baseCommission - deductionForThisItem).toFixed(2)))
      };
    });

    // Update products
    const updatedProducts = (productsList || []).map(p => {
      const { originalCommissionValue, ...rest } = p;
      const weight = p.price / comandaTotalValue;
      const deductionForThisItem = profDeduction * weight;
      const baseCommission = (p.price * (p.commissionRate || 0)) / 100;
      return {
        ...rest,
        commissionValue: Math.max(0, parseFloat((baseCommission - deductionForThisItem).toFixed(2)))
      };
    });

    return { updatedServices, updatedProducts };
  };

  const openCheckoutPanel = (comandaId: string, customInitialMethod?: string) => {
    setActiveCheckoutComandaId(comandaId);
    
    const initialMethod = customInitialMethod || 'Pix';
    setCardPaymentMethod(initialMethod as any);
    setSelectedBrand('Visa');
    setSelectedInstallments(1);
    setProfDeductPercentage(currentSalon?.cardFeePercentProfDeduct ?? 0);
    setSalonDeductPercentage(100 - (currentSalon?.cardFeePercentProfDeduct ?? 0));

    const activeAcq = cardAcquirers.find(a => a.isActive) || cardAcquirers[0];
    if (activeAcq) {
      setSelectedAcquirerId(activeAcq.id);
    } else {
      setSelectedAcquirerId('');
    }
  };

  // New client quick add in modal
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [clientFormError, setClientFormError] = useState<string | null>(null);

  // Months lists
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Toast helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Drag and Drop Handles
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropColumn = (e: React.DragEvent, targetStatus: ComandaStatus) => {
    e.preventDefault();
    const comandaId = e.dataTransfer.getData('text/plain');
    if (!comandaId) return;

    const cmd = comandas.filter(c => !c.deletedAt).find(c => c.id === comandaId);
    if (!cmd) return;

    if (targetStatus === 'Concluido') {
      // Must choose payment method. Open checkout drawer/modal inline or automatically
      openCheckoutPanel(comandaId);
    } else {
      onUpdateStatus(comandaId, targetStatus);
      triggerToast(`Comanda ${cmd.ticketNumber} movida para ${targetStatus}!`);
    }
  };

  // Convert month selector filter
  const dateInFilter = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  };

  // Filter comandas by search query AND month/year period
  const filteredComandas = comandas.filter(c => {
    if (c.deletedAt) return false;
    const matchesSearch = 
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.services.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPeriod = dateInFilter(reportDateType === 'pagamento' ? (c.paymentDate || c.dateCreated) : c.dateCreated);
    return matchesSearch && matchesPeriod;
  });

  // Kanban Columns configuration
  const columns: { status: ComandaStatus; title: string; colorClass: string; textColor: string; cardBorder: string; bgLight: string }[] = [
    { status: 'Aberto', title: 'Aberta', colorClass: 'bg-blue-600', textColor: 'text-blue-600', cardBorder: 'hover:border-blue-300', bgLight: 'bg-blue-50/50' },
    { status: 'Em Atendimento', title: 'Em Atendimento', colorClass: 'bg-amber-500', textColor: 'text-amber-500', cardBorder: 'hover:border-amber-300', bgLight: 'bg-amber-50/40' },
    { status: 'Concluido', title: 'Concluída', colorClass: 'bg-green-600', textColor: 'text-green-600', cardBorder: 'hover:border-green-300', bgLight: 'bg-green-50/50' }
  ];

  const getColumnTotal = (status: ComandaStatus) => {
    return filteredComandas
      .filter(c => {
        if (c.status !== status) return false;
        if (status === 'Concluido') {
          const todayStr = new Date().toISOString().split('T')[0];
          const conclusionDate = c.paymentDate || c.dateCreated.split('T')[0];
          return conclusionDate === todayStr;
        }
        return true;
      })
      .reduce((sum, c) => sum + c.totalValue, 0);
  };

  const getColumnCount = (status: ComandaStatus) => {
    return filteredComandas.filter(c => {
      if (c.status !== status) return false;
      if (status === 'Concluido') {
        const todayStr = new Date().toISOString().split('T')[0];
        const conclusionDate = c.paymentDate || c.dateCreated.split('T')[0];
        return conclusionDate === todayStr;
      }
      return true;
    }).length;
  };

  // Client list suggestions
  const filteredClientSuggestions = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    c.phone.includes(clientSearch)
  );

  // Triggered when professional selected -> reveals only their matching specialties!
  const matchingProfSpecialties = () => {
    if (!selectedProfessional) return [];
    const pObj = professionals.find(p => p.id === selectedProfessional);
    if (!pObj || !pObj.specialties) return [];
    
    return services.filter(s => {
      const matchesCategory = activeCategory === 'Todos' || s.category === activeCategory;
      const isQualified = pObj.specialties?.includes(s.id);
      return matchesCategory && isQualified;
    });
  };

  const handleAddServiceItem = (service: Service) => {
    if (!selectedProfessional) {
      setAlertState({message: "Selecione um profissional primeiro!"});
      return;
    }
    const profObj = professionals.find(p => p.id === selectedProfessional);
    if (!profObj) return;

    // Attribute commission specifically to THIS professional for this service
    const commissionValue = (service.price * profObj.commissionRate) / 100;

    const appended = {
      id: service.id,
      name: service.name,
      price: service.price,
      professionalId: profObj.id,
      professionalName: profObj.name,
      commissionRate: profObj.commissionRate,
      commissionValue
    };

    setComandaServicesList([...comandaServicesList, appended]);

    // RESET choice field state to trigger next item choice correctly (as requested!)
    setSelectedProfessional('');
    setProfSearchText('');
    setShowProfSearchResults(false);
    setActiveCategory('Todos');
    triggerToast(`Serviço "${service.name}" vinculado ao profissional ${profObj.name}!`);
  };

  const handleServicePriceChange = (index: number, newPrice: number) => {
    const list = [...comandaServicesList];
    const item = { ...list[index] };
    item.price = newPrice;
    item.commissionValue = (newPrice * item.commissionRate) / 100;
    list[index] = item;
    setComandaServicesList(list);
  };

  const formatPriceInput = (value: number): string => {
    return value.toFixed(2).replace('.', ',');
  };

  const parsePriceInput = (value: string): number => {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handlePriceBlur = (index: number) => {
    setFocusedPriceIndex(null);
    const list = [...comandaServicesList];
    const item = { ...list[index] };
    const formatted = Math.round(item.price * 100) / 100;
    item.price = formatted;
    item.commissionValue = (formatted * item.commissionRate) / 100;
    list[index] = item;
    setComandaServicesList(list);
  };

  const handleAddProductItem = (productId: string, sellerId: string) => {
    const prodObj = products.find(p => p.id === productId);
    if (!prodObj) return;

    const profObj = professionals.find(p => p.id === sellerId);
    
    // Choose rate: prioritizes Professional's commissionRate if assigned, otherwise Product's commissionRate
    let rate = 0;
    if (profObj) {
      rate = profObj.commissionRate !== undefined ? profObj.commissionRate : (prodObj.commissionRate || 0);
    } else {
      rate = prodObj.commissionRate || 0;
    }

    const value = (prodObj.price * rate) / 100;

    const newItem = {
      id: prodObj.id,
      name: prodObj.name,
      price: prodObj.price,
      professionalId: profObj ? profObj.id : undefined,
      professionalName: profObj ? profObj.name : undefined,
      commissionRate: rate,
      commissionValue: value
    };

    setComandaProductsList([...comandaProductsList, newItem]);
    triggerToast(`Produto "${prodObj.name}" adicionado à comanda!`);
  };

  const handleRemoveServiceItem = (index: number) => {
    const list = [...comandaServicesList];
    list.splice(index, 1);
    setComandaServicesList(list);
  };

  // Save or edit comanda
  const handleSaveComanda = (forceStatus: ComandaStatus = 'Aberto', sendWhatsApp: boolean = false) => {
    if (!selectedClient) {
      setAlertState({message: "Por favor, selecione ou cadastre uma cliente."});
      return;
    }
    if (comandaServicesList.length === 0 && comandaProductsList.length === 0) {
      setAlertState({message: "Por favor, adicione pelo menos um serviço ou produto."});
      return;
    }

    const totalVal = comandaServicesList.reduce((sum, s) => sum + s.price, 0) + 
                     comandaProductsList.reduce((sum, p) => sum + p.price, 0);

    const finalMethod = isFiado ? 'Caderno' : (paymentMethodSelected as any);
    const isCard = finalMethod === 'Cartão Credito' || finalMethod === 'Cartão Debito';

    let finalServices = comandaServicesList;
    let finalProducts = comandaProductsList;

    let cardFeeAmountValue: number | undefined = undefined;
    let cardFeeRateUsedValue: number | undefined = undefined;
    let cardAcquirerIdValue: string | undefined = undefined;
    let cardAcquirerNameValue: string | undefined = undefined;
    let cardBrandValue: string | undefined = undefined;
    let cardInstallmentsValue: number | undefined = undefined;
    let profDeductPercentageValue: number | undefined = undefined;
    let salonDeductPercentageValue: number | undefined = undefined;
    let profCardFeeDeductionValue: number | undefined = undefined;
    let salonCardFeeDeductionValue: number | undefined = undefined;

    if (isCard && forceStatus === 'Concluido') {
      const calc = getCardFeeCalculations(totalVal, finalMethod);
      cardFeeAmountValue = calc.feeAmount;
      cardFeeRateUsedValue = calc.rate;
      cardAcquirerIdValue = calc.acquirerId;
      cardAcquirerNameValue = calc.acquirerName;
      cardBrandValue = selectedBrand;
      cardInstallmentsValue = finalMethod === 'Cartão Debito' ? 1 : selectedInstallments;
      profDeductPercentageValue = profDeductPercentage;
      salonDeductPercentageValue = salonDeductPercentage;
      profCardFeeDeductionValue = calc.profDeduction;
      salonCardFeeDeductionValue = calc.salonAbsorbed;

      const distributed = distributeCardFeeDeduction(comandaServicesList, comandaProductsList, calc.profDeduction, totalVal);
      finalServices = distributed.updatedServices;
      finalProducts = distributed.updatedProducts;
    } else {
      const distributed = distributeCardFeeDeduction(comandaServicesList, comandaProductsList, 0, totalVal);
      finalServices = distributed.updatedServices;
      finalProducts = distributed.updatedProducts;
    }

    let finalComandaObj: Comanda | null = null;

    if (editingComandaId) {
      // Edit Comanda
      const orig = comandas.filter(c => !c.deletedAt).find(c => c.id === editingComandaId);
      if (!orig) return;

      const updated: Comanda = {
        ...orig,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        services: finalServices,
        products: finalProducts,
        totalValue: totalVal,
        dateCreated: editDateCreated || orig.dateCreated,
        competenceDate: editCompetenceDate || orig.competenceDate,
        isFiado: isFiado,
        status: forceStatus,
        paymentMethod: finalMethod,
        paymentDate: editPaymentDate || orig.paymentDate,

        cardAcquirerId: cardAcquirerIdValue,
        cardAcquirerName: cardAcquirerNameValue,
        cardBrand: cardBrandValue,
        cardInstallments: cardInstallmentsValue,
        cardFeeAmount: cardFeeAmountValue,
        cardFeeRateUsed: cardFeeRateUsedValue,
        profDeductPercentage: profDeductPercentageValue,
        salonDeductPercentage: salonDeductPercentageValue,
        profCardFeeDeduction: profCardFeeDeductionValue,
        salonCardFeeDeduction: salonCardFeeDeductionValue
      };

      onUpdateComandaObj(updated);
      finalComandaObj = updated;
      triggerToast(`Comanda ${updated.ticketNumber} atualizada com sucesso!`);
    } else {
      // Create Comanda
      // PD-15: usa o maior número existente + 1 para evitar colisão após exclusões
      const maxTicket = comandas.filter(c => !c.deletedAt).reduce((max, c) => {
        const match = c.ticketNumber?.match(/(\d+)$/);
        if (!match) return max;
        const n = parseInt(match[1], 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0);
      const nextTicketNumber = `CMD-${String(maxTicket + 1).padStart(3, '0')}`;
      const newComanda: Comanda = {
        id: 'cmd_' + Math.random().toString(36).substr(2, 9),
        salonId,
        ticketNumber: nextTicketNumber,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        services: finalServices,
        products: finalProducts,
        totalValue: totalVal,
        status: forceStatus,
        dateCreated: editDateCreated || new Date().toISOString().substring(0, 16),
        competenceDate: editCompetenceDate || undefined,
        isFiado: isFiado,
        paymentMethod: finalMethod,
        paymentDate: editPaymentDate || (forceStatus === 'Concluido' ? new Date().toISOString().split('T')[0] : undefined),

        cardAcquirerId: cardAcquirerIdValue,
        cardAcquirerName: cardAcquirerNameValue,
        cardBrand: cardBrandValue,
        cardInstallments: cardInstallmentsValue,
        cardFeeAmount: cardFeeAmountValue,
        cardFeeRateUsed: cardFeeRateUsedValue,
        profDeductPercentage: profDeductPercentageValue,
        salonDeductPercentage: salonDeductPercentageValue,
        profCardFeeDeduction: profCardFeeDeductionValue,
        salonCardFeeDeduction: salonCardFeeDeductionValue
      };

      onAddComanda(newComanda);
      finalComandaObj = newComanda;
      triggerToast(`Comanda ${newComanda.ticketNumber} aberta com sucesso!`);
    }

    if (sendWhatsApp && forceStatus === 'Concluido' && finalComandaObj) {
      const servNamesList = finalComandaObj.services.map(s => ` - ${s.name}: ${formatCurrency(s.price)}`).join('%0A');
      const waLink = generateWhatsAppLink(
        finalComandaObj.clientPhone, 
        finalComandaObj.clientName, 
        finalComandaObj.ticketNumber, 
        servNamesList, 
        finalComandaObj.totalValue, 
        finalComandaObj.isFiado, 
        salonName
      );
      window.open(waLink, '_blank');
    }

    // Reset modals
    setSelectedClient(null);
    setClientSearch('');
    setSelectedProfessional('');
    setProfSearchText('');
    setShowProfSearchResults(false);
    setActiveCategory('Todos');
    setComandaServicesList([]);
    setComandaProductsList([]);
    setEditingComandaId(null);
    setShowNewComandaModal(false);
  };

  const handleCreateNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    setClientFormError(null);

    if (!newClientName.trim() || !newClientPhone.trim()) {
      setClientFormError("O preenchimento do Nome e do WhatsApp/Celular é obrigatório.");
      return;
    }

    const parts = newClientName.trim().split(/\s+/);
    if (parts.length < 2) {
      setClientFormError("Por favor, digite o nome completo (sobrenome obrigatório, por exemplo: Mariana Costa, ou coloque um sobrenome fictício caso necessário).");
      return;
    }

    const newClientObj: Client = {
      id: 'client_' + Math.random().toString(36).substr(2, 9),
      salonId,
      name: newClientName,
      phone: formatPhone(newClientPhone),
      fidelityPoints: 0
    };

    clients.push(newClientObj);
    setSelectedClient(newClientObj);
    setNewClientName('');
    setNewClientPhone('');
    setClientFormError(null);
    setShowNewClientForm(false);
    triggerToast(`Cliente ${newClientObj.name} registrada!`);
  };

  const handleStartEditComanda = (c: Comanda) => {
    setEditingComandaId(c.id);
    const targetC = clients.find(cl => cl.id === c.clientId);
    setSelectedClient(targetC || {
      id: c.clientId,
      salonId,
      name: c.clientName,
      phone: c.clientPhone,
      fidelityPoints: 0
    });
    setComandaServicesList(c.services);
    setComandaProductsList(c.products || []);
    setSelectedProfessional('');
    setProfSearchText('');
    setShowProfSearchResults(false);
    setActiveCategory('Todos');
    
    // Set payment states from editing comanda
    const initialMethod = c.isFiado ? 'Duplicata' : (c.paymentMethod === 'Caderno' ? 'Duplicata' : (c.paymentMethod || 'Pix'));
    setPaymentMethodSelected(initialMethod);
    setIsFiado(!!c.isFiado);

    setSelectedBrand(c.cardBrand || 'Visa');
    setSelectedInstallments(c.cardInstallments || 1);
    setProfDeductPercentage(c.profDeductPercentage ?? (currentSalon?.cardFeePercentProfDeduct ?? 0));
    setSalonDeductPercentage(c.salonDeductPercentage ?? (100 - (currentSalon?.cardFeePercentProfDeduct ?? 0)));

    const activeAcq = cardAcquirers.find(a => a.id === c.cardAcquirerId) || cardAcquirers.find(a => a.isActive) || cardAcquirers[0];
    if (activeAcq) {
      setSelectedAcquirerId(activeAcq.id);
    } else {
      setSelectedAcquirerId('');
    }

    setEditDateCreated(c.dateCreated || '');
    setEditCompetenceDate(c.competenceDate || '');
    setEditPaymentDate(c.paymentDate || '');
    setShowNewComandaModal(true);
  };

  // Submit payment selection on card and finalize
  const handleSubmitCardPayment = async (comandaId: string, skipWA = false, forceConfirm = false) => {
    const isFiadoType = cardPaymentMethod === 'Duplicata';
    const methodStr = isFiadoType ? 'Caderno' : cardPaymentMethod;

    const comanda = comandas.filter(c => !c.deletedAt).find(c => c.id === comandaId);
    if (!comanda) return;

    // Preventative double-confirmation modal for credit/debit card payments
    if ((cardPaymentMethod === 'Cartão Credito' || cardPaymentMethod === 'Cartão Debito') && !forceConfirm) {
      setShowCardConfirmModal({ comandaId, skipWA });
      return;
    }
    let cardDetails: any = undefined;
    if (cardPaymentMethod === 'Cartão Credito' || cardPaymentMethod === 'Cartão Debito') {
      const calc = getCardFeeCalculations(comanda.totalValue, cardPaymentMethod);
      cardDetails = {
        cardAcquirerId: calc.acquirerId,
        cardAcquirerName: calc.acquirerName,
        cardBrand: selectedBrand,
        cardInstallments: cardPaymentMethod === 'Cartão Debito' ? 1 : selectedInstallments,
        cardFeeAmount: calc.feeAmount,
        cardFeeRateUsed: calc.rate,
        profDeductPercentage,
        salonDeductPercentage
      };
    }

    // Passa o pixBRCode (já gerado via endpoint fresco) como payload
    // final. O dataStore apenas persiste o artefato — não conhece a
    // config PIX. Garante que o QR persistido bate com o exibido.
    const pixPayloadForStore = methodStr === 'Pix' ? pixBRCode : undefined;
    const todayStr = new Date().toISOString().split('T')[0];
    const dateOverrides = {
      competenceDate: editCompetenceDate || comanda.competenceDate || todayStr,
      paymentDate: editPaymentDate || todayStr
    };

    // SINGLE SOURCE OF TRUTH: await persiste status, datas, comissões,
    // financeiro e fidelidade TUDO em uma única chamada. Não existe
    // segundo update — nenhuma outra gravação pode sobrescrever.
    setIsSubmittingPayment(true);
    try {
      await onUpdateStatus(comandaId, 'Concluido', methodStr, isFiadoType, cardDetails, pixPayloadForStore, dateOverrides);
    } finally {
      setIsSubmittingPayment(false);
    }
    setActiveCheckoutComandaId(null);
    triggerToast(`Comanda faturada com sucesso via ${cardPaymentMethod}!`);

    if (skipWA) {
      return;
    }

    // Whatsapp Dispatch trigger automatically
    if (comanda) {
      const servNamesList = comanda.services.map(s => ` - ${s.name}: ${formatCurrency(s.price)}`).join('%0A');
      const waLink = generateWhatsAppLink(
        comanda.clientPhone, 
        comanda.clientName, 
        comanda.ticketNumber, 
        servNamesList, 
        comanda.totalValue, 
        isFiadoType, 
        salonName
      );
      window.open(waLink, '_blank');
    }
  };

  // Dynamic categories based on the selected professional's authorized specialties
  const allowedCategories = (() => {
    if (!selectedProfessional) {
      return Array.from(new Set([
        'Todos',
        'Cabelo', 'Unhas', 'Estética', 'Outros',
        ...serviceCategories.map(sc => sc.name)
      ]));
    }
    const pObj = professionals.find(p => p.id === selectedProfessional);
    if (!pObj || !pObj.specialties || pObj.specialties.length === 0) {
      return ['Todos'];
    }
    const profServices = services.filter(s => pObj.specialties?.includes(s.id));
    const catsAndEmpty = profServices.map(s => s.category?.trim() || 'Outros');
    const uniqueCats = Array.from(new Set(catsAndEmpty)).sort((a, b) => a.localeCompare(b));
    return ['Todos', ...uniqueCats];
  })();

  return (
    <div className="space-y-6">
      
      {/* View Switcher Controls */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit font-sans border border-gray-200">
        <button
          onClick={() => setActiveView('kanban')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeView === 'kanban' 
              ? 'bg-stone-950 text-[#eed093] shadow-xs' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-gray-200'
          }`}
        >
          Painel Kanban de Hoje
        </button>
        <button
          onClick={() => setActiveView('maintenance')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeView === 'maintenance' 
              ? 'bg-stone-950 text-[#eed093] shadow-xs' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-gray-200'
          }`}
        >
          Histórico e Manutenção de Comandas
        </button>
      </div>

      {/* Header filter controls */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gold-200/40">
        
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-450 w-4.5 h-4.5" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2.5 bg-[#FCF9F2] text-xs border border-gray-250 rounded-lg focus:border-gold-500 focus:outline-none"
            placeholder="Buscar por código comanda, cliente ou serviço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Period selection */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Report date type filter */}
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold ml-1 mb-1">Filtrar Relatório Por</span>
            <div className="inline-flex rounded-lg border border-stone-250 p-0.5 bg-stone-50">
              <button
                onClick={() => setReportDateType('lancamento')}
                className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-md transition-all ${
                  reportDateType === 'lancamento' ? 'bg-black text-white' : 'text-stone-500'
                }`}
              >
                Lançamento
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
            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold ml-1 mb-1">Mês</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-[#FCF9F2] text-xs font-bold border border-gray-200 rounded-lg py-1.5 px-2.5 focus:outline-none"
            >
              {months.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col w-20">
            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold ml-1 mb-1">Ano</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-[#FCF9F2] text-xs font-bold border border-gray-200 rounded-lg py-1.5 px-2.5 focus:outline-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <button
            onClick={() => {
              setEditingComandaId(null);
              setSelectedClient(null);
              setComandaServicesList([]);
              setComandaProductsList([]);
              setSelectedProfessional('');
              setProfSearchText('');
              setShowProfSearchResults(false);
              setActiveCategory('Todos');
              setPaymentMethodSelected('Pix');
              setIsFiado(false);
              setEditDateCreated(new Date().toISOString().substring(0, 16));
              setEditCompetenceDate('');
              setEditPaymentDate('');

              setSelectedBrand('Visa');
              setSelectedInstallments(1);
              setProfDeductPercentage(currentSalon?.cardFeePercentProfDeduct ?? 0);
              setSalonDeductPercentage(100 - (currentSalon?.cardFeePercentProfDeduct ?? 0));
              const firstAcq = cardAcquirers.find(a => a.isActive) || cardAcquirers[0];
              setSelectedAcquirerId(firstAcq ? firstAcq.id : '');

              setShowNewComandaModal(true);
            }}
            className="h-[40px] uppercase font-sans tracking-wide text-[11px] font-black bg-black text-white px-5 rounded-full hover:bg-[#a0854c] transition mt-4 lg:mt-0 cursor-pointer"
          >
            Abrir Comanda
          </button>
        </div>
      </div>

      {activeView === 'maintenance' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-250 overflow-hidden font-sans animate-fade-in">
          <div className="p-5 border-b border-gray-100 bg-[#FCF9F2]">
            <h3 className="text-xs font-bold text-stone-850 uppercase tracking-widest">Histórico e Central de Manutenção de Comandas</h3>
            <p className="text-[11px] text-stone-500 mt-1">Consulte, edite ou exclua qualquer comanda de qualquer período utilizando a busca e os filtros de competência acima.</p>
          </div>
          
          <div className="overflow-x-auto">
            {/* PD-26: min-w garante overflow horizontal em telas <768px sem quebrar layout */}
            <table className="w-full min-w-[640px] text-xs text-left text-stone-600">
              <thead className="bg-[#FCF9F2] text-[10px] text-stone-500 uppercase tracking-wider border-b border-gray-150">
                <tr>
                  <th className="px-6 py-4 font-bold">Código / Data de Lancto</th>
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Serviços e Profissionais</th>
                  <th className="px-6 py-4 font-bold text-right">Valor Total</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Forma de Pagto / Data Liquid.</th>
                  <th className="px-6 py-4 font-bold text-center">Ações de Manutenção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredComandas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-stone-400 italic">
                      Nenhuma comanda encontrada para os termos pesquisados e o período selecionado.
                    </td>
                  </tr>
                ) : (
                  filteredComandas.map(c => {
                    const statusColors = {
                      'Aberto': 'bg-blue-50 text-blue-700 border-blue-200',
                      'Em Atendimento': 'bg-amber-50 text-amber-700 border-amber-200',
                      'Concluido': 'bg-green-50 text-green-700 border-green-200',
                      'Outros': 'bg-neutral-100 text-neutral-700 border-neutral-200'
                    };
                    
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 block leading-relaxed">
                          <span className="font-bold text-stone-900 block font-mono">{c.ticketNumber}</span>
                          <span className="text-stone-400 block font-mono text-[10px]">{formatDateBR(c.dateCreated)}{c.dateCreated?.includes('T') ? ' ' + c.dateCreated.split('T')[1].substring(0, 5) : ''}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-stone-900">{c.clientName}</div>
                          <a 
                            href={`https://wa.me/55${c.clientPhone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-green-600 hover:underline font-mono text-[10px] font-bold block whitespace-nowrap"
                          >
                            {c.clientPhone}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 max-w-[280px]">
                            {c.services.map((s, sIdx) => (
                              <div key={sIdx} className="bg-stone-50 border border-stone-200/60 rounded px-2 py-1 flex flex-col">
                                <div className="flex justify-between font-bold text-stone-800 text-[10.5px]">
                                  <span>{s.name}</span>
                                  <span className="text-stone-900">{formatCurrency(s.price)}</span>
                                </div>
                                <div className="text-[9px] text-[#937b42] flex justify-between mt-0.5 font-mono">
                                  <span>Prof: {s.professionalName}</span>
                                  <span className="text-stone-450">Comissão: {s.commissionRate}% ({formatCurrency(s.commissionValue)})</span>
                                </div>
                              </div>
                            ))}
                            {c.products && c.products.map((p, pIdx) => (
                              <div key={`p-${pIdx}`} className="bg-emerald-50/55 border border-emerald-200/60 rounded px-2 py-1 flex flex-col">
                                <div className="flex justify-between font-bold text-emerald-900 text-[10.5px]">
                                  <span>📦 {p.name}</span>
                                  <span className="text-emerald-950">{formatCurrency(p.price)}</span>
                                </div>
                                <div className="text-[9px] text-emerald-800 flex justify-between mt-0.5 font-mono">
                                  <span>Vendedor: {p.professionalName || 'Salão'}</span>
                                  <span className="text-emerald-600">Comissão: {p.commissionRate || 0}% ({formatCurrency(p.commissionValue || 0)})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-stone-900 text-sm font-mono">
                          {formatCurrency(c.totalValue)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${statusColors[c.status as keyof typeof statusColors] || 'bg-stone-50 border-stone-200 text-stone-600'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono leading-relaxed">
                          {c.status === 'Concluido' ? (
                            <>
                              <span className="font-bold text-stone-800 font-sans block text-[11px]">
                                {c.isFiado ? 'Duplicata / Caderno' : (c.paymentMethod || 'Não selecionado')}
                              </span>
                              {c.paymentDate && <span className="text-stone-400 block text-[10px]">{formatDateBR(c.paymentDate)}</span>}
                            </>
                          ) : (
                            <span className="text-stone-400 italic font-sans">Em Aberto</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (isReadOnly) return;
                                handleStartEditComanda(c);
                              }}
                              className="px-2.5 py-1.5 border border-amber-200 text-amber-750 bg-amber-50/55 hover:bg-amber-100/50 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer text-[10px] tracking-wide uppercase"
                              title={isReadOnly ? TOOLTIP_READONLY : undefined}
                            >
                              <Edit2 className={`w-3 h-3 ${isReadOnly ? "opacity-50" : ""}`} />
                              <span className={isReadOnly ? "opacity-50" : ""}>Editar</span>
                            </button>
                            <button
                              onClick={(e) => {
                                if (isReadOnly) return;
                                e.stopPropagation();
                                setComandaToDelete(c);
                              }}
                              className="px-2.5 py-1.5 border border-rose-200 text-rose-600 bg-rose-50/55 hover:bg-rose-100/50 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer text-[10px] tracking-wide uppercase"
                              title={isReadOnly ? TOOLTIP_READONLY : undefined}
                            >
                              <Trash2 className={`w-3.5 h-3.5 ${isReadOnly ? "opacity-50" : ""}`} />
                              <span className={isReadOnly ? "opacity-50" : ""}>Excluir</span>
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
        </div>
      ) : (
        /* Kanban Board Container with drag and drop handlers */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(col => {
            const colComandas = filteredComandas.filter(c => {
              if (c.status !== col.status) return false;
              if (col.status === 'Concluido') {
                const todayStr = new Date().toISOString().split('T')[0];
                const conclusionDate = c.paymentDate || c.dateCreated.split('T')[0];
                return conclusionDate === todayStr;
              }
              return true;
            });
            return (
              <div 
                key={col.status} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropColumn(e, col.status)}
                className="bg-white rounded-xl shadow-sm border border-gray-200/90 overflow-hidden flex flex-col justify-start h-full"
              >
                {/* Header block of Kanban column */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FCF9F2]">
                   <div className="flex items-center gap-2">
                     <div className={`w-3 h-3 rounded-full ${col.colorClass}`} />
                     <span className="font-bold text-stone-800 text-xs uppercase font-sans">{col.title}</span>
                     <span className="bg-stone-200 text-stone-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                       {getColumnCount(col.status)}
                     </span>
                   </div>
                   <span className="text-xs font-sans font-bold text-stone-800">
                     {formatCurrency(getColumnTotal(col.status))}
                   </span>
                </div>

                {/* Cards vertical list */}
                <div className="p-4 space-y-4 min-h-[450px] bg-slate-50/50 flex-1">
                  {colComandas.length === 0 ? (
                    <div className="h-56 flex flex-col items-center justify-center text-stone-400 text-center">
                      <FileText className="w-8 h-8 opacity-25 mb-1" />
                      <p className="text-xs italic">Não há comandas nesta fase</p>
                    </div>
                  ) : (
                    colComandas.map(c => {
                      const isConcluido = col.status === 'Concluido';

                      if (isConcluido) {
                        return (
                          <div
                            key={c.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, c.id)}
                            className={`bg-white rounded-xl border border-stone-200 shadow-xs hover:shadow-md transition p-3 cursor-grab active:cursor-grabbing flex flex-col justify-between relative group ${col.cardBorder}`}
                          >
                            <div className="flex flex-col gap-2">
                              {/* Header row: Ticket & Total Value */}
                              <div className="flex justify-between items-center bg-stone-50/75 p-1 px-2 rounded-lg border border-stone-150">
                                <span className="text-[11px] font-mono font-bold text-stone-600 flex items-center gap-1">
                                  <GripHorizontal className="w-3.5 h-3.5 text-stone-300" />
                                  {c.ticketNumber}
                                </span>
                                <span className="text-[11px] font-bold text-emerald-700 font-mono">
                                  {formatCurrency(c.totalValue)}
                                </span>
                              </div>

                              {/* Client Name */}
                              <h4 className="font-sans font-bold text-stone-900 text-[13px] px-1">{c.clientName}</h4>

                              {/* Compact Action Buttons row */}
                              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-stone-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    if (isReadOnly) return;
                                    e.stopPropagation();
                                    handleStartEditComanda(c);
                                  }}
                                  className="flex items-center justify-center gap-1 py-1.5 px-2 bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-stone-950 border border-stone-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  title={isReadOnly ? TOOLTIP_READONLY : "Editar Comanda"}
                                >
                                  <Edit2 className={`w-3 h-3 ${isReadOnly ? "opacity-50" : ""}`} />
                                  <span className={isReadOnly ? "opacity-50" : ""}>Editar</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    if (isReadOnly) return;
                                    e.stopPropagation();
                                    setComandaToDelete(c);
                                  }}
                                  className="flex items-center justify-center gap-1 py-1.5 px-2 bg-rose-50/40 hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-150 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  title={isReadOnly ? TOOLTIP_READONLY : "Deletar Comanda"}
                                >
                                  <Trash2 className={`w-3 h-3 ${isReadOnly ? "opacity-50" : ""}`} />
                                  <span className={isReadOnly ? "opacity-50" : ""}>Excluir</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const servNamesList = c.services.map(s => ` - ${s.name}: ${formatCurrency(s.price)}`).join('%0A');
                                    const waLink = generateWhatsAppLink(
                                      c.clientPhone, 
                                      c.clientName, 
                                      c.ticketNumber, 
                                      servNamesList, 
                                      c.totalValue, 
                                      c.isFiado, 
                                      salonName
                                    );
                                    window.open(waLink, '_blank');
                                  }}
                                  className="flex items-center justify-center gap-1 py-1.5 px-1 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border border-green-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  title="Enviar Recibo WhatsApp"
                                >
                                  <Send className="w-3 h-3 text-green-600" />
                                  <span>Recibo</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, c.id)}
                          className={`bg-white rounded-xl border border-stone-200 shadow-xs hover:shadow-md transition p-4 cursor-grab active:cursor-grabbing flex flex-col justify-between relative group ${col.cardBorder}`}
                        >
                          <div>
                            {/* Drag holder icon */}
                            <div className="flex justify-between items-center mb-2.5">
                              <span className="text-xs text-stone-400 font-mono font-bold flex items-center gap-1">
                                <GripHorizontal className="w-3.5 h-3.5 text-stone-300" />
                                {c.ticketNumber}
                              </span>

                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditComanda(c);
                                  }}
                                  className="p-1 border border-stone-200 rounded text-stone-500 hover:text-black hover:border-stone-400 bg-stone-50 cursor-pointer"
                                  title="Editar Comanda"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setComandaToDelete(c);
                                  }}
                                  className="p-1 border border-rose-150 rounded text-rose-500 hover:text-rose-700 hover:border-rose-300 bg-rose-50/50 cursor-pointer"
                                  title="Deletar Comanda"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <h4 className="font-sans font-bold text-gray-900 text-sm">{c.clientName}</h4>

                            {/* Services lists with respective professional bullet tags */}
                             <div className="space-y-1.5 pt-3 border-t border-dashed border-stone-100 mt-2">
                               {c.services.map((s, idx) => (
                                 <div key={idx} className="flex justify-between items-center text-[11px] text-stone-600">
                                   <span className="font-semibold">{s.name}</span>
                                   <span className="text-[10px] text-stone-400 block font-normal font-mono">({s.professionalName.split(' ')[0]})</span>
                                 </div>
                               ))}
                               {c.products && c.products.map((p, idx) => (
                                 <div key={`p-${idx}`} className="flex justify-between items-center text-[10.5px] text-emerald-800 italic">
                                   <span className="font-medium">📦 {p.name}</span>
                                   <span className="text-[9px] text-stone-400 block font-normal font-mono">({p.professionalName ? p.professionalName.split(' ')[0] : 'Salão'})</span>
                                 </div>
                               ))}
                             </div>

                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-stone-100 text-xs">
                              <span className="text-stone-450 uppercase font-sans">Total comanda</span>
                              <span className="font-sans font-black text-[#775a19]">{formatCurrency(c.totalValue)}</span>
                            </div>

                            {/* Checkout Drawer Inline */}
                            {activeCheckoutComandaId === c.id && (
                              <div className="mt-4 p-3 bg-[#FCF9F2] rounded-xl border border-gold-250 animate-fade-in space-y-3 z-10 relative">
                                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Faturamento Obrigatório</p>
                                
                                <select
                                  className="w-full bg-white border border-stone-300 rounded p-1.5 text-xs focus:outline-none"
                                  value={cardPaymentMethod}
                                  onChange={(e) => setCardPaymentMethod(e.target.value as any)}
                                >
                                  <option value="Pix">Pix</option>
                                  <option value="Dinheiro">Dinheiro</option>
                                  <option value="Cartão Credito">Cartão de Crédito</option>
                                  <option value="Cartão Debito">Cartão de Débito</option>
                                  <option value="Duplicata">Duplicata (Anotar p/ final do mês)</option>
                                </select>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[9px] text-stone-400 font-bold uppercase mb-0.5">Data do Atendimento</label>
                                    <input
                                      type="date"
                                      className="w-full bg-white border border-stone-300 rounded p-1.5 text-xs focus:outline-none"
                                      value={editCompetenceDate}
                                      onChange={(e) => setEditCompetenceDate(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] text-stone-400 font-bold uppercase mb-0.5">Data do Pagamento</label>
                                    <input
                                      type="date"
                                      className="w-full bg-white border border-stone-300 rounded p-1.5 text-xs focus:outline-none"
                                      value={editPaymentDate}
                                      onChange={(e) => setEditPaymentDate(e.target.value)}
                                    />
                                  </div>
                                </div>

                                {(cardPaymentMethod === 'Cartão Credito' || cardPaymentMethod === 'Cartão Debito') && (
                                  <div className="bg-white p-2.5 rounded-lg border border-stone-200 space-y-2 text-[11px] text-stone-700">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-[9px] text-stone-400 font-bold uppercase mb-0.5">Administradora</label>
                                        <select
                                          className="w-full bg-slate-50 border border-stone-200 rounded p-1 text-[11px] font-sans focus:outline-none"
                                          value={selectedAcquirerId}
                                          onChange={(e) => setSelectedAcquirerId(e.target.value)}
                                        >
                                          <option value="">Selecione...</option>
                                          {cardAcquirers.map(acq => (
                                            <option key={acq.id} value={acq.id}>{acq.name} {acq.isActive ? '' : '(Inativa)'}</option>
                                          ))}
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[9px] text-stone-400 font-bold uppercase mb-0.5">Bandeira</label>
                                        <select
                                          className="w-full bg-slate-50 border border-stone-200 rounded p-1 text-[11px] font-sans focus:outline-none"
                                          value={selectedBrand}
                                          onChange={(e) => setSelectedBrand(e.target.value)}
                                        >
                                          {['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outros'].map(b => (
                                            <option key={b} value={b}>{b}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {cardPaymentMethod === 'Cartão Credito' && (
                                      <div>
                                        <label className="block text-[9px] text-stone-400 font-bold uppercase mb-0.5">Parcelamento</label>
                                        <select
                                          className="w-full bg-slate-50 border border-stone-200 rounded p-1 text-[11px] focus:outline-none font-sans font-bold"
                                          value={selectedInstallments}
                                          onChange={(e) => setSelectedInstallments(Number(e.target.value))}
                                        >
                                          <option value={1}>1x (Crédito à Vista)</option>
                                          <option value={2}>2x</option>
                                          <option value={3}>3x</option>
                                        </select>
                                      </div>
                                    )}

                                    {(() => {
                                      const calc = getCardFeeCalculations(c.totalValue, cardPaymentMethod);
                                      return (
                                        <div className="bg-stone-50 p-2 rounded border border-stone-100 font-sans space-y-1 text-[10.5px]">
                                          <div className="flex justify-between font-mono text-[9.5px] text-stone-500">
                                            <span>Taxa de Operação:</span>
                                            <span className="font-bold">{calc.rate}%</span>
                                          </div>
                                          <div className="flex justify-between font-mono text-[9.5px] text-stone-500">
                                            <span>Custo da Taxa:</span>
                                            <span className="font-bold text-rose-600">-{formatCurrency(calc.feeAmount)}</span>
                                          </div>
                                          
                                          <div className="border-t border-stone-200 pt-1.5 mt-1 space-y-1">
                                            <label className="block text-[9px] text-stone-400 font-bold uppercase">Divisão de Custos da Taxa (Parametrizada)</label>
                                            <div className="flex justify-between items-center bg-stone-100 p-1.5 rounded border border-stone-200 font-semibold leading-normal font-sans my-1 text-[9.5px]">
                                              <span className="text-stone-500">Regra Ativa:</span>
                                              <span className="font-mono text-[9px] text-[#eed093] bg-zinc-900 border border-[#a0854c]/30 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
                                                {profDeductPercentage}% Prof. / {salonDeductPercentage}% Salão
                                              </span>
                                            </div>
                                            <div className="flex gap-1 hidden">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setProfDeductPercentage(0);
                                                  setSalonDeductPercentage(100);
                                                }}
                                                className={`flex-1 text-[8.5px] font-bold py-0.5 px-1 rounded transition ${
                                                  profDeductPercentage === 0 
                                                    ? 'bg-stone-800 text-white' 
                                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                                                }`}
                                              >
                                                Não repassar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setProfDeductPercentage(50);
                                                  setSalonDeductPercentage(50);
                                                }}
                                                className={`flex-1 text-[8.5px] font-bold py-0.5 px-1 rounded transition ${
                                                  profDeductPercentage === 50 
                                                    ? 'bg-amber-600 text-white' 
                                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                                                }`}
                                              >
                                                Meio a meio
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setProfDeductPercentage(100);
                                                  setSalonDeductPercentage(0);
                                                }}
                                                className={`flex-1 text-[8.5px] font-bold py-0.5 px-1 rounded transition ${
                                                  profDeductPercentage === 100 
                                                    ? 'bg-rose-600 text-white' 
                                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                                                }`}
                                              >
                                                Completo
                                              </button>
                                            </div>

                                            <div className="flex items-center gap-1 pt-1 justify-between hidden">
                                              <div className="flex items-center gap-0.5">
                                                <span className="text-[9px] text-stone-400 font-semibold">Prof:</span>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  className="w-10 text-center font-bold bg-slate-100 border border-stone-250 rounded p-0.5 text-[9px]"
                                                  value={profDeductPercentage}
                                                  onChange={(e) => {
                                                    const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                                    setProfDeductPercentage(val);
                                                    setSalonDeductPercentage(100 - val);
                                                  }}
                                                />
                                                <span className="text-[9px] text-stone-400">%</span>
                                              </div>

                                              <div className="flex items-center gap-0.5">
                                                <span className="text-[9px] text-stone-400 font-semibold">Salão:</span>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  className="w-10 text-center font-bold bg-slate-100 border border-stone-250 rounded p-0.5 text-[9px]"
                                                  value={salonDeductPercentage}
                                                  onChange={(e) => {
                                                    const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                                    setSalonDeductPercentage(val);
                                                    setProfDeductPercentage(100 - val);
                                                  }}
                                                />
                                                <span className="text-[9px] text-stone-400">%</span>
                                              </div>
                                            </div>

                                            <div className="border-t border-dashed border-stone-200 pt-1 mt-1 text-[9.5px] text-stone-500 font-sans space-y-0.5">
                                              <p className="flex justify-between">
                                                <span>Desconto Comissão:</span>
                                                <strong className="text-rose-600">-{formatCurrency(calc.profDeduction)}</strong>
                                              </p>
                                              <p className="flex justify-between">
                                                <span>Salão Absorve:</span>
                                                <strong className="text-stone-700">{formatCurrency(calc.salonAbsorbed)}</strong>
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}

                                {cardPaymentMethod === 'Pix' && (
                                  <div className="bg-white p-3 rounded-lg border border-stone-200 space-y-3 text-[11px] text-stone-700">
                                    {pixBRCode ? (
                                      <>
                                        <div className="flex justify-center">
                                          <canvas ref={pixCanvasRef} className="rounded-lg" />
                                        </div>
                                        <div className="bg-stone-50 p-2.5 rounded border border-stone-100">
                                          <p className="text-[9px] text-stone-400 font-bold uppercase mb-1">PIX Copia e Cola</p>
                                          <p className="text-[9px] font-mono break-all select-all bg-white p-2 rounded border border-stone-200">{pixBRCode}</p>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={handleCopyPixCode}
                                            className="flex-1 bg-stone-800 text-white text-[10px] py-1.5 px-2 rounded font-bold hover:bg-stone-700 transition cursor-pointer"
                                          >
                                            Copiar Código PIX
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleRefreshPixQR}
                                            className="flex-1 bg-stone-100 border border-stone-300 text-stone-700 text-[10px] py-1.5 px-2 rounded font-bold hover:bg-stone-200 transition cursor-pointer"
                                          >
                                            Atualizar QR Code
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-center py-4">
                                        {!pixBRCode ? (
                                          <p className="text-[10px] text-stone-400">Configure a chave PIX nas Configurações do Salão.</p>
                                        ) : (
                                          <p className="text-[10px] text-stone-400">PIX pronto para recebimento.</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-col gap-1.5 pt-1">
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSubmitCardPayment(c.id, true)}
                                      disabled={isSubmittingPayment}
                                      className={`flex-1 text-white text-[10px] py-1.5 px-1 rounded font-bold transition ${isSubmittingPayment ? 'bg-stone-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-[#a0854c] cursor-pointer'}`}
                                      title={isSubmittingPayment ? 'Faturando...' : 'Faturar sem abrir WhatsApp'}
                                    >
                                      {isSubmittingPayment ? 'Faturando...' : 'Apenas Faturar'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSubmitCardPayment(c.id, false)}
                                      disabled={isSubmittingPayment}
                                      className={`flex-1 text-white text-[10px] py-1.5 px-1 rounded font-bold transition flex items-center justify-center gap-0.5 ${isSubmittingPayment ? 'bg-stone-400 cursor-not-allowed' : 'bg-green-700 hover:bg-green-800 cursor-pointer'}`}
                                      title={isSubmittingPayment ? 'Faturando...' : 'Faturar e enviar comprovante via WhatsApp'}
                                    >
                                      {isSubmittingPayment ? 'Faturando...' : 'Lançar e WA 🚀'}
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setActiveCheckoutComandaId(null)}
                                    className="w-full border border-stone-300 bg-white hover:bg-stone-50 text-stone-600 py-1 rounded text-[10px] uppercase font-bold transition cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}

                            {c.isFiado && (
                              <span className="inline-block mt-2.5 bg-rose-50 text-rose-700 text-[10px] px-2 py-0.5 rounded-full border border-rose-200 font-bold font-mono">
                                Duplicata Pendente
                              </span>
                            )}
                            {!c.isFiado && c.status === 'Concluido' && (
                              <span className="inline-block mt-2.5 bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200 font-bold font-mono">
                                Liquidado via {c.paymentMethod || 'Pix'}
                              </span>
                            )}
                          </div>

                          {/* Workflow Buttons matching exact requests */}
                          <div className="mt-4 pt-3 border-t border-stone-100 flex justify-between items-center gap-2">
                            {c.status === 'Aberto' && (
                              <button
                                onClick={() => {
                                  onUpdateStatus(c.id, 'Em Atendimento');
                                  triggerToast(`Comanda ${c.ticketNumber} iniciada!`);
                                }}
                                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold py-1.5 px-2 rounded-lg transition text-[11px] uppercase tracking-wide cursor-pointer"
                              >
                                Iniciar Atendimento
                              </button>
                            )}

                            {c.status === 'Em Atendimento' && (
                              <button
                                onClick={() => {
                                  const initialMethod = c.isFiado ? 'Duplicata' : (c.paymentMethod === 'Caderno' ? 'Duplicata' : (c.paymentMethod || 'Pix'));
                                  setCardPaymentMethod(initialMethod as any);
                                  setActiveCheckoutComandaId(c.id);
                                  const today = new Date().toISOString().split('T')[0];
                                  setEditCompetenceDate(c.competenceDate || today);
                                  setEditPaymentDate(c.paymentDate || today);
                                }}
                                className="w-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-bold py-1.5 px-2 rounded-lg transition text-[11px] uppercase tracking-wide cursor-pointer"
                              >
                                Faturar Comanda
                              </button>
                            )}

                            {c.status === 'Concluido' && (
                              <button
                                onClick={() => {
                                  const servNamesList = c.services.map(s => ` - ${s.name}: ${formatCurrency(s.price)}`).join('%0A');
                                  const waLink = generateWhatsAppLink(
                                    c.clientPhone, 
                                    c.clientName, 
                                    c.ticketNumber, 
                                    servNamesList, 
                                    c.totalValue, 
                                    c.isFiado, 
                                    salonName
                                  );
                                  window.open(waLink, '_blank');
                                }}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-stone-700 border border-slate-300 font-sans py-1.5 px-2 rounded-lg transition text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5 text-green-600" />
                                <span>Reenviar Recibo WA</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Card Payment Double-Confirmation Modal */}
      {showCardConfirmModal && (() => {
        const { comandaId, skipWA } = showCardConfirmModal;
        const comanda = comandas.filter(c => !c.deletedAt).find(c => c.id === comandaId);
        if (!comanda) return null;

        const calc = getCardFeeCalculations(comanda.totalValue, cardPaymentMethod);
        const installmentsText = cardPaymentMethod === 'Cartão Debito' 
          ? 'Apenas Débito (À vista)' 
          : `${selectedInstallments}x no Crédito`;

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] animate-fade-in p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-stone-200 p-5 space-y-4 animate-scale-up text-left">
              
              <div className="text-center space-y-1">
                <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-105">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest mt-1">Conferência Balanço de Cartão</h3>
                <p className="text-[9.5px] text-stone-400 font-sans">Confirme se digitou corretamente os dados na maquininha física</p>
              </div>

              <div className="bg-stone-50 rounded-xl border border-stone-200 p-3.5 space-y-2.5 font-sans">
                <div className="flex justify-between items-center text-[10px] pb-1.5 border-b border-stone-200">
                  <span className="text-stone-400 font-bold uppercase">Cliente / Comanda:</span>
                  <span className="font-extrabold text-stone-900 font-mono text-[10.5px]">{comanda.clientName} ({comanda.ticketNumber})</span>
                </div>

                <div className="space-y-1.5 text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Credenciadora / Maquininha:</span>
                    <strong className="text-stone-850 font-bold">{calc.acquirerName || 'Indefinida'}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-stone-500">Bandeira do Cartão:</span>
                    <strong className="text-stone-800 bg-stone-200/50 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">{selectedBrand}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-stone-500">Tipo / Parcelamento:</span>
                    <strong className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-black text-[9.5px] font-mono">{installmentsText}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-stone-500">Taxa Admin:</span>
                    <strong className="text-stone-705 font-mono">{calc.rate}% (-{formatCurrency(calc.feeAmount)})</strong>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-dashed border-stone-200 items-center">
                    <span className="text-stone-900 font-black uppercase text-[9.5px] tracking-wider">Valor total digitado:</span>
                    <span className="text-base font-black text-[#a0854c] font-mono">{formatCurrency(comanda.totalValue)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#FAF8F5] p-3 rounded-lg border border-amber-200/70 text-stone-600 flex gap-2 leading-relaxed text-[9px] font-semibold">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-stone-900 mb-0.5 text-[9.5px] uppercase tracking-wide">Prevenção Antifalha de Registro</strong>
                  O valor de <span className="underline font-black">{formatCurrency(comanda.totalValue)}</span> foi digitado e aprovado com sucesso na sua máquina física <strong className="underline text-stone-800">{calc.acquirerName}</strong>? Isso impede inconsistências no caixa comercial!
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isSubmittingPayment}
                  onClick={() => {
                    handleSubmitCardPayment(comandaId, skipWA, true);
                    setShowCardConfirmModal(null);
                  }}
                  className={`flex-1 text-white font-black tracking-widest py-2.5 px-3 rounded-lg text-[9.5px] uppercase transition shadow-xs ${isSubmittingPayment ? 'bg-stone-400 cursor-not-allowed' : 'bg-green-700 hover:bg-green-800 cursor-pointer'}`}
                >
                  {isSubmittingPayment ? 'Faturando...' : 'Confirmar e Registrar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCardConfirmModal(null)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 px-3 rounded-lg text-[9.5px] uppercase border border-stone-250 cursor-pointer transition"
                >
                  Voltar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Persistent Toast notification feedback */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[100] bg-zinc-950 text-[#eed093] text-xs font-bold rounded-lg px-5 py-3.5 shadow-xl flex items-center gap-3 animate-fade-in animate-bounce">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span>{toastMessage}</span>
        </div>
      )}

      <AlertModal
        open={!!alertState}
        message={alertState?.message || ''}
        variant={alertState?.variant || 'info'}
        onClose={() => setAlertState(null)}
      />

      {/* CREATE COMANDA AND MULTI-PROFESSIONAL COMMISSION MAPPER MODAL */}
      {showNewComandaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 overflow-y-auto p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col md:flex-row max-h-[90vh] overflow-y-auto md:overflow-hidden border border-gold-200 p-0 animate-scale-up">
            
            {/* Left Column: Multitasking panel config */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-gray-150">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-xl font-serif font-bold text-gray-950">
                    {editingComandaId ? "Editar Comanda de Atendimento" : "Abrir Ficha de Comanda"}
                  </h3>
                  <p className="text-xs text-stone-500">Configure os atendimentos, selecione quem executa para comissão e fature à vista ou a prazo.</p>
                </div>
                <button 
                  onClick={() => setShowNewComandaModal(false)}
                  className="p-1 px-3 bg-stone-50 text-stone-500 rounded font-bold hover:bg-stone-100"
                >
                  ✕
                </button>
              </div>

              {/* Step 1: Client select or quick add */}
              <div className="bg-[#FCF9F2] p-4 rounded-xl border border-gold-200/40 mb-5 space-y-3">
                <div className="flex justify-between items-center bg-stone-50/50 p-2 rounded">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#eed093] font-sans">Passo 1: Selecione ou Cadastre o Cliente</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isReadOnly) return;
                      setShowNewClientForm(!showNewClientForm);
                      setClientFormError(null);
                    }}
                    className="text-[11px] text-zinc-900 underline font-bold focus:outline-none"
                    title={isReadOnly ? TOOLTIP_READONLY : undefined}
                  >
                    <span className={isReadOnly ? "opacity-50" : ""}>
                      {showNewClientForm ? "Cancelar no Cadastro" : "Criar Novo Cliente +"}
                    </span>
                  </button>
                </div>

                {showNewClientForm ? (
                  <form onSubmit={handleCreateNewClient} className="space-y-3 bg-white p-4 rounded-lg border border-gold-100/55">
                    {clientFormError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-lg text-[11px] leading-relaxed flex items-start gap-1.5 font-sans">
                        <span className="text-sm">⚠️</span>
                        <div>{clientFormError}</div>
                      </div>
                    )}
                    <p className="text-[11px] font-bold text-stone-800">Cadastro de Cliente Rápido (Nome + Sobrenome)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          required
                          className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded"
                          placeholder="ex: Mariana Costa"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded"
                          placeholder="WhatsApp Celular"
                          value={newClientPhone}
                          onChange={(e) => setNewClientPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isReadOnly}
                      title={isReadOnly ? TOOLTIP_READONLY : undefined}
                      className="w-full bg-black text-white py-2 rounded font-bold hover:bg-gold-800 transition text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cadastrar Cliente
                    </button>
                  </form>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs"
                      placeholder="Pesquise por nome, sobrenome ou telefone..."
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientResults(true);
                      }}
                      onFocus={() => setShowClientResults(true)}
                    />

                    {selectedClient ? (
                      <div className="mt-2.5 flex items-center justify-between bg-white border border-amber-200 p-3 rounded-lg">
                        <div>
                          <p className="text-xs font-bold text-stone-900">{selectedClient.name}</p>
                          <p className="text-[10px] text-stone-400 font-mono font-bold">{selectedClient.phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedClient(null)}
                          className="text-stone-400 hover:text-rose-500 font-bold"
                        >
                          Alterar
                        </button>
                      </div>
                    ) : (
                      showClientResults && clientSearch && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto z-40">
                          {filteredClientSuggestions.length === 0 ? (
                            <p className="p-3 text-stone-400 italic text-center">Nenhum cliente correspondente.</p>
                          ) : (
                            filteredClientSuggestions.map(currC => (
                              <div
                                key={currC.id}
                                className="p-2 text-xs border-b border-stone-50 hover:bg-[#FCF9F2] cursor-pointer flex justify-between"
                                onClick={() => {
                                  setSelectedClient(currC);
                                  setClientSearch('');
                                  setShowClientResults(false);
                                }}
                              >
                                <span className="font-bold">{currC.name}</span>
                                <span className="text-stone-400">{currC.phone}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Choose professional FIRST to display services */}
              <div id="comanda-professionals-search-block" className="bg-[#FCF9F2] p-4 rounded-xl border border-gold-200/40 mb-5 space-y-3 relative">
                <span className="text-[10px] block font-bold uppercase tracking-wider text-[#a0854c] font-sans font-black">Passo 2: Escolha o Profissional Responsável</span>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-9 py-2 bg-white text-xs border border-gray-200 rounded focus:border-[#a0854c] focus:outline-none placeholder-stone-400 font-sans"
                    placeholder="Busque o nome do colaborador..."
                    value={profSearchText}
                    onChange={(e) => {
                      setProfSearchText(e.target.value);
                      setShowProfSearchResults(true);
                    }}
                    onFocus={() => setShowProfSearchResults(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                  />
                  {(selectedProfessional || profSearchText) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProfessional('');
                        setProfSearchText('');
                        setShowProfSearchResults(false);
                        setActiveCategory('Todos');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 font-bold p-1 hover:bg-stone-100 rounded transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {showProfSearchResults && (
                  <div className="absolute left-4 right-4 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-stone-100">
                    {professionals
                      .filter(p => {
                        if (p.isActive === false) return false;
                        if (!p.specialties || p.specialties.length === 0) return false;
                        if (profSearchText.trim().length > 0) {
                          return p.name.toLowerCase().includes(profSearchText.toLowerCase());
                        }
                        return true;
                      })
                      .length === 0 ? (
                      <div className="p-3 text-stone-400 italic text-center text-[11px] font-sans">
                        Nenhum colaborador correspondente para "{profSearchText}"
                      </div>
                    ) : (
                      professionals
                        .filter(p => {
                          if (p.isActive === false) return false;
                          if (!p.specialties || p.specialties.length === 0) return false;
                          if (profSearchText.trim().length > 0) {
                            return p.name.toLowerCase().includes(profSearchText.toLowerCase());
                          }
                          return true;
                        })
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedProfessional(p.id);
                              setProfSearchText(p.name);
                              setShowProfSearchResults(false);
                              setActiveCategory('Todos');
                            }}
                            className="p-2.5 font-sans hover:bg-[#FCF9F2] cursor-pointer flex justify-between items-center transition text-left"
                          >
                            <span className="font-bold text-stone-850 text-xs">{p.name}</span>
                            <span className="text-[10px] text-stone-400 font-mono font-bold bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-full">
                              {p.category}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {selectedProfessional && (
                  <div className="mt-2 text-[10.5px] bg-white border border-dashed border-[#ecdcb9] rounded p-2 text-stone-850 flex justify-between items-center">
                    <div className="text-left font-sans">
                      Colaborador ativo: <strong className="text-stone-900 font-black">{professionals.find(p => p.id === selectedProfessional)?.name}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Show qualified services based on chosen professional */}
              <div className="bg-white p-4 rounded-xl border border-stone-250 space-y-4">
                <div className="flex justify-between items-center border-b border-dashed pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 font-sans">Passo 3: Serviços Habilitados do Profissional selecionado</span>
                  
                  <div className="flex gap-1 flex-wrap">
                    {allowedCategories.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setActiveCategory(c)}
                        className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded border transition ${
                          activeCategory === c ? 'bg-black text-white' : 'bg-[#FCF9F2] text-stone-600'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {!selectedProfessional ? (
                  <p className="text-center text-xs text-stone-400 italic py-6 bg-stone-50 rounded">
                    Por favor, escolha o profissional no Passo 2 para listar as suas especialidades!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto">
                    {matchingProfSpecialties().length === 0 ? (
                      <p className="text-center text-[10px] text-stone-500 col-span-2 italic">
                        Não existem procedimentos habilitados para a categoria "{activeCategory}" neste colaborador.
                      </p>
                    ) : (
                      matchingProfSpecialties().map(s => (
                        <div
                          key={s.id}
                          onClick={() => handleAddServiceItem(s)}
                          className="p-2 border border-stone-200 hover:border-black rounded hover:bg-[#FCF9F2]/40 transition cursor-pointer flex justify-between items-center font-sans text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-stone-900 block">{s.name}</span>
                            <span className="text-[9px] text-stone-400 font-mono font-bold">{s.category} • {s.durationMin} min</span>
                          </div>
                          <span className="font-sans font-black text-stone-800">{formatCurrency(s.price)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Passo 3.5: Venda de Produtos */}
              <div className="bg-white p-4 rounded-xl border border-stone-250 mt-4 space-y-4">
                <span className="text-[10px] block font-bold uppercase tracking-wider text-amber-600 font-sans">Passo 3.5: Adicionar Produtos à Venda</span>
                
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-550 mb-1">Selecionar Produto</label>
                    <select
                      id="comanda-product-select"
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded p-2 focus:outline-none focus:border-[#a0854c]"
                      defaultValue=""
                    >
                      <option value="">-- Escolha o produto --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-550 mb-1">Vendedor (Opcional)</label>
                    <select
                      id="comanda-seller-select"
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded p-2 focus:outline-none focus:border-[#a0854c]"
                      defaultValue=""
                    >
                      <option value="">-- Sem vendedor / Salão --</option>
                      {professionals.filter(p => p.isActive !== false).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-[#FCF9F2]/60 p-2.5 rounded border border-dashed border-stone-200">
                  <span className="text-[10px] text-stone-500 font-bold leading-normal mr-2">
                    💡 Regra: Se houver vendedor, calcula com base na comissão do profissional ou comissão do produto (prioridade).
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const prodSelect = document.getElementById('comanda-product-select') as HTMLSelectElement;
                      const sellerSelect = document.getElementById('comanda-seller-select') as HTMLSelectElement;
                      if (prodSelect && prodSelect.value) {
                        handleAddProductItem(prodSelect.value, sellerSelect.value);
                        prodSelect.value = "";
                        sellerSelect.value = "";
                      } else {
                        setAlertState({message: "Selecione um produto primeiro!"});
                      }
                    }}
                    className="bg-black hover:bg-gold-500 text-white font-bold text-[10px] uppercase py-1.5 px-3 rounded cursor-pointer transition flex-shrink-0"
                  >
                    Vender
                  </button>
                </div>
              </div>
            </div>

            {/* Right column: Sum and Payment checkout forms */}
            <div className="w-full md:w-[360px] bg-black text-white p-6 md:p-8 flex flex-col justify-between shrink-0 md:max-h-full md:overflow-y-auto custom-scrollbar">
              <div>
                <div className="pb-4 border-b border-stone-800 flex justify-between items-center mb-5">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-[#eed093]">Resumo da Comanda</span>
                  <span className="text-stone-500 text-xs">#{comandas.length + 1}</span>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <span className="text-[10px] text-stone-500 block uppercase font-mono">Cliente Atribuída</span>
                    <span className="font-bold text-sm text-[13px]">{selectedClient ? selectedClient.name : "Nenhum cliente selecionado"}</span>
                  </div>

                  <div className="space-y-2 border-t border-stone-850 pt-3">
                    <span className="text-[10px] text-stone-500 block uppercase font-mono">Procedimentos Selecionados</span>
                    {comandaServicesList.length === 0 ? (
                      <p className="text-stone-400 text-xs italic">Nenhum procedimento adicionado</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {comandaServicesList.map((item, idx) => (
                          <div key={idx} className="bg-stone-900/40 p-2 rounded border border-stone-800/60 flex justify-between text-xs items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-gray-100 block truncate">{item.name}</span>
                              <span className="text-[9px] text-[#eed093]">por {item.professionalName.split(' ')[0]}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={focusedPriceIndex === idx ? item.price : formatPriceInput(item.price)}
                                onChange={(e) => handleServicePriceChange(idx, parsePriceInput(e.target.value))}
                                onFocus={() => setFocusedPriceIndex(idx)}
                                onBlur={() => handlePriceBlur(idx)}
                                className="w-20 bg-stone-950 border border-stone-700 text-stone-200 font-mono font-bold text-xs rounded px-1.5 py-0.5 text-right focus:outline-none focus:border-[#eed093]"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveServiceItem(idx)}
                                className="text-rose-500 hover:text-rose-700 p-0.5 ml-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-stone-850 pt-3">
                    <span className="text-[10px] text-stone-500 block uppercase font-mono">Produtos Selecionados</span>
                    {comandaProductsList.length === 0 ? (
                      <p className="text-stone-500 text-xs italic">Nenhum produto adicionado</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {comandaProductsList.map((item, idx) => (
                          <div key={idx} className="bg-stone-900/40 p-2 rounded border border-stone-800/60 flex justify-between text-xs items-center gap-2">
                            <div>
                              <span className="font-bold text-gray-100 block">{item.name}</span>
                              <span className="text-[9px] text-amber-400">
                                Vendedor: {item.professionalName ? item.professionalName.split(' ')[0] : 'Salão / Loja'} ({item.commissionRate}%)
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="font-mono font-bold text-stone-200">{formatCurrency(item.price)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const list = [...comandaProductsList];
                                  list.splice(idx, 1);
                                  setComandaProductsList(list);
                                }}
                                className="text-rose-500 hover:text-rose-700 p-0.5 ml-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pricing Total block */}
                  <div className="pt-3 border-t border-stone-800 flex justify-between items-end text-white">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400">Total acumulado</span>
                      <p className="text-3xl font-black font-serif text-[#eed093] leading-none mt-1">
                        {formatCurrency(
                          comandaServicesList.reduce((sum, s) => sum + s.price, 0) + 
                          comandaProductsList.reduce((sum, p) => sum + p.price, 0)
                        )}
                      </p>
                    </div>
                    <span className="bg-stone-900 text-stone-450 border border-stone-800 text-[10.5px] font-mono px-2 py-0.5 rounded font-black">
                      {comandaServicesList.length + comandaProductsList.length} itens
                    </span>
                  </div>
                </div>

                {/* Paso 4: Forma de Pagamento Obrigatória */}
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4.5 space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#eed093]">Passo 4: Forma de Pagamento</label>
                    
                    <select
                      value={paymentMethodSelected}
                      onChange={(e) => {
                        setPaymentMethodSelected(e.target.value);
                        if (e.target.value === 'Duplicata') {
                          setIsFiado(true);
                        } else {
                          setIsFiado(false);
                        }
                      }}
                      className="w-full bg-black border border-stone-800 text-stone-250 p-2 rounded text-xs focus:outline-none focus:border-[#eed093]"
                    >
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão Credito">Cartão de Crédito</option>
                      <option value="Cartão Debito">Cartão de Débito</option>
                      <option value="Duplicata">Duplicata (Anotar no Caderno de Fiado)</option>
                    </select>

                    {(paymentMethodSelected === 'Cartão Credito' || paymentMethodSelected === 'Cartão Debito') && (
                      <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-2.5 text-xs text-stone-300 animate-fade-in">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-[#eed093] font-bold uppercase mb-0.5">Administradora</label>
                            <select
                              className="w-full bg-black border border-stone-800 text-stone-200 rounded p-1.5 text-[11px] font-sans focus:outline-none focus:border-[#eed093]"
                              value={selectedAcquirerId}
                              onChange={(e) => setSelectedAcquirerId(e.target.value)}
                            >
                              <option value="">Selecione...</option>
                              {cardAcquirers.map(acq => (
                                <option key={acq.id} value={acq.id}>{acq.name} {acq.isActive ? '' : '(Inativa)'}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] text-[#eed093] font-bold uppercase mb-0.5">Bandeira</label>
                            <select
                              className="w-full bg-black border border-stone-800 text-stone-200 rounded p-1.5 text-[11px] font-sans focus:outline-none focus:border-[#eed093]"
                              value={selectedBrand}
                              onChange={(e) => setSelectedBrand(e.target.value)}
                            >
                              {['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outros'].map(b => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {paymentMethodSelected === 'Cartão Credito' && (
                          <div>
                            <label className="block text-[9px] text-[#eed093] font-bold uppercase mb-0.5">Parcelamento</label>
                            <select
                              className="w-full bg-black border border-stone-800 text-[#eed093] rounded p-1.5 text-[11px] focus:outline-none focus:border-[#eed093] font-bold font-mono"
                              value={selectedInstallments}
                              onChange={(e) => setSelectedInstallments(Number(e.target.value))}
                            >
                              <option value={1}>1x (Crédito à Vista)</option>
                              <option value={2}>2x</option>
                              <option value={3}>3x</option>
                            </select>
                          </div>
                        )}

                        {(() => {
                          const totalVal = comandaServicesList.reduce((sum, s) => sum + s.price, 0) + 
                                           comandaProductsList.reduce((sum, p) => sum + p.price, 0);
                          const calc = getCardFeeCalculations(totalVal, paymentMethodSelected);
                          return (
                            <div className="bg-black p-2.5 rounded border border-stone-850 font-sans space-y-1.5 text-[10.5px]">
                              <div className="flex justify-between font-mono text-[10px] text-stone-400">
                                <span>Taxa de Operação:</span>
                                <span className="font-bold text-white">{calc.rate}%</span>
                              </div>
                              <div className="flex justify-between font-mono text-[10px] text-stone-400">
                                <span>Custo da Taxa:</span>
                                <span className="font-bold text-rose-500">-{formatCurrency(calc.feeAmount)}</span>
                              </div>
                              
                              <div className="border-t border-stone-800 pt-2 mt-1 space-y-2">
                                <label className="block text-[9px] text-[#eed093] font-bold uppercase">Repasse para Comissão do Colaborador</label>
                                <div className="flex justify-between items-center bg-[#1C1C1C] p-2 rounded border border-stone-800 font-semibold leading-normal font-sans my-1 text-[10px] text-stone-300">
                                  <span>Automático do Estabelecimento:</span>
                                  <span className="font-mono text-[9.5px] text-[#eed093] bg-black border border-stone-850 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                    {profDeductPercentage}% Prof. / {salonDeductPercentage}% Salão
                                  </span>
                                </div>
                                <div className="flex gap-1 hidden">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProfDeductPercentage(0);
                                      setSalonDeductPercentage(100);
                                    }}
                                    className={`flex-1 text-[8.5px] font-bold py-1.5 px-1 rounded transition uppercase tracking-wide cursor-pointer ${
                                      profDeductPercentage === 0 
                                        ? 'bg-[#eed093] text-stone-900 font-extrabold shadow-sm' 
                                        : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
                                    }`}
                                  >
                                    Não repassar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProfDeductPercentage(50);
                                      setSalonDeductPercentage(50);
                                    }}
                                    className={`flex-1 text-[8.5px] font-bold py-1.5 px-1 rounded transition uppercase tracking-wide cursor-pointer ${
                                      profDeductPercentage === 50 
                                        ? 'bg-[#eed093] text-stone-900 font-extrabold shadow-sm' 
                                        : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
                                    }`}
                                  >
                                    Meio a meio
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProfDeductPercentage(100);
                                      setSalonDeductPercentage(0);
                                    }}
                                    className={`flex-1 text-[8.5px] font-bold py-1.5 px-1 rounded transition uppercase tracking-wide cursor-pointer ${
                                      profDeductPercentage === 100 
                                        ? 'bg-[#eed093] text-stone-900 font-extrabold shadow-sm' 
                                        : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
                                    }`}
                                  >
                                    Completo
                                  </button>
                                </div>

                                <div className="flex items-center gap-1.5 pt-0.5 justify-between hidden">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-stone-400">Prof:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="w-12 text-center font-bold bg-stone-900 text-white border border-stone-800 rounded p-0.5 text-[10px]"
                                      value={profDeductPercentage}
                                      onChange={(e) => {
                                        const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                        setProfDeductPercentage(val);
                                        setSalonDeductPercentage(100 - val);
                                      }}
                                    />
                                    <span className="text-[10px] text-stone-400">%</span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-stone-400">Salão:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="w-12 text-center font-bold bg-stone-900 text-white border border-stone-800 rounded p-0.5 text-[10px]"
                                      value={salonDeductPercentage}
                                      onChange={(e) => {
                                        const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                        setSalonDeductPercentage(val);
                                        setProfDeductPercentage(100 - val);
                                      }}
                                    />
                                    <span className="text-[10px] text-stone-400">%</span>
                                  </div>
                                </div>

                                <div className="border-t border-dashed border-stone-800 pt-2 text-[10px] text-stone-400 font-sans space-y-0.5">
                                  <p className="flex justify-between">
                                    <span>Abatimento na Comissão:</span>
                                    <strong className="text-rose-400">-{formatCurrency(calc.profDeduction)}</strong>
                                  </p>
                                  <p className="flex justify-between">
                                    <span>Absorvido pelo Salão:</span>
                                    <strong className="text-stone-300">{formatCurrency(calc.salonAbsorbed)}</strong>
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-dashed border-stone-800">
                    <div>
                      <p className="text-stone-300 font-bold text-[11px]">Duplicata (Anotar no caderno)</p>
                      <p className="text-[9px] text-stone-500">Pagar acertos no final do mês pelo cliente</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={isFiado}
                      onChange={(e) => {
                        setIsFiado(e.target.checked);
                        if (e.target.checked) {
                          setPaymentMethodSelected('Duplicata');
                        } else {
                          setPaymentMethodSelected('Pix');
                        }
                      }}
                      className="w-4 h-4 accent-[#eed093] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Date overrides (visible in both create and edit) */}
                  <div className="bg-stone-900 border border-stone-850 rounded-xl p-4 space-y-3 mt-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#eed093]">
                      {editingComandaId ? "Ajustar Datas do Registro" : "Data da Comanda"}
                    </label>
                    
                    <div className="space-y-1">
                      <span className="text-[9px] text-stone-500 block font-mono">Abertura (sistema):</span>
                      <input 
                        type="datetime-local" 
                        value={editDateCreated}
                        disabled
                        className="w-full bg-stone-900 border border-stone-800 text-stone-500 p-2 rounded text-xs font-mono cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-stone-400 block font-mono">Data Atendimento / Faturamento:</span>
                      <input 
                        type="date" 
                        value={editCompetenceDate}
                        onChange={(e) => setEditCompetenceDate(e.target.value)}
                        className="w-full bg-black border border-stone-800 text-stone-200 p-2 rounded text-xs focus:outline-none focus:border-[#eed093] font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-stone-400 block font-mono">Data Pagamento:</span>
                      <input 
                        type="date" 
                        value={editPaymentDate}
                        onChange={(e) => setEditPaymentDate(e.target.value)}
                        className="w-full bg-black border border-stone-800 text-stone-200 p-2 rounded text-xs focus:outline-none focus:border-[#eed093] font-mono"
                      />
                    </div>
                  </div>

              </div>

              {/* Submission buttons */}
              <div className="space-y-3 pt-6 border-t border-stone-850">
                {(() => {
                  const isEditing = !!editingComandaId;
                  const currentStatus: string | undefined = isEditing ? comandas.filter(c => !c.deletedAt).find(c => c.id === editingComandaId)?.status : undefined;
                  const isAberto = currentStatus === 'Aberto';
                  const isEmAtendimento = currentStatus === 'Em Atendimento';
                  const isConcluido = currentStatus === 'Concluido';
                  const tooltipAberto = 'Esta comanda precisa estar "Em Atendimento" antes de ser concluída.';

                  if (isAberto) {
                    return (
                      <>
                        <button
                          type="button"
                          disabled={true}
                          title={tooltipAberto}
                          className="w-full flex items-center justify-center gap-2 bg-stone-700/50 text-stone-500 font-sans font-black text-xs py-3 rounded-full uppercase shadow cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Concluir Comanda</span>
                        </button>

                        <button
                          type="button"
                          disabled={true}
                          title={tooltipAberto}
                          className="w-full flex items-center justify-center gap-2 bg-stone-800/50 text-stone-600 font-sans font-bold text-xs py-3 rounded-full uppercase shadow cursor-not-allowed"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Concluir e Enviar WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          disabled={isReadOnly}
                          title={isReadOnly ? TOOLTIP_READONLY : tooltipAberto}
                          onClick={() => handleSaveComanda('Aberto', false)}
                          className="w-full flex items-center justify-center gap-1.5 bg-transparent border border-stone-800 hover:border-stone-500 text-stone-200 hover:text-white transition py-3.5 text-xs rounded-full cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>Salvar Alterações</span>
                        </button>
                      </>
                    );
                  }

                  if (isEmAtendimento) {
                    return (
                      <>
                        <button
                          type="button"
                          disabled={isReadOnly}
                          title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          onClick={() => handleSaveComanda('Concluido', false)}
                          className="w-full flex items-center justify-center gap-2 bg-[#e5b35f] hover:bg-[#eed093] text-black font-sans font-black text-xs py-3 rounded-full transition cursor-pointer uppercase shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Concluir Comanda</span>
                        </button>

                        <button
                          type="button"
                          disabled={isReadOnly}
                          title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          onClick={() => handleSaveComanda('Concluido', true)}
                          className="w-full flex items-center justify-center gap-2 bg-stone-900 border border-stone-700 hover:bg-stone-850 text-white font-sans font-bold text-xs py-3 rounded-full transition cursor-pointer uppercase shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Concluir e Enviar WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          disabled={isReadOnly}
                          title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          onClick={() => handleSaveComanda('Em Atendimento', false)}
                          className="w-full flex items-center justify-center gap-1.5 bg-transparent border border-stone-800 hover:border-stone-500 text-stone-200 hover:text-white transition py-3.5 text-xs rounded-full cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>Salvar Alterações</span>
                        </button>
                      </>
                    );
                  }

                  if (isConcluido) {
                    return (
                      <>
                        <button
                          type="button"
                          disabled={true}
                          title="Esta comanda já foi concluída."
                          className="w-full flex items-center justify-center gap-2 bg-stone-700/50 text-stone-500 font-sans font-black text-xs py-3 rounded-full uppercase shadow cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Concluir Comanda</span>
                        </button>

                        <button
                          type="button"
                          disabled={isReadOnly}
                          title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          onClick={() => handleSaveComanda('Concluido', true)}
                          className="w-full flex items-center justify-center gap-2 bg-stone-900 border border-stone-700 hover:bg-stone-850 text-white font-sans font-bold text-xs py-3 rounded-full transition cursor-pointer uppercase shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Concluir e Enviar WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          disabled={isReadOnly}
                          title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          onClick={() => handleSaveComanda('Concluido', false)}
                          className="w-full flex items-center justify-center gap-1.5 bg-transparent border border-stone-800 hover:border-stone-500 text-stone-200 hover:text-white transition py-3.5 text-xs rounded-full cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>Salvar Alterações</span>
                        </button>
                      </>
                    );
                  }

                  // New comanda
                  return (
                    <>
                      <button
                        type="button"
                        disabled={isReadOnly}
                        title={isReadOnly ? TOOLTIP_READONLY : undefined}
                        onClick={() => handleSaveComanda('Aberto', false)}
                        className="w-full flex items-center justify-center gap-2 bg-[#e5b35f] hover:bg-[#eed093] text-black font-sans font-black text-xs py-3 rounded-full transition cursor-pointer uppercase shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>Abrir Comanda</span>
                      </button>
                    </>
                  );
                })()}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* EXCLUSÃO/ESTORNO CONFIRMATION DIALOG MODAL */}
      {comandaToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-rose-100 p-6 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-50 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-gray-900">Confirmar Exclusão</h3>
            </div>

            {comandaToDelete.status === 'Concluido' ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-rose-700 bg-rose-50/70 p-3 rounded-lg border border-rose-100 leading-relaxed font-sans">
                  ⚠️ Esta comanda (<strong>{comandaToDelete.ticketNumber}</strong>) já foi <strong>Concluída e Paga</strong>!
                </p>
                <p className="text-xs text-stone-600 leading-relaxed font-sans">
                  Ao excluí-la, o recebimento de <strong className="text-emerald-700 font-bold">{formatCurrency(comandaToDelete.totalValue)}</strong> e as respectivas comissões dos profissionais associados serão <strong>estornados e removidos permanentemente</strong> do controle financeiro.
                </p>
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-[11px] text-stone-600 font-mono space-y-1">
                  <div><strong>Cliente:</strong> {comandaToDelete.clientName}</div>
                  <div><strong>Valor Total:</strong> {formatCurrency(comandaToDelete.totalValue)}</div>
                  <div><strong>Serviços prestados:</strong> {comandaToDelete.services.map(s => s.name).join(', ')}</div>
                </div>
                <p className="text-xs font-bold text-stone-800 font-sans">
                  Deseja mesmo estornar o financeiro e deletar esta comanda de forma irreversível?
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-stone-600 font-sans leading-relaxed">
                  Tem certeza de que deseja deletar permanentemente a comanda <strong>{comandaToDelete.ticketNumber}</strong> de <strong>{comandaToDelete.clientName}</strong>? Esta ação não poderá ser desfeita.
                </p>
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-[11px] text-stone-600 font-mono">
                  <div><strong>Total:</strong> {formatCurrency(comandaToDelete.totalValue)}</div>
                  <div><strong>Status:</strong> {comandaToDelete.status}</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setComandaToDelete(null)}
                className="flex-1 py-2.5 border border-stone-200 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold transition focus:outline-none cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const isWatched = checkWatchlist([comandaToDelete]).length > 0;
                  console.log(`[${TAB()}] [${TS()}] [DELETE_FLOW] UI: Confirmar Exclusão clicado ticket=${comandaToDelete.ticketNumber} id=${comandaToDelete.id} monitorada=${isWatched ? 'SIM' : 'NAO'}`);
                  if (isWatched) {
                    console.error(`%c[${TAB()}] [${TS()}] [DELETE_FLOW] *** EXCLUSAO CONFIRMADA PARA COMANDA MONITORADA: ${comandaToDelete.ticketNumber} ***`, 'background:red;color:white;font-weight:bold');
                  }
                  onDeleteComanda(comandaToDelete.id);
                  setComandaToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm hover:shadow active:scale-98 focus:outline-none cursor-pointer text-center"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
