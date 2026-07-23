import { Salon, Professional, Service, Product, Client, Comanda, ComandaStatus, FinancialRecord, Appointment, ChartAccountGroup, ServiceCategory, CardAcquirer, CardFeeRule } from './types';
import { initialSalons, initialProfessionals, initialServices, initialProducts, initialClients, initialComandas, initialFinancials, initialAppointments, initialChartAccounts, initialServiceCategories } from './initialData';
import { TS, TAB, shortStack, watchReport, watchTicketsPresent, ticketSummary, checkWatchlist } from './forensic';

// Storage Keys
const KEY_SALONS = 'saas_salao_salons';
const KEY_PROFESSIONALS = 'saas_salao_professionals';
const KEY_SERVICES = 'saas_salao_services';
const KEY_PRODUCTS = 'saas_salao_products';
const KEY_CLIENTS = 'saas_salao_clients';
const KEY_COMANDAS = 'saas_salao_comandas';
const KEY_FINANCIALS = 'saas_salao_financials';
const KEY_APPOINTMENTS = 'saas_salao_appointments';
const KEY_CHARTS = 'saas_salao_charts';
const KEY_SERVICE_CATEGORIES = 'saas_salao_service_categories';
const KEY_CARD_ACQUIRERS = 'saas_salao_card_acquirers';

// Initialize localStorage if empty
export function initializeStorage() {
  const MIGRATION_KEY = 'saas_salao_clear_movimentacoes_v2';
  if (!localStorage.getItem(MIGRATION_KEY)) {
    localStorage.setItem(KEY_COMANDAS, JSON.stringify([]));
    localStorage.setItem(KEY_FINANCIALS, JSON.stringify([]));
    localStorage.setItem(KEY_APPOINTMENTS, JSON.stringify([]));
    localStorage.setItem(MIGRATION_KEY, 'true');
  }

  if (!localStorage.getItem(KEY_SALONS)) {
    localStorage.setItem(KEY_SALONS, JSON.stringify(initialSalons));
    localStorage.setItem(KEY_PROFESSIONALS, JSON.stringify(initialProfessionals));
    localStorage.setItem(KEY_SERVICES, JSON.stringify(initialServices));
    localStorage.setItem(KEY_PRODUCTS, JSON.stringify(initialProducts));
    localStorage.setItem(KEY_CLIENTS, JSON.stringify(initialClients));
    localStorage.setItem(KEY_COMANDAS, JSON.stringify(initialComandas));
    localStorage.setItem(KEY_FINANCIALS, JSON.stringify(initialFinancials));
    localStorage.setItem(KEY_APPOINTMENTS, JSON.stringify(initialAppointments));
    localStorage.setItem(KEY_CHARTS, JSON.stringify(initialChartAccounts));
    localStorage.setItem(KEY_SERVICE_CATEGORIES, JSON.stringify(initialServiceCategories));
  }

  if (!localStorage.getItem(KEY_CARD_ACQUIRERS)) {
    const defaultAcquirers: CardAcquirer[] = [
      // Minizinha
      {
        id: 'acq_minizinha',
        salonId: 'salon_eclat',
        name: 'Minizinha',
        isActive: true,
        rules: [
          { brand: 'Visa', operation: 'debito', installments: 1, rate: 1.56 },
          { brand: 'Visa', operation: 'credito', installments: 1, rate: 3.33 },
          { brand: 'Visa', operation: 'credito', installments: 2, rate: 3.62 },
          { brand: 'Visa', operation: 'credito', installments: 3, rate: 4.26 },
          { brand: 'Mastercard', operation: 'debito', installments: 1, rate: 1.56 },
          { brand: 'Mastercard', operation: 'credito', installments: 1, rate: 3.33 },
          { brand: 'Mastercard', operation: 'credito', installments: 2, rate: 3.62 },
          { brand: 'Mastercard', operation: 'credito', installments: 3, rate: 4.26 },
          { brand: 'Elo', operation: 'debito', installments: 1, rate: 2.19 },
          { brand: 'Elo', operation: 'credito', installments: 1, rate: 3.67 },
          { brand: 'Elo', operation: 'credito', installments: 2, rate: 4.26 },
          { brand: 'Elo', operation: 'credito', installments: 3, rate: 4.90 },
          { brand: 'Amex', operation: 'debito', installments: 1, rate: 0 },
          { brand: 'Amex', operation: 'credito', installments: 1, rate: 3.67 },
          { brand: 'Amex', operation: 'credito', installments: 2, rate: 4.26 },
          { brand: 'Amex', operation: 'credito', installments: 3, rate: 4.90 },
          { brand: 'Hipercard', operation: 'debito', installments: 1, rate: 1.56 },
          { brand: 'Hipercard', operation: 'credito', installments: 1, rate: 3.67 },
          { brand: 'Hipercard', operation: 'credito', installments: 2, rate: 4.26 },
          { brand: 'Hipercard', operation: 'credito', installments: 3, rate: 4.90 },
          { brand: 'Outros', operation: 'debito', installments: 1, rate: 1.56 },
          { brand: 'Outros', operation: 'credito', installments: 1, rate: 3.67 },
          { brand: 'Outros', operation: 'credito', installments: 2, rate: 4.26 },
          { brand: 'Outros', operation: 'credito', installments: 3, rate: 4.90 },
        ]
      },
      // Mercado Pago
      {
        id: 'acq_mercadopago',
        salonId: 'salon_eclat',
        name: 'Mercado Pago',
        isActive: true,
        rules: [
          { brand: 'Visa', operation: 'debito', installments: 1, rate: 1.25 },
          { brand: 'Visa', operation: 'credito', installments: 1, rate: 2.39 },
          { brand: 'Visa', operation: 'credito', installments: 2, rate: 3.19 },
          { brand: 'Visa', operation: 'credito', installments: 3, rate: 3.89 },
          { brand: 'Mastercard', operation: 'debito', installments: 1, rate: 1.25 },
          { brand: 'Mastercard', operation: 'credito', installments: 1, rate: 2.39 },
          { brand: 'Mastercard', operation: 'credito', installments: 2, rate: 3.19 },
          { brand: 'Mastercard', operation: 'credito', installments: 3, rate: 3.89 },
          { brand: 'Elo', operation: 'debito', installments: 1, rate: 1.95 },
          { brand: 'Elo', operation: 'credito', installments: 1, rate: 3.10 },
          { brand: 'Elo', operation: 'credito', installments: 2, rate: 3.90 },
          { brand: 'Elo', operation: 'credito', installments: 3, rate: 4.60 },
          { brand: 'Amex', operation: 'debito', installments: 1, rate: 2.40 },
          { brand: 'Amex', operation: 'credito', installments: 1, rate: 3.50 },
          { brand: 'Amex', operation: 'credito', installments: 2, rate: 4.30 },
          { brand: 'Amex', operation: 'credito', installments: 3, rate: 5.10 },
          { brand: 'Hipercard', operation: 'debito', installments: 1, rate: 2.50 },
          { brand: 'Hipercard', operation: 'credito', installments: 1, rate: 3.90 },
          { brand: 'Hipercard', operation: 'credito', installments: 2, rate: 4.90 },
          { brand: 'Hipercard', operation: 'credito', installments: 3, rate: 5.90 },
          { brand: 'Outros', operation: 'debito', installments: 1, rate: 2.50 },
          { brand: 'Outros', operation: 'credito', installments: 1, rate: 3.90 },
          { brand: 'Outros', operation: 'credito', installments: 2, rate: 4.90 },
          { brand: 'Outros', operation: 'credito', installments: 3, rate: 5.90 },
        ]
      }
    ];
    localStorage.setItem(KEY_CARD_ACQUIRERS, JSON.stringify(defaultAcquirers));
  }

  // Add a separate copy for salon_maison
  if (!localStorage.getItem(KEY_CARD_ACQUIRERS + '_maison')) {
    const existing = JSON.parse(localStorage.getItem(KEY_CARD_ACQUIRERS) || '[]') as CardAcquirer[];
    const hasMaison = existing.some(a => a.salonId === 'salon_maison');
    if (!hasMaison) {
      const maisons = existing
        .filter(a => a.salonId === 'salon_eclat')
        .map(a => ({ ...a, id: a.id + '_maison', salonId: 'salon_maison' }));
      if (maisons.length > 0) {
        existing.push(...maisons);
        localStorage.setItem(KEY_CARD_ACQUIRERS, JSON.stringify(existing));
      }
    }
    localStorage.setItem(KEY_CARD_ACQUIRERS + '_maison', 'true');
  }
}

// Data loaders and savers
export function loadSalons(): Salon[] {
  initializeStorage();
  return JSON.parse(localStorage.getItem(KEY_SALONS) || '[]');
}

export function saveSalons(salons: Salon[]) {
  localStorage.setItem(KEY_SALONS, JSON.stringify(salons));
}

export function loadProfessionals(salonId?: string): Professional[] {
  initializeStorage();
  const all: Professional[] = JSON.parse(localStorage.getItem(KEY_PROFESSIONALS) || '[]');
  
  // Auto-healing: Merge pre-defined specialties, roles and passwords from initialProfessionals if missing in localstorage
  let modified = false;
  const upgraded = all.map(p => {
    const orig = initialProfessionals.find(init => init.id === p.id);
    
    // Auto-heal specialties
    if (orig && orig.specialties && (!p.specialties || p.specialties.length === 0)) {
      p.specialties = orig.specialties;
      modified = true;
    }
    
    // Auto-heal role
    if (!p.role) {
      p.role = orig?.role || (p.id === 'prof_paula' || p.name.toLowerCase().includes('admin') ? 'administrador' : 'profissional');
      modified = true;
    }
    
    // Auto-heal password
    if (!p.password) {
      p.password = orig?.password || '1234';
      modified = true;
    }
    return p;
  });
  if (modified) {
    localStorage.setItem(KEY_PROFESSIONALS, JSON.stringify(upgraded));
  }
  
  return salonId ? upgraded.filter(p => p.salonId === salonId) : upgraded;
}

export function saveProfessionals(professionals: Professional[]) {
  localStorage.setItem(KEY_PROFESSIONALS, JSON.stringify(professionals));
}

export function loadServices(salonId?: string): Service[] {
  initializeStorage();
  const all: Service[] = JSON.parse(localStorage.getItem(KEY_SERVICES) || '[]');
  return salonId ? all.filter(s => s.salonId === salonId) : all;
}

export function saveServices(services: Service[]) {
  localStorage.setItem(KEY_SERVICES, JSON.stringify(services));
}

export function loadProducts(salonId?: string): Product[] {
  initializeStorage();
  const all: Product[] = JSON.parse(localStorage.getItem(KEY_PRODUCTS) || '[]');
  return salonId ? all.filter(p => p.salonId === salonId) : all;
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(KEY_PRODUCTS, JSON.stringify(products));
}

export function loadClients(salonId?: string): Client[] {
  initializeStorage();
  const all: Client[] = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
  return salonId ? all.filter(c => c.salonId === salonId) : all;
}

export function saveClients(clients: Client[]) {
  localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients));
}

export function loadComandas(salonId?: string): Comanda[] {
  initializeStorage();
  const all: Comanda[] = JSON.parse(localStorage.getItem(KEY_COMANDAS) || '[]');
  console.log(`[${TAB()}] [${TS()}] [DATASTORE] loadComandas() origem=${shortStack()} total=${all.length}`);
  console.log(`[${TAB()}] [${TS()}] [DATASTORE] tickets=[${all.map(c=>c.ticketNumber).join(',')}]`);
  watchReport(`loadComandas (${all.length} total)`, all);
  return salonId ? all.filter(c => c.salonId === salonId) : all;
}

export function saveComandas(comandas: Comanda[]) {
  const antes = JSON.parse(localStorage.getItem(KEY_COMANDAS) || '[]').length;
  console.log(`[${TAB()}] [${TS()}] [DATASTORE] saveComandas() origem=${shortStack()} ANTES=${antes} DEPOIS=${comandas.length}`);
  console.log(`[${TAB()}] [${TS()}] [DATASTORE] tickets salvos=[${comandas.map(c=>c.ticketNumber).join(',')}]`);
  watchReport(`saveComandas (gravando ${comandas.length})`, comandas);
  localStorage.setItem(KEY_COMANDAS, JSON.stringify(comandas));
}

export function loadFinancials(salonId?: string): FinancialRecord[] {
  initializeStorage();
  const all: FinancialRecord[] = JSON.parse(localStorage.getItem(KEY_FINANCIALS) || '[]');
  
  // Auto-sync any concluded comandas with isFiado: true that don't have a corresponding receipt record
  const comandas: Comanda[] = JSON.parse(localStorage.getItem(KEY_COMANDAS) || '[]');
  const fiados = comandas.filter(c => c.isFiado && c.status === 'Concluido');
  if (fiados.length > 0) {
    console.log(`[${TAB()}] [${TS()}] [DATASTORE] loadFinancials: ${fiados.length} comandas fiado/concluido encontradas`);
    fiados.forEach(c => console.log(`[${TAB()}] [${TS()}] [DATASTORE]   → fiado: ticket=${c.ticketNumber} id=${c.id} valor=${c.totalValue}`));
    const watchedFiados = checkWatchlist(fiados.map(c => ({ticketNumber: c.ticketNumber, id: c.id})));
    if (watchedFiados.length > 0) {
      console.error(`%c[${TAB()}] [${TS()}] [DATASTORE] *** COMANDA MONITORADA FIADA ENCONTRADA: ${watchedFiados.map(w=>`${w.ticket}(${w.id})`).join(', ')} ***`, 'background:red;color:white;font-weight:bold');
    }
  }
  
  let modified = false;
  fiados.forEach(c => {
    const hasRecord = all.some(f => f.relatedComandaId === c.id && f.type === 'receita');
    if (!hasRecord) {
      console.log(`[${TAB()}] [${TS()}] [DATASTORE] *** AUTO-CRIANDO financial para comanda ${c.ticketNumber} (${c.id}) ***`);
      let cDate: Date;
      try {
        cDate = new Date(c.dateCreated);
        if (isNaN(cDate.getTime())) {
          cDate = new Date();
        }
      } catch (e) {
        cDate = new Date();
      }
      const calculatedDueDate = new Date(cDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const revRecord: FinancialRecord = {
        id: 'fin_trig_rev_' + Math.random().toString(36).substr(2, 9),
        salonId: c.salonId,
        type: 'receita',
        category: 'Contas a Receber',
        amount: c.totalValue,
        date: c.paymentDate || c.dateCreated.split('T')[0],
        competenceDate: c.competenceDate,
        description: `Comunicação Automática: Comanda ${c.ticketNumber} concluída via Kanban para o cliente ${c.clientName}`,
        status: 'pendente',
        relatedComandaId: c.id,
        dueDate: calculatedDueDate
      };
      all.push(revRecord);
      modified = true;
    }
  });

  if (modified) {
    localStorage.setItem(KEY_FINANCIALS, JSON.stringify(all));
  }

  return salonId ? all.filter(f => f.salonId === salonId) : all;
}

export function saveFinancials(financials: FinancialRecord[]) {
  const antes = JSON.parse(localStorage.getItem(KEY_FINANCIALS) || '[]').length;
  console.log(`[${TAB()}] [${TS()}] [DATASTORE] saveFinancials() origem=${shortStack()} ANTES=${antes} DEPOIS=${financials.length}`);
  console.log(`[${TAB()}] [${TS()}] [DATASTORE] relatedComandaIds=[${financials.map(f=>f.relatedComandaId||'none').join(',')}]`);
  localStorage.setItem(KEY_FINANCIALS, JSON.stringify(financials));
}

export function loadAppointments(salonId?: string): Appointment[] {
  initializeStorage();
  const all: Appointment[] = JSON.parse(localStorage.getItem(KEY_APPOINTMENTS) || '[]');
  return salonId ? all.filter(a => a.salonId === salonId) : all;
}

export function saveAppointments(appointments: Appointment[]) {
  localStorage.setItem(KEY_APPOINTMENTS, JSON.stringify(appointments));
}

export function loadCharts(salonId?: string): ChartAccountGroup[] {
  initializeStorage();
  const all: ChartAccountGroup[] = JSON.parse(localStorage.getItem(KEY_CHARTS) || '[]');
  return salonId ? all.filter(c => c.salonId === salonId) : all;
}

export function saveCharts(charts: ChartAccountGroup[]) {
  localStorage.setItem(KEY_CHARTS, JSON.stringify(charts));
}

export function loadServiceCategories(salonId?: string): ServiceCategory[] {
  initializeStorage();
  let all: ServiceCategory[] = JSON.parse(localStorage.getItem(KEY_SERVICE_CATEGORIES) || '[]');
  
  // Auto-fill fallback if localStorage doesn't contain the defaults yet
  if (all.length === 0) {
    all = [...initialServiceCategories];
    localStorage.setItem(KEY_SERVICE_CATEGORIES, JSON.stringify(all));
  }
  
  return salonId ? all.filter(sc => sc.salonId === salonId) : all;
}

export function saveServiceCategories(categories: ServiceCategory[]) {
  localStorage.setItem(KEY_SERVICE_CATEGORIES, JSON.stringify(categories));
}

// Logic Triggers
export function addComandaAndUpdateFinance(comanda: Comanda): { comanda: Comanda; triggeredFinance: FinancialRecord[] } {
  // Store Comanda
  const comandas = JSON.parse(localStorage.getItem(KEY_COMANDAS) || '[]') as Comanda[];
  comandas.push(comanda);
  localStorage.setItem(KEY_COMANDAS, JSON.stringify(comandas));

  const triggeredFinance: FinancialRecord[] = [];

  // If finalized immediately (Concluido), write to financial records
  if (comanda.status === 'Concluido') {
    console.log(`[DATASTORE] addComandaAndUpdateFinance: comanda ${comanda.ticketNumber} CONCLUIDO, criando financeiros`);
    const financials = JSON.parse(localStorage.getItem(KEY_FINANCIALS) || '[]') as FinancialRecord[];

    // 1. Revenue Record (Service sales) — apenas se ainda não existe
    const alreadyHasRevenue = financials.some(f => f.relatedComandaId === comanda.id && f.type === 'receita');
    console.log(`[DATASTORE] addComandaAndUpdateFinance: alreadyHasRevenue=${alreadyHasRevenue}`);
    if (!alreadyHasRevenue) {
      const revRecord: FinancialRecord = {
        id: 'fin_trig_rev_' + Math.random().toString(36).substr(2, 9),
        salonId: comanda.salonId,
        type: 'receita',
        category: comanda.isFiado ? 'Contas a Receber' : 'Serviço',
        amount: comanda.totalValue,
        date: comanda.paymentDate || new Date().toISOString().split('T')[0],
        competenceDate: comanda.competenceDate,
        description: `Comunicação Automática: Comanda ${comanda.ticketNumber} para o cliente ${comanda.clientName}`,
        status: comanda.isFiado ? 'pendente' : 'pago',
        relatedComandaId: comanda.id,
        dueDate: comanda.isFiado ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined
      };
      financials.push(revRecord);
      triggeredFinance.push(revRecord);
      console.log(`[DATASTORE] addComandaAndUpdateFinance: CRIADO financial receita id=${revRecord.id}`);
    }

    // If card payment with registered transaction fee expense — apenas se ainda não existe
    if ((comanda.paymentMethod === 'Cartão Credito' || comanda.paymentMethod === 'Cartão Debito') && comanda.cardFeeAmount && comanda.cardFeeAmount > 0) {
      const alreadyHasFee = financials.some(f => f.relatedComandaId === comanda.id && f.type === 'despesa' && f.category === 'Taxas de Cartão');
      if (!alreadyHasFee) {
        const feeRecord: FinancialRecord = {
          id: 'fin_trig_fee_' + Math.random().toString(36).substr(2, 9),
          salonId: comanda.salonId,
          type: 'despesa',
          category: 'Taxas de Cartão',
          amount: comanda.cardFeeAmount,
          date: comanda.paymentDate || new Date().toISOString().split('T')[0],
          competenceDate: comanda.competenceDate,
          description: `Taxa de Cartão (${comanda.cardAcquirerName || 'Indefinida'} - ${comanda.cardBrand || 'Indefinida'} ${comanda.cardInstallments ? `${comanda.cardInstallments}x` : 'Débito'}) sobre Comanda ${comanda.ticketNumber}`,
          status: 'pago',
          relatedComandaId: comanda.id
        };
        financials.push(feeRecord);
        triggeredFinance.push(feeRecord);
      }
    }

    localStorage.setItem(KEY_FINANCIALS, JSON.stringify(financials));

    // Update client fidelity points (+10 pts per 100 paid) — apenas se revenue foi criado agora
    if (!alreadyHasRevenue) {
      const clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]') as Client[];
      const clientIndex = clients.findIndex(c => c.id === comanda.clientId || c.name === comanda.clientName);
      if (clientIndex !== -1) {
        clients[clientIndex].fidelityPoints += Math.floor(comanda.totalValue / 10);
        localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients));
      }
    }
  }

  return { comanda, triggeredFinance };
}

// Update Comanda Status (e.g. from Kanban)
export function updateComandaStatus(
  comandaId: string,
  newStatus: ComandaStatus,
  paymentMethod?: 'Dinheiro' | 'Cartão Credito' | 'Cartão Debito' | 'Pix' | 'Caderno',
  isFiado?: boolean,
  cardDetails?: {
    cardAcquirerId?: string;
    cardAcquirerName?: string;
    cardBrand?: string;
    cardInstallments?: number;
    cardFeeAmount?: number;
    cardFeeRateUsed?: number;
    profDeductPercentage?: number;
    salonDeductPercentage?: number;
  },
  // Payload Pix (BR Code EMV) já gerado pelo caller, fetched fresh do
  // endpoint /api/tenant-pix-config no momento da geração. Este dataStore
  // não conhece configuração de PIX — apenas persiste o artefato final.
  pixPayload?: string,
  // Datas opcionais que o caller pode fornecer. Quando não informadas,
  // paymentDate recebe hoje e competenceDate permanece inalterado.
  overrides?: { competenceDate?: string; paymentDate?: string }
): Comanda | null {
  const comandas = JSON.parse(localStorage.getItem(KEY_COMANDAS) || '[]') as Comanda[];
  const index = comandas.findIndex(c => c.id === comandaId);
  if (index === -1) return null;

  const oldStatus = comandas[index].status;
  if (oldStatus === newStatus) return comandas[index];

  comandas[index].status = newStatus;
  
  if (newStatus === 'Concluido') {
    comandas[index].paymentDate = overrides?.paymentDate || new Date().toISOString().split('T')[0];
    if (overrides?.competenceDate) {
      comandas[index].competenceDate = overrides.competenceDate;
    }
    
    const finalPaymentMethod = paymentMethod || comandas[index].paymentMethod || 'Pix';
    comandas[index].paymentMethod = finalPaymentMethod;
    
    const finalIsFiado = isFiado !== undefined ? isFiado : (comandas[index].isFiado || finalPaymentMethod === 'Caderno');
    comandas[index].isFiado = finalIsFiado;

    if (cardDetails) {
      comandas[index].cardAcquirerId = cardDetails.cardAcquirerId;
      comandas[index].cardAcquirerName = cardDetails.cardAcquirerName;
      comandas[index].cardBrand = cardDetails.cardBrand;
      comandas[index].cardInstallments = cardDetails.cardInstallments;
      comandas[index].cardFeeAmount = cardDetails.cardFeeAmount;
      comandas[index].cardFeeRateUsed = cardDetails.cardFeeRateUsed;

      const profPct = cardDetails.profDeductPercentage ?? 0;
      const salonPct = cardDetails.salonDeductPercentage ?? 100;
      comandas[index].profDeductPercentage = profPct;
      comandas[index].salonDeductPercentage = salonPct;

      const totalFee = cardDetails.cardFeeAmount ?? 0;
      const profDeduction = totalFee * (profPct / 100);
      const salonDeduction = totalFee * (salonPct / 100);

      comandas[index].profCardFeeDeduction = profDeduction;
      comandas[index].salonCardFeeDeduction = salonDeduction;

      // Distribute subtraction amongst service items and products proportionately
      const totalVal = comandas[index].totalValue || 1;

      if (profDeduction > 0) {
        comandas[index].services = (comandas[index].services || []).map(s => {
          const weight = s.price / totalVal;
          const deductionForThisItem = profDeduction * weight;
          const baseCommission = s.originalCommissionValue !== undefined ? s.originalCommissionValue : s.commissionValue;
          return {
            ...s,
            originalCommissionValue: baseCommission,
            commissionValue: Math.max(0, parseFloat((baseCommission - deductionForThisItem).toFixed(2)))
          };
        });

        comandas[index].products = (comandas[index].products || []).map(p => {
          const weight = p.price / totalVal;
          const deductionForThisItem = profDeduction * weight;
          const baseCommission = p.originalCommissionValue !== undefined ? p.originalCommissionValue : (p.commissionValue || 0);
          return {
            ...p,
            originalCommissionValue: baseCommission,
            commissionValue: Math.max(0, parseFloat((baseCommission - deductionForThisItem).toFixed(2)))
          };
        });
      } else {
        // Reset/restore standard commission values if there is no deduction
        comandas[index].services = (comandas[index].services || []).map(s => ({
          ...s,
          commissionValue: s.originalCommissionValue !== undefined ? s.originalCommissionValue : s.commissionValue
        }));
        comandas[index].products = (comandas[index].products || []).map(p => ({
          ...p,
          commissionValue: p.originalCommissionValue !== undefined ? p.originalCommissionValue : (p.commissionValue || 0)
        }));
      }
    }

    // Persiste o payload Pix (BR Code EMV) recebido do caller.
    // O caller (ComandasKanban) é responsável por buscar a config PIX
    // fresca em /api/tenant-pix-config e gerar o payload no momento
    // da finalização. Este dataStore NÃO consulta tenant_pix_config.
    if (finalPaymentMethod === 'Pix' && pixPayload && !comandas[index].pixPayload) {
      comandas[index].pixPayload = pixPayload;
    }

    // Trigger financial recording
    const comanda = comandas[index];
    const financials = JSON.parse(localStorage.getItem(KEY_FINANCIALS) || '[]') as FinancialRecord[];

    // Save comanda back before updating financials
    localStorage.setItem(KEY_COMANDAS, JSON.stringify(comandas));
    console.log(`[DATASTORE] updateComandaStatus: comanda ${comanda.ticketNumber} movida para CONCLUIDO, criando financeiros`);

    // 1. Revenue Record (Service sales) — apenas se ainda não existe
    const alreadyHasRevenue = financials.some(f => f.relatedComandaId === comandaId && f.type === 'receita');
    console.log(`[DATASTORE] updateComandaStatus: alreadyHasRevenue=${alreadyHasRevenue}`);
    if (!alreadyHasRevenue) {
      const revRecord: FinancialRecord = {
        id: 'fin_trig_rev_' + Math.random().toString(36).substr(2, 9),
        salonId: comanda.salonId,
        type: 'receita',
        category: isFiado ? 'Contas a Receber' : 'Serviço',
        amount: comanda.totalValue,
        date: comanda.paymentDate,
        competenceDate: comanda.competenceDate,
        description: `Comunicação Automática: Comanda ${comanda.ticketNumber} concluída via Kanban para o cliente ${comanda.clientName}`,
        status: isFiado ? 'pendente' : 'pago',
        relatedComandaId: comanda.id,
        dueDate: isFiado ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined
      };
      financials.push(revRecord);
    }

    // If card payment with registered transaction fee expense — apenas se ainda não existe
    if ((finalPaymentMethod === 'Cartão Credito' || finalPaymentMethod === 'Cartão Debito') && comanda.cardFeeAmount && comanda.cardFeeAmount > 0) {
      const alreadyHasFee = financials.some(f => f.relatedComandaId === comandaId && f.type === 'despesa' && f.category === 'Taxas de Cartão');
      if (!alreadyHasFee) {
        const feeRecord: FinancialRecord = {
          id: 'fin_trig_fee_' + Math.random().toString(36).substr(2, 9),
          salonId: comanda.salonId,
          type: 'despesa',
          category: 'Taxas de Cartão',
          amount: comanda.cardFeeAmount,
          date: comanda.paymentDate,
          competenceDate: comanda.competenceDate,
          description: `Taxa de Cartão (${comanda.cardAcquirerName || 'Indefinida'} - ${comanda.cardBrand || 'Indefinida'} ${comanda.cardInstallments ? `${comanda.cardInstallments}x` : 'Débito'}) sobre Comanda ${comanda.ticketNumber}`,
          status: 'pago',
          relatedComandaId: comanda.id
        };
        financials.push(feeRecord);
      }
    }

    localStorage.setItem(KEY_FINANCIALS, JSON.stringify(financials));

    // Update client fidelity points (+10 pts per 100 paid) — apenas se revenue foi criado agora
    if (!alreadyHasRevenue) {
      const clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]') as Client[];
      const clientIdx = clients.findIndex(c => c.id === comanda.clientId || c.name === comanda.clientName);
      if (clientIdx !== -1) {
        clients[clientIdx].fidelityPoints += Math.floor(comanda.totalValue / 10);
        localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients));
      }
    }

    return comanda;
  } else {
    localStorage.setItem(KEY_COMANDAS, JSON.stringify(comandas));
    return comandas[index];
  }
}

// Generate DRE / Demonstration of Month Result
export interface DRE {
  receitaBruta: number;
  receitaRecebida: number; // Receitas Liquidadas (À Vista: Pix, Dinheiro, Cartões)
  receitaAReceber: number; // Receitas a Receber (Vendas a Prazo / Duplicatas)
  descontos: number;
  receitaLiquida: number;
  custosMercadorias: number; // cost of items
  comissoesPagas: number; // calculated directly
  outrasDespesas: number; // Rent, Marketing, clean materials
  resultadoOperacional: number; // gain or loss
}

export function calculateDRE(salonId: string, month: number, year: number): DRE {
  const financials = loadFinancials(salonId);
  
  // Filter by requested month/year
  const records = financials.filter(f => {
    const d = new Date(f.date);
    return !isNaN(d.getTime()) && (d.getMonth() === month && d.getFullYear() === year);
  });

  const receitaRecebida = records
    .filter(r => r.type === 'receita' && r.status === 'pago')
    .reduce((sum, r) => sum + r.amount, 0);

  const receitaAReceber = records
    .filter(r => r.type === 'receita' && r.status === 'pendente')
    .reduce((sum, r) => sum + r.amount, 0);

  const faturamentoTotalCompetencia = receitaRecebida + receitaAReceber;

  const descontos = 0; // assumed 0 for simplicity
  const receitaLiquida = faturamentoTotalCompetencia - descontos;

  const custosMercadorias = records
    .filter(r => r.type === 'despesa' && r.category === 'Produtos/Consumíveis')
    .reduce((sum, r) => sum + r.amount, 0);

  const comissoesPagas = records
    .filter(r => r.type === 'despesa' && (r.category === 'Comissão' || r.category === 'Pessoal / Comissões' || r.category?.toLowerCase()?.includes('comis')))
    .reduce((sum, r) => sum + r.amount, 0);

  const outrasDespesas = records
    .filter(r => r.type === 'despesa' && r.category !== 'Produtos/Consumíveis' && !(r.category === 'Comissão' || r.category === 'Pessoal / Comissões' || r.category?.toLowerCase()?.includes('comis')))
    .reduce((sum, r) => sum + r.amount, 0);

  const resultadoOperacional = receitaLiquida - custosMercadorias - comissoesPagas - outrasDespesas;

  return {
    receitaBruta: faturamentoTotalCompetencia,
    receitaRecebida,
    receitaAReceber,
    descontos,
    receitaLiquida,
    custosMercadorias,
    comissoesPagas,
    outrasDespesas,
    resultadoOperacional
  };
}

export function loadCardAcquirers(salonId?: string): CardAcquirer[] {
  initializeStorage();
  let all: CardAcquirer[] = JSON.parse(localStorage.getItem(KEY_CARD_ACQUIRERS) || '[]');

  // Migration: replace old 'salao_1' acquirers with Minizinha / Mercado Pago
  const migratedKey = KEY_CARD_ACQUIRERS + '_migrated_v2';
  if (!localStorage.getItem(migratedKey)) {
    // Remove old acquirers tied to non-existent salon 'salao_1'
    all = all.filter(a => a.salonId !== 'salao_1');

    // Build map of existing acquirers per salon
    const existingBySalon = new Map<string, number>();
    all.forEach(a => existingBySalon.set(a.salonId, (existingBySalon.get(a.salonId) || 0) + 1));

    // Seed Minizinha and Mercado Pago for each salon that has zero acquirers
    const salons: any[] = JSON.parse(localStorage.getItem(KEY_SALONS) || '[]');
    const minizinhaRules: CardFeeRule[] = [
      { brand: 'Visa', operation: 'debito', installments: 1, rate: 1.56 },
      { brand: 'Visa', operation: 'credito', installments: 1, rate: 3.33 },
      { brand: 'Visa', operation: 'credito', installments: 2, rate: 3.62 },
      { brand: 'Visa', operation: 'credito', installments: 3, rate: 4.26 },
      { brand: 'Mastercard', operation: 'debito', installments: 1, rate: 1.56 },
      { brand: 'Mastercard', operation: 'credito', installments: 1, rate: 3.33 },
      { brand: 'Mastercard', operation: 'credito', installments: 2, rate: 3.62 },
      { brand: 'Mastercard', operation: 'credito', installments: 3, rate: 4.26 },
      { brand: 'Elo', operation: 'debito', installments: 1, rate: 2.19 },
      { brand: 'Elo', operation: 'credito', installments: 1, rate: 3.67 },
      { brand: 'Elo', operation: 'credito', installments: 2, rate: 4.26 },
      { brand: 'Elo', operation: 'credito', installments: 3, rate: 4.90 },
      { brand: 'Amex', operation: 'debito', installments: 1, rate: 0 },
      { brand: 'Amex', operation: 'credito', installments: 1, rate: 3.67 },
      { brand: 'Amex', operation: 'credito', installments: 2, rate: 4.26 },
      { brand: 'Amex', operation: 'credito', installments: 3, rate: 4.90 },
      { brand: 'Hipercard', operation: 'debito', installments: 1, rate: 1.56 },
      { brand: 'Hipercard', operation: 'credito', installments: 1, rate: 3.67 },
      { brand: 'Hipercard', operation: 'credito', installments: 2, rate: 4.26 },
      { brand: 'Hipercard', operation: 'credito', installments: 3, rate: 4.90 },
      { brand: 'Outros', operation: 'debito', installments: 1, rate: 1.56 },
      { brand: 'Outros', operation: 'credito', installments: 1, rate: 3.67 },
      { brand: 'Outros', operation: 'credito', installments: 2, rate: 4.26 },
      { brand: 'Outros', operation: 'credito', installments: 3, rate: 4.90 },
    ];
    const mercadopagoRules: CardFeeRule[] = [
      { brand: 'Visa', operation: 'debito', installments: 1, rate: 1.25 },
      { brand: 'Visa', operation: 'credito', installments: 1, rate: 2.39 },
      { brand: 'Visa', operation: 'credito', installments: 2, rate: 3.19 },
      { brand: 'Visa', operation: 'credito', installments: 3, rate: 3.89 },
      { brand: 'Mastercard', operation: 'debito', installments: 1, rate: 1.25 },
      { brand: 'Mastercard', operation: 'credito', installments: 1, rate: 2.39 },
      { brand: 'Mastercard', operation: 'credito', installments: 2, rate: 3.19 },
      { brand: 'Mastercard', operation: 'credito', installments: 3, rate: 3.89 },
      { brand: 'Elo', operation: 'debito', installments: 1, rate: 1.95 },
      { brand: 'Elo', operation: 'credito', installments: 1, rate: 3.10 },
      { brand: 'Elo', operation: 'credito', installments: 2, rate: 3.90 },
      { brand: 'Elo', operation: 'credito', installments: 3, rate: 4.60 },
      { brand: 'Amex', operation: 'debito', installments: 1, rate: 2.40 },
      { brand: 'Amex', operation: 'credito', installments: 1, rate: 3.50 },
      { brand: 'Amex', operation: 'credito', installments: 2, rate: 4.30 },
      { brand: 'Amex', operation: 'credito', installments: 3, rate: 5.10 },
      { brand: 'Hipercard', operation: 'debito', installments: 1, rate: 2.50 },
      { brand: 'Hipercard', operation: 'credito', installments: 1, rate: 3.90 },
      { brand: 'Hipercard', operation: 'credito', installments: 2, rate: 4.90 },
      { brand: 'Hipercard', operation: 'credito', installments: 3, rate: 5.90 },
      { brand: 'Outros', operation: 'debito', installments: 1, rate: 2.50 },
      { brand: 'Outros', operation: 'credito', installments: 1, rate: 3.90 },
      { brand: 'Outros', operation: 'credito', installments: 2, rate: 4.90 },
      { brand: 'Outros', operation: 'credito', installments: 3, rate: 5.90 },
    ];

    salons.forEach(s => {
      const count = existingBySalon.get(s.id) || 0;
      if (count === 0) {
        all.push({
          id: 'acq_minizinha_' + s.id,
          salonId: s.id,
          name: 'Minizinha',
          isActive: true,
          rules: minizinhaRules,
        });
        all.push({
          id: 'acq_mercadopago_' + s.id,
          salonId: s.id,
          name: 'Mercado Pago',
          isActive: true,
          rules: mercadopagoRules,
        });
      }
    });

    localStorage.setItem(KEY_CARD_ACQUIRERS, JSON.stringify(all));
    localStorage.setItem(migratedKey, 'true');
  }

  return salonId ? all.filter(a => a.salonId === salonId) : all;
}

export function saveCardAcquirers(acquirers: CardAcquirer[]) {
  localStorage.setItem(KEY_CARD_ACQUIRERS, JSON.stringify(acquirers));
}

export function clearSalonMovements(salonId: string): void {
  // Clear comandas
  const comandas = JSON.parse(localStorage.getItem(KEY_COMANDAS) || '[]') as Comanda[];
  const remainingComandas = comandas.filter(c => c.salonId !== salonId);
  localStorage.setItem(KEY_COMANDAS, JSON.stringify(remainingComandas));

  // Clear financials
  const financials = JSON.parse(localStorage.getItem(KEY_FINANCIALS) || '[]') as FinancialRecord[];
  const remainingFinancials = financials.filter(f => f.salonId !== salonId);
  localStorage.setItem(KEY_FINANCIALS, JSON.stringify(remainingFinancials));

  // Clear appointments
  const appointments = JSON.parse(localStorage.getItem(KEY_APPOINTMENTS) || '[]') as Appointment[];
  const remainingAppointments = appointments.filter(a => a.salonId !== salonId);
  localStorage.setItem(KEY_APPOINTMENTS, JSON.stringify(remainingAppointments));
}

export function deleteSalonDataFull(salonId: string): void {
  // 1. KEY_SALONS
  const salons = JSON.parse(localStorage.getItem(KEY_SALONS) || '[]') as any[];
  localStorage.setItem(KEY_SALONS, JSON.stringify(salons.filter((s: any) => s.id !== salonId)));

  // 2. KEY_PROFESSIONALS
  const professionals = JSON.parse(localStorage.getItem(KEY_PROFESSIONALS) || '[]') as any[];
  localStorage.setItem(KEY_PROFESSIONALS, JSON.stringify(professionals.filter((p: any) => p.salonId !== salonId)));

  // 3. KEY_SERVICES
  const services = JSON.parse(localStorage.getItem(KEY_SERVICES) || '[]') as any[];
  localStorage.setItem(KEY_SERVICES, JSON.stringify(services.filter((s: any) => s.salonId !== salonId)));

  // 4. KEY_PRODUCTS
  const products = JSON.parse(localStorage.getItem(KEY_PRODUCTS) || '[]') as any[];
  localStorage.setItem(KEY_PRODUCTS, JSON.stringify(products.filter((p: any) => p.salonId !== salonId)));

  // 5. KEY_CLIENTS
  const clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]') as any[];
  localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients.filter((c: any) => c.salonId !== salonId)));

  // 6. KEY_COMANDAS
  const comandas = JSON.parse(localStorage.getItem(KEY_COMANDAS) || '[]') as any[];
  localStorage.setItem(KEY_COMANDAS, JSON.stringify(comandas.filter((c: any) => c.salonId !== salonId)));

  // 7. KEY_FINANCIALS
  const financials = JSON.parse(localStorage.getItem(KEY_FINANCIALS) || '[]') as any[];
  localStorage.setItem(KEY_FINANCIALS, JSON.stringify(financials.filter((f: any) => f.salonId !== salonId)));

  // 8. KEY_APPOINTMENTS
  const appointments = JSON.parse(localStorage.getItem(KEY_APPOINTMENTS) || '[]') as any[];
  localStorage.setItem(KEY_APPOINTMENTS, JSON.stringify(appointments.filter((a: any) => a.salonId !== salonId)));

  // 9. KEY_CHARTS
  const charts = JSON.parse(localStorage.getItem(KEY_CHARTS) || '[]') as any[];
  localStorage.setItem(KEY_CHARTS, JSON.stringify(charts.filter((c: any) => c.salonId !== salonId)));

  // 10. KEY_SERVICE_CATEGORIES
  const categories = JSON.parse(localStorage.getItem(KEY_SERVICE_CATEGORIES) || '[]') as any[];
  localStorage.setItem(KEY_SERVICE_CATEGORIES, JSON.stringify(categories.filter((c: any) => c.salonId !== salonId)));

  // 11. KEY_CARD_ACQUIRERS
  const acquirers = JSON.parse(localStorage.getItem(KEY_CARD_ACQUIRERS) || '[]') as any[];
  localStorage.setItem(KEY_CARD_ACQUIRERS, JSON.stringify(acquirers.filter((a: any) => a.salonId !== salonId)));
}

// --- Migration 2026: Restore lost professionals and fix divergences ---
const MIGRATION_PROF_2026_KEY = 'saas_salao_prof_migration_2026_v2';

let lastMigrationReport: { created: string[]; updated: string[]; skipped: string[]; conflicts: string[] } | null = null;

export function getLastProfessionalsMigrationReport() {
  return lastMigrationReport;
}

export function runProfessionalsMigration2026(): void {
  if (localStorage.getItem(MIGRATION_PROF_2026_KEY) === 'true') return;

  const all: Professional[] = JSON.parse(localStorage.getItem(KEY_PROFESSIONALS) || '[]');
  const report: { created: string[]; updated: string[]; skipped: string[]; conflicts: string[] } = {
    created: [], updated: [], skipped: [], conflicts: []
  };

  const normPhone = (p: string) => p.replace(/\D/g, '');
  const findByName = (name: string) => all.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
  const findByPhone = (phone: string) => all.find(p => normPhone(p.phone || '') === normPhone(phone));

  // Determine target salonId from existing correction-target professionals, or first salon
  const correctionNames = ['Edilma', 'Paula Salviano', 'Dani', 'Mariza', 'Salão'];
  let targetSalonId = '';
  for (const n of correctionNames) {
    const f = findByName(n);
    if (f) { targetSalonId = f.salonId; break; }
  }
  if (!targetSalonId) {
    const salons: any[] = JSON.parse(localStorage.getItem(KEY_SALONS) || '[]');
    targetSalonId = salons[0]?.id || '';
  }

  // --- 1. Commission corrections ---
  const commCorrections = [
    { name: 'Salão', rate: 50 },
    { name: 'Mariza', rate: 50 },
    { name: 'Paula Salviano', rate: 50 },
  ];
  for (const c of commCorrections) {
    const found = findByName(c.name);
    if (found) {
      if (found.commissionRate !== c.rate) {
        found.commissionRate = c.rate;
        report.updated.push(`${c.name} (comissão → ${c.rate}%)`);
      }
    } else {
      report.conflicts.push(`${c.name}: não encontrado para corrigir comissão`);
    }
  }

  // --- 2. Phone corrections ---
  const phoneCorrections = [
    { name: 'Edilma', phone: '81999265814' },
    { name: 'Paula Salviano', phone: '81992095835' },
    { name: 'Dani', phone: '81994550361' },
    { name: 'Mariza', phone: '81984247909' },
  ];
  for (const c of phoneCorrections) {
    const found = findByName(c.name);
    if (found) {
      if (normPhone(found.phone || '') !== normPhone(c.phone)) {
        found.phone = c.phone;
        report.updated.push(`${c.name} (telefone → ${c.phone})`);
      }
    } else {
      report.conflicts.push(`${c.name}: não encontrado para corrigir telefone`);
    }
  }

  // --- 3. New professionals ---
  const newProfs: Array<{ name: string; phone: string; commissionRate: number }> = [
    { name: 'Sandrinha', phone: '81997149793', commissionRate: 40 },
    { name: 'Alcilene', phone: '81984353655', commissionRate: 50 },
    { name: 'Ana Holanda', phone: '81986495706', commissionRate: 55 },
    { name: 'Loura', phone: '81987387274', commissionRate: 0 },
    { name: 'Maria Eduarda', phone: '81981180975', commissionRate: 50 },
    { name: 'Maria Luiza', phone: '81997875738', commissionRate: 50 },
    { name: 'Elza Salviano', phone: '81987387343', commissionRate: 50 },
    { name: 'Deda', phone: '81987969423', commissionRate: 50 },
  ];

  // Special validation: Elza / Elza Salviano
  const elza = findByName('Elza');
  const elzaSalviano = findByName('Elza Salviano');

  if (elza) {
    if (elzaSalviano && elzaSalviano.id !== elza.id) {
      // Both exist: merge into Elza, remove duplicate
      report.conflicts.push('"Elza" e "Elza Salviano" ambos existem — mesclando');
      elza.name = 'Elza Salviano';
      elza.phone = '81987387343';
      elza.commissionRate = 50;
      const dupIdx = all.findIndex(p => p.name.toLowerCase().trim() === 'elza salviano' && p.id !== elza.id);
      if (dupIdx !== -1) all.splice(dupIdx, 1);
      report.updated.push('Elza → Elza Salviano (mesclado, duplicata removida)');
    } else {
      // Only Elza exists: update in place
      elza.name = 'Elza Salviano';
      elza.phone = '81987387343';
      elza.commissionRate = 50;
      report.updated.push('Elza → Elza Salviano (atualizado)');
    }
  }

  // Create each new professional if not duplicate
  for (const np of newProfs) {
    // Skip Elza Salviano if already handled
    if (np.name === 'Elza Salviano' && (elza || elzaSalviano)) continue;

    const byPhone = findByPhone(np.phone);
    const byName = findByName(np.name);

    if (byPhone) {
      report.skipped.push(`${np.name} (já existe como "${byPhone.name}" pelo telefone)`);
      continue;
    }
    if (byName) {
      report.skipped.push(`${np.name} (já existe pelo nome)`);
      continue;
    }

    const newProf: Professional = {
      id: 'prof_' + np.name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4),
      salonId: targetSalonId,
      name: np.name,
      phone: np.phone,
      password: '1234',
      commissionRate: np.commissionRate,
      isActive: true,
      category: 'Cabelo',
      role: 'profissional',
      specialties: [],
    };
    all.push(newProf);
    report.created.push(np.name);
  }

  // Persist
  localStorage.setItem(KEY_PROFESSIONALS, JSON.stringify(all));
  localStorage.setItem(MIGRATION_PROF_2026_KEY, 'true');
  lastMigrationReport = report;

  console.log('[Migração 2026] Relatório de Colaboradores:', JSON.stringify(report, null, 2));
}

export function recalculateAllCommissions(salonId: string): { successCount: number; comandaCount: number } {
  const comandas = loadComandas();
  const professionals = loadProfessionals();
  const products = loadProducts();

  let successCount = 0;
  let comandaCountForSalon = 0;

  const recalculatedComandas = comandas.map(comanda => {
    // Check if the comanda belongs to this salon
    if (comanda.salonId !== salonId) {
      return comanda;
    }

    comandaCountForSalon++;

    // Recalculate services inside comanda
    const recalculatedServices = (comanda.services || []).map(s => {
      // Find executing professional
      const profObj = professionals.find(p => p.id === s.professionalId);
      
      // Priority Rule 1: If professional has commissionRate > 0
      let rate = 0;
      if (profObj && profObj.commissionRate > 0) {
        rate = profObj.commissionRate;
      } else {
        // Rule 2 & 3: Services do not have a catalog commissionRate, so rate is 0
        rate = 0;
      }
      
      const baseCommission = (s.price * rate) / 100;

      // Propagate card fee deductions if they already existed
      let finalCommission = baseCommission;
      if (comanda.status === 'Concluido' && (comanda.profCardFeeDeduction ?? 0) > 0) {
        const totalVal = comanda.totalValue || 1;
        const weight = s.price / totalVal;
        const deductionForThisItem = (comanda.profCardFeeDeduction ?? 0) * weight;
        finalCommission = Math.max(0, parseFloat((baseCommission - deductionForThisItem).toFixed(2)));
      }

      return {
        ...s,
        commissionRate: rate,
        originalCommissionValue: baseCommission,
        commissionValue: parseFloat(finalCommission.toFixed(2))
      };
    });

    // Recalculate products inside comanda
    const recalculatedProducts = (comanda.products || []).map(p => {
      // Find executing professional (seller)
      const profObj = p.professionalId ? professionals.find(pUsr => pUsr.id === p.professionalId) : null;
      
      // Find product definitions
      const prodObj = products.find(prod => prod.id === p.id);

      let rate = 0;
      // Priority Rule 1: Professional's commission rate is priority
      if (profObj && profObj.commissionRate > 0) {
        rate = profObj.commissionRate;
      } 
      // Priority Rule 2: If professional doesn't have it, use product's catalog rate
      else if (prodObj && prodObj.commissionRate && prodObj.commissionRate > 0) {
        rate = prodObj.commissionRate;
      } 
      // Priority Rule 3: Otherwise, 0
      else {
        rate = 0;
      }

      const baseCommission = (p.price * rate) / 100;

      // Propagate card fee deductions if they already existed
      let finalCommission = baseCommission;
      if (comanda.status === 'Concluido' && (comanda.profCardFeeDeduction ?? 0) > 0) {
        const totalVal = comanda.totalValue || 1;
        const weight = p.price / totalVal;
        const deductionForThisItem = (comanda.profCardFeeDeduction ?? 0) * weight;
        finalCommission = Math.max(0, parseFloat((baseCommission - deductionForThisItem).toFixed(2)));
      }

      return {
        ...p,
        commissionRate: rate,
        originalCommissionValue: baseCommission,
        commissionValue: parseFloat(finalCommission.toFixed(2))
      };
    });

    successCount++;
    return {
      ...comanda,
      services: recalculatedServices,
      products: recalculatedProducts
    };
  });

  saveComandas(recalculatedComandas);

  // Persiste cada comanda recalculada no Supabase via REST API (assíncrono, não bloqueia o retorno)
  const changedComandas = recalculatedComandas.filter(c => c.salonId === salonId);
  (async () => {
    for (const com of changedComandas) {
      try {
        await fetch(`/api/comandas/${com.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(com)
        });
      } catch (err) {
        console.warn("[Recalcular Comissões] Erro ao sincronizar comanda", com.id, err);
      }
    }
  })();

  return { successCount: successCount - (comandas.length - comandaCountForSalon), comandaCount: comandaCountForSalon };
}

