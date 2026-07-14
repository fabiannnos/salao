import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Salon, Professional, Service, Product, Client, Comanda, 
  FinancialRecord, Appointment, ChartAccountGroup, ComandaStatus, ServiceCategory,
  CardAcquirer
} from './types';
import { 
  loadSalons, saveSalons,
  loadProfessionals, saveProfessionals,
  loadServices, saveServices,
  loadProducts, saveProducts,
  loadClients, saveClients,
  loadComandas, saveComandas,
  loadFinancials, saveFinancials,
  loadAppointments, saveAppointments,
  loadCharts, saveCharts,
  loadServiceCategories, saveServiceCategories,
  addComandaAndUpdateFinance, updateComandaStatus,
  loadCardAcquirers, saveCardAcquirers, clearSalonMovements, recalculateAllCommissions, deleteSalonDataFull,
  runProfessionalsMigration2026, getLastProfessionalsMigrationReport
} from './dataStore';

import ModalPagamentoPix from './components/ModalPagamentoPix';
import ModalConfirmCascadeDelete from './components/ModalConfirmCascadeDelete';
import { formatPhone, formatCNPJ, formatDateBR } from './utils';
import { getTenantStatus, getDaysRemaining, GRACE_PERIOD_DAYS, type TenantStatus } from './utils/billing/getTenantStatus';

// Icons
import { 
  Scissors, Calendar, FileText, Wallet, Settings, LogOut, 
  UserCheck, Building, HelpCircle, Key, Phone, CheckSquare, Sparkles, Building2,
  Menu, X, BarChart3, ShieldCheck, ShieldAlert, AlertCircle, CreditCard, Info,
  RefreshCw, MessageCircle
} from 'lucide-react';

// Subcomponents
import AlertModal from './components/AlertModal';
import DashboardAdmin from './components/DashboardAdmin';
import ComandasKanban from './components/ComandasKanban';
import FinanceiroDashboard from './components/FinanceiroDashboard';
import RelatoriosDashboard from './components/RelatoriosDashboard';
import ProfessionalDashboard from './components/ProfessionalDashboard';
import AgendamentosList from './components/AgendamentosList';
import ColecoesCrud from './components/ColecoesCrud';
import ConfiguracoesTenancy from './components/ConfiguracoesTenancy';
import GestaoModelloLogo from './components/GestaoModelloLogo';
import SaaSManagerDashboard from './components/SaaSManagerDashboard';

export default function App() {
  // Authentication & Tenancy context states
  const [userRole, setUserRole] = useState<'ADMIN' | 'PROFESSIONAL' | 'SAAS_ADMIN' | null>(null);
  const [currentSalon, setCurrentSalon] = useState<Salon | null>(null);
  const [currentProfessional, setCurrentProfessional] = useState<Professional | null>(null);

  // Keep refs up-to-date to prevent stale closures in async sync effects
  const userRoleRef = useRef(userRole);
  const currentSalonRef = useRef(currentSalon);
  const isSyncingRef = useRef(false);
  const performAutoSyncRef = useRef<typeof performAutoSync | null>(null);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  useEffect(() => {
    currentSalonRef.current = currentSalon;
  }, [currentSalon]);

  useEffect(() => {
    performAutoSyncRef.current = performAutoSync;
  });

  // Active Admin workspace Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agendamentos' | 'comandas' | 'financeiro' | 'relatorios' | 'colecoes' | 'configuracoes'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Persist active tab for session restore on refresh
  useEffect(() => {
    if (userRole !== null) {
      localStorage.setItem('auth_lastRoute', activeTab);
    }
  }, [activeTab, userRole]);

  // Login Input fields
  const [loginCNPJ, setLoginCNPJ] = useState('');
  const [loginAdminPhone, setLoginAdminPhone] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginType, setLoginType] = useState<'ADMIN' | 'PROFESSIONAL'>('ADMIN');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLock, setLoginLock] = useState<{ count: number; lockUntil: number | null }>({ count: 0, lockUntil: null });

  // RATE LIMIT: bloqueia após 5 tentativas falhas consecutivas por 15 minutos
  const LOGIN_MAX_ATTEMPTS = 5;
  const LOGIN_LOCK_MS = 15 * 60 * 1000;

  const checkLoginLock = (): boolean => {
    if (loginLock.lockUntil && Date.now() < loginLock.lockUntil) {
      const remainingMin = Math.ceil((loginLock.lockUntil - Date.now()) / 60000);
      setLoginError(`Muitas tentativas falhas. Acesso bloqueado por ${remainingMin} minuto(s). Tente novamente mais tarde.`);
      return true;
    }
    if (loginLock.lockUntil && Date.now() >= loginLock.lockUntil) {
      setLoginLock({ count: 0, lockUntil: null });
    }
    return false;
  };

  const registerLoginFailure = () => {
    const newCount = loginLock.count + 1;
    if (newCount >= LOGIN_MAX_ATTEMPTS) {
      const lockUntil = Date.now() + LOGIN_LOCK_MS;
      setLoginLock({ count: newCount, lockUntil });
      setLoginError(`Limite de ${LOGIN_MAX_ATTEMPTS} tentativas atingido. Acesso bloqueado por 15 minutos.`);
    } else {
      setLoginLock({ count: newCount, lockUntil: null });
    }
  };

  const registerLoginSuccess = () => {
    setLoginLock({ count: 0, lockUntil: null });
  };

  // SaaS Master Registration & Logins
  const [isSaaSLogin, setIsSaaSLogin] = useState(false);
  const [saasEmail, setSaasEmail] = useState('');
  const [saasPassword, setSaasPassword] = useState('');
  const [selectedResetSalonId, setSelectedResetSalonId] = useState<string>('');
  const [resetConfirmTargetId, setResetConfirmTargetId] = useState<string | null>(null);
  const [resetSuccessAlert, setResetSuccessAlert] = useState<string | null>(null);

  // Loaded database synchronized arrays
  const [salons, setSalons] = useState<Salon[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [charts, setCharts] = useState<ChartAccountGroup[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [cardAcquirers, setCardAcquirers] = useState<CardAcquirer[]>([]);

  // Subscription, local warnings, and billing simulator states
  const [dismissedWarning, setDismissedWarning] = useState<boolean>(false);
  const [showStripeSuccessModal, setShowStripeSuccessModal] = useState<boolean>(false);
  const [showPixModal, setShowPixModal] = useState<boolean>(false);
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; paymentId: string } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [cascadeDeleteTarget, setCascadeDeleteTarget] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{message: string; variant?: 'info' | 'success' | 'error'} | null>(null);
  const [restrictedActionName, setRestrictedActionName] = useState<string | null>(null);

  // Load and pull real database on initialization to ensure consistency and prevent data resets
  useEffect(() => {
    const fetchAndInitialize = async () => {
      try {
        const res = await fetch("/api/supa-pull");
        const data = await res.json();
        
        if (res.ok && data && data.success && !data.isMock) {
          console.log("[Database Pull] Sincronizando dados autoritativos do Supabase na inicialização...");
          
          // Merge PIX fields from localStorage into server data (server may strip unknown fields)
          const localSalonsBefore = loadSalons();
          
          // Preserve local-only tenants (created offline/pending sync)
          const localOnlyTenants = localSalonsBefore.filter(
            (local: any) => !data.tenants?.some((server: any) => server.id === local.id)
          );
          
          const mergedTenants = [
            ...localOnlyTenants,
            ...(data.tenants || []).map((serverSalon: any) => {
              const localSalon = localSalonsBefore.find((s: any) => s.id === serverSalon.id);
              if (localSalon) {
                return {
                  ...serverSalon,
                  // preservar campos exclusivos locais
                  pixKeyType: localSalon.pixKeyType,
                  pixKey: localSalon.pixKey,
                  pixMerchantName: localSalon.pixMerchantName
                };
              }
              return serverSalon;
            })
          ];
          saveSalons(mergedTenants);
          saveProfessionals(data.professionals || []);
          saveServices(data.services || []);
          saveProducts(data.products || []);
          saveClients(data.clients || []);
          saveComandas(data.comandas || []);
          saveFinancials(data.financials || []);
          saveAppointments(data.appointments || []);
          
          setSalons(mergedTenants);
          setProfessionals(loadProfessionals());
          setServices(loadServices());
          setProducts(loadProducts());
          setClients(loadClients());
          setComandas(loadComandas());
          setFinancials(loadFinancials());
          setAppointments(loadAppointments());
        } else {
          console.log("[Database Pull] Iniciando em modo offline sandbox usando dados de localStorage.");
          setSalons(loadSalons());
          setProfessionals(loadProfessionals());
          setServices(loadServices());
          setProducts(loadProducts());
          setClients(loadClients());
          setComandas(loadComandas());
          setFinancials(loadFinancials());
          setAppointments(loadAppointments());
        }
      } catch (err) {
        console.warn("[Database Pull Fail] Falha ao tentar puxar banco de dados na inicialização, usando dados locais:", err);
        setSalons(loadSalons());
        setProfessionals(loadProfessionals());
        setServices(loadServices());
        setProducts(loadProducts());
        setClients(loadClients());
        setComandas(loadComandas());
        setFinancials(loadFinancials());
        setAppointments(loadAppointments());
      }
      
      // Load configurations
      setCharts(loadCharts());
      setServiceCategories(loadServiceCategories());
      setCardAcquirers(loadCardAcquirers());

      // Run 2026 professionals migration
      runProfessionalsMigration2026();

      // Restore persisted session after data is loaded
      const savedRole = localStorage.getItem('auth_userRole');
      if (savedRole && userRoleRef.current === null) {
        const allSalons = loadSalons();
        const allProfs = loadProfessionals();

        if (savedRole === 'ADMIN') {
          const savedSalonId = localStorage.getItem('auth_currentSalonId');
          const savedProfId = localStorage.getItem('auth_currentProfessionalId');
          if (savedSalonId) {
            const salon = allSalons.find(s => s.id === savedSalonId);
            if (salon) {
              setCurrentSalon(salon);
              setUserRole('ADMIN');
              setProfessionals(loadProfessionals(salon.id));
              setServices(loadServices(salon.id));
              setProducts(loadProducts(salon.id));
              setClients(loadClients(salon.id));
              setComandas(loadComandas(salon.id));
              setFinancials(loadFinancials(salon.id));
              setAppointments(loadAppointments(salon.id));
              setCharts(loadCharts(salon.id));
              setServiceCategories(loadServiceCategories(salon.id));
              setCardAcquirers(loadCardAcquirers(salon.id));
              if (savedProfId) {
                const prof = allProfs.find(p => p.id === savedProfId && p.salonId === salon.id);
                if (prof) setCurrentProfessional(prof);
              }
            }
          }
        } else if (savedRole === 'PROFESSIONAL') {
          const savedProfId = localStorage.getItem('auth_currentProfessionalId');
          if (savedProfId) {
            const prof = allProfs.find(p => p.id === savedProfId);
            if (prof) {
              setCurrentProfessional(prof);
              const salon = allSalons.find(s => s.id === prof.salonId);
              if (salon) setCurrentSalon(salon);
              setUserRole('PROFESSIONAL');
              setComandas(loadComandas(prof.salonId));
            }
          }
        } else if (savedRole === 'SAAS_ADMIN') {
          setUserRole('SAAS_ADMIN');
          setSalons(allSalons);
          setProfessionals(allProfs);
        }

        // Restore last active tab
        const savedTab = localStorage.getItem('auth_lastRoute');
        const validTabs: Array<string> = ['dashboard', 'agendamentos', 'comandas', 'financeiro', 'relatorios', 'colecoes', 'configuracoes'];
        if (savedTab && validTabs.includes(savedTab)) {
          setActiveTab(savedTab as typeof activeTab);
        }
      }
    };

    fetchAndInitialize();
  }, []);

  // Show migration report when available
  useEffect(() => {
    const report = getLastProfessionalsMigrationReport();
    if (report && (report.created.length > 0 || report.updated.length > 0 || report.conflicts.length > 0)) {
      const lines: string[] = [];
      if (report.created.length) lines.push(`✅ Criados: ${report.created.join(', ')}`);
      if (report.updated.length) lines.push(`🔄 Atualizados: ${report.updated.join(', ')}`);
      if (report.skipped.length) lines.push(`⏭️ Ignorados: ${report.skipped.join(', ')}`);
      if (report.conflicts.length) lines.push(`⚠️ Conflitos: ${report.conflicts.join(', ')}`);
      setAlertState({ message: 'Migração de Colaboradores 2026\n' + lines.join('\n'), variant: 'info' });
      console.log('[Migração 2026] Relatório completo:', JSON.stringify(report, null, 2));
    }
  }, []);

  // Listen and process simulated/real Stripe Checkout redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // 1. Processamento de redirecionamento real do Stripe Checkout usando backend de verificação segura (fallback robusto sem webhooks públicos)
    if (params.get("stripe_session_id")) {
      const sessionId = params.get("stripe_session_id")!;
      const sId = params.get("salon_id") || (currentSalon?.id);
      
      const verifyRealPayment = async () => {
        try {
          const response = await fetch("/api/verify-checkout-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ sessionId, salonId: sId })
          });
          const data = await response.json();
          if (response.ok && data.success) {
            const list = loadSalons();
            const foundIdx = list.findIndex(s => s.id === data.salonId);
            if (foundIdx !== -1) {
              const updatedSalonItem = {
                ...list[foundIdx],
                expirationDate: data.expirationDate,
                isActive: data.isActive
              };
              list[foundIdx] = updatedSalonItem;
              saveSalons(list);
              setSalons(list);
              setCurrentSalon(updatedSalonItem);
              setShowStripeSuccessModal(true);
              
              // Se não estiver logado como administrador, força login para usabilidade impecável!
              if (!userRole) {
                setUserRole('ADMIN');
                setProfessionals(loadProfessionals(data.salonId));
                setServices(loadServices(data.salonId));
                setProducts(loadProducts(data.salonId));
                setClients(loadClients(data.salonId));
                setComandas(loadComandas(data.salonId));
                setFinancials(loadFinancials(data.salonId));
                setAppointments(loadAppointments(data.salonId));
                setCharts(loadCharts(data.salonId));
                setServiceCategories(loadServiceCategories(data.salonId));
                setCardAcquirers(loadCardAcquirers(data.salonId));
                setActiveTab('configuracoes');
              } else {
                setActiveTab('configuracoes');
              }
            }
          } else {
            console.error("Erro na verificação da sessão Stripe pelo backend:", data.error);
            setAlertState({message: "Sua transação Stripe foi concluída, mas o servidor local relatou um erro ao atualizar: " + (data.error || "Erro de persistência."), variant: 'error'});
          }
        } catch (err: any) {
          console.error("Falha ao comunicar verificação da sessão Stripe:", err);
          setAlertState({message: "Erro de comunicação ao validar a ativação da sua licença: " + err.message, variant: 'error'});
        } finally {
          const newPath = window.location.pathname;
          window.history.replaceState({}, document.title, newPath);
        }
      };
      
      verifyRealPayment();
    }
    
    // Removido: mock checkout simulado eliminado. Pagamento PIX real é obrigatório.
  }, [currentSalon, userRole]);

  // Status de assinatura calculado reativamente
  const tenantStatus = useMemo<TenantStatus>(() => {
    if (userRole === "SAAS_ADMIN") return "ACTIVE";
    return getTenantStatus(currentSalon?.expirationDate).status;
  }, [currentSalon?.expirationDate, userRole]);

  // Wrapper para compatibilidade com componentes existentes (ConfiguracoesTenancy)
  const getSubscriptionDaysRemaining = () => {
    if (!currentSalon) return 999;
    return getDaysRemaining(currentSalon.expirationDate);
  };

  const isRestrictedModeActive = () => {
    if (!currentSalon) return false;
    if (userRole === "SAAS_ADMIN") return false;
    const { status } = getTenantStatus(currentSalon.expirationDate);
    return status === "EXPIRED";
  };

  // Intercepta e bloqueia alterações no banco se o sistema estiver bloqueado
  const isMutationBlocked = (actionName: string) => {
    if (isRestrictedModeActive()) {
      setRestrictedActionName(actionName);
      return true;
    }
    return false;
  };

  // Todas as tabs são acessíveis em modo somente leitura
  const isTabBlocked = (_tabId?: string): boolean => {
    return false;
  };

  const isReadOnly = userRole !== "SAAS_ADMIN" && tenantStatus === "EXPIRED";

  const handleLaunchStripeCheckout = async () => {
    if (!currentSalon) return;
    if (isProcessingPayment) return;
    setIsProcessingPayment(true);

    try {
      const pixRes = await fetch("/api/checkout/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId: currentSalon.id }),
      });
      const pixDataRaw = await pixRes.json();

      if (pixRes.ok && pixDataRaw.success && pixDataRaw.encodedImage) {
        setPixData({
          encodedImage: pixDataRaw.encodedImage,
          payload: pixDataRaw.payload,
          paymentId: pixDataRaw.paymentId,
        });
        setShowPixModal(true);
        setIsProcessingPayment(false);
        return;
      }

      if (pixDataRaw.error) {
        setAlertState({ message: `Erro ao gerar PIX: ${pixDataRaw.error}`, variant: "error" });
        setIsProcessingPayment(false);
        return;
      }

      // Caso inesperado: resposta sem erro, sem QR Code, sem isMock
      setAlertState({ message: "Erro inesperado ao gerar PIX. Tente novamente.", variant: "error" });
      setIsProcessingPayment(false);
    } catch (err: any) {
      console.error("[PIX] Erro ao chamar Mercado Pago:", err?.message);
      setAlertState({ message: "Erro de conexão com o gateway de pagamento. Tente novamente.", variant: "error" });
      setIsProcessingPayment(false);
    }
  };
  
  // Sincronização Automática em segundo plano com o Supabase Cloud
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<string | null>(null);

  const performAutoSync = async (force: boolean = false) => {
    if (!force && (isSyncingRef.current || isAutoSyncing)) return;
    isSyncingRef.current = true;
    setIsAutoSyncing(true);
    try {
      const payload = {
        isSaaSAdmin: userRoleRef.current === 'SAAS_ADMIN',
        tenants: loadSalons(),
        professionals: loadProfessionals(),
        services: loadServices(),
        products: loadProducts(),
        financials: loadFinancials()
      };

      const response = await fetch("/api/supa-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`[Background Sync] Servidor retornou status ${response.status} (${response.statusText}). Os dados permanecem guardados localmente.`);
        return;
      }

      const data = await response.json();
      if (data) {
        // Se o servidor retornou os dados atualizados reais dos inquilinos (salões), atualiza no estado e local storage!
        // Fazemos isso independente de data.success para garantir que as atualizações de licenças e limites corporativos nunca fiquem presas por erros em tabelas secundárias.
        if (Array.isArray(data.tenants)) {
          // Servidor é a fonte da verdade para TODOS os campos de tenant
          const mergedTenants = data.tenants.map((serverSalon: any) => ({
            ...serverSalon,
          }));
          triggerUpdateSalons(mergedTenants);
          
          // Se houver um salão selecionado no momento, vamos atualizar a referência do currentSalon para refletir e exibir a nova data de expiração imediatamente!
          const activeSalon = currentSalonRef.current;
          if (activeSalon) {
            const updatedCurrent = mergedTenants.find((s: any) => s.id === activeSalon.id);
            if (updatedCurrent) {
              setCurrentSalon(updatedCurrent);
            }
          }
        }

        if (data.success) {
          setLastAutoSyncTime(new Date().toLocaleTimeString('pt-BR'));
          console.log(`[Database Auto-Sync] Todos os dados sincronizados em segundo plano com sucesso às ${new Date().toLocaleTimeString('pt-BR')}`);
        }
      }
    } catch (err) {
      console.warn("[Background Sync] Servidor ocupado ou offline. Os dados permanecem guardados localmente com segurança.", err);
    } finally {
      setIsAutoSyncing(false);
      isSyncingRef.current = false;
    }
  };

  // Update ref after performAutoSync is defined to avoid temporal dead zone
  useEffect(() => {
    performAutoSyncRef.current = performAutoSync;
  }, []);

  // 1. Agenda uma execução periódica em segundo plano a cada 45 segundos
  useEffect(() => {
    // Primeira sincronização após carregar os estados iniciais
    const initialSyncTimer = setTimeout(() => {
      performAutoSyncRef.current?.();
    }, 3000);

    const intervalTimer = setInterval(() => {
      performAutoSyncRef.current?.();
    }, 45000);

    return () => {
      clearTimeout(initialSyncTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  // 2. Dispara sincronização inteligente após alterações nos cadastros e comandas (debounced em 5 segundos)
  useEffect(() => {
    // Evita loop no primeiro carregamento em lote de arrays vazios antes do mount
    if (salons.length === 0) return;

    const delayDebounce = setTimeout(() => {
      performAutoSyncRef.current?.();
    }, 5000);

    return () => clearTimeout(delayDebounce);
  }, [salons, professionals, services, products, clients, comandas, financials, appointments]);

  // Multi-Tenant state save adapters
  const triggerUpdateSalons = (list: Salon[]) => {
    setSalons(list);
    saveSalons(list);
  };

  const triggerUpdateProfessionals = (list: Professional[]) => {
    if (isMutationBlocked("Salvar Colaboradores")) return;
    // Save to all backend array
    const all = loadProfessionals();
    const updated = all.filter(p => p.salonId !== currentSalon?.id).concat(list);
    setProfessionals(list);
    saveProfessionals(updated);
  };

  const triggerUpdateServices = (list: Service[]) => {
    if (isMutationBlocked("Salvar Serviços")) return;
    const all = loadServices();
    const updated = all.filter(s => s.salonId !== currentSalon?.id).concat(list);
    setServices(list);
    saveServices(updated);
  };

  const triggerUpdateProducts = (list: Product[]) => {
    if (isMutationBlocked("Salvar Produtos")) return;
    const all = loadProducts();
    const updated = all.filter(p => p.salonId !== currentSalon?.id).concat(list);
    setProducts(list);
    saveProducts(updated);
  };

  const triggerUpdateClients = async (list: Client[]) => {
    if (isMutationBlocked("Salvar Clientes")) return;
    const all = loadClients();
    const oldList = all.filter(c => c.salonId === currentSalon?.id);
    const oldIds = new Set(oldList.map(c => c.id));
    const newIds = new Set(list.map(c => c.id));
    const added = list.filter(c => !oldIds.has(c.id));
    const deleted = oldList.filter(c => !newIds.has(c.id));

    try {
      for (const client of added) {
        await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(client)
        });
      }
      for (const client of list) {
        if (oldIds.has(client.id)) {
          await fetch(`/api/clients/${client.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(client)
          });
        }
      }
      for (const client of deleted) {
        await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      }
    } catch (err) {
      console.warn("[Client Sync] Falha ao sincronizar cliente com Supabase", err);
      return;
    }

    const updated = all.filter(c => c.salonId !== currentSalon?.id).concat(list);
    setClients(list);
    saveClients(updated);
  };

  const triggerUpdateAppointments = (list: Appointment[]) => {
    if (isMutationBlocked("Salvar Agendamentos")) return;
    const all = loadAppointments();
    const updated = all.filter(a => a.salonId !== currentSalon?.id).concat(list);
    setAppointments(list);
    saveAppointments(updated);
  };

  const triggerUpdateCharts = (list: ChartAccountGroup[]) => {
    if (isMutationBlocked("Salvar Plano de Contas")) return;
    const all = loadCharts();
    const updated = all.filter(c => c.salonId !== currentSalon?.id).concat(list);
    setCharts(list);
    saveCharts(updated);
  };

  const triggerUpdateServiceCategories = (list: ServiceCategory[]) => {
    if (isMutationBlocked("Salvar Categorias")) return;
    const all = loadServiceCategories();
    const updated = all.filter(sc => sc.salonId !== currentSalon?.id).concat(list);
    setServiceCategories(list);
    saveServiceCategories(updated);
  };

  const triggerUpdateCardAcquirers = (list: CardAcquirer[]) => {
    if (isMutationBlocked("Salvar Configurações de Taxa")) return;
    const all = loadCardAcquirers();
    const updated = all.filter(a => a.salonId !== currentSalon?.id).concat(list);
    setCardAcquirers(list);
    saveCardAcquirers(updated);
  };

  // Comanda status trigger updates with active financial logging
  const handleAddComandaObj = async (newComanda: Comanda) => {
    if (isMutationBlocked("Criar Comanda")) return;
    try {
      const res = await fetch("/api/comandas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newComanda)
      });
      const data = await res.json();
      if (!data.success) {
        console.warn("[Comanda Create] Falha ao criar no servidor:", data.error);
      }
    } catch (err) {
      console.warn("[Comanda Create] Erro de rede ao criar no servidor:", err);
    }
    const { comanda, triggeredFinance } = addComandaAndUpdateFinance(newComanda);
    
    // Update active states
    setComandas(prev => [...prev, comanda]);
    if (triggeredFinance.length > 0) {
      setFinancials(prev => [...prev, ...triggeredFinance]);
    }
  };

  const handleUpdateComandaObj = async (updatedComanda: Comanda) => {
    if (isMutationBlocked("Atualizar Comanda")) return;
    try {
      const res = await fetch(`/api/comandas/${updatedComanda.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedComanda)
      });
      const data = await res.json();
      if (!data.success) {
        console.warn("[Comanda Update] Falha ao atualizar no servidor:", data.error);
      }
    } catch (err) {
      console.warn("[Comanda Update] Erro de rede ao atualizar no servidor:", err);
    }
    const all = loadComandas();
    const idx = all.findIndex(c => c.id === updatedComanda.id);
    if (idx !== -1) {
      all[idx] = updatedComanda;
      saveComandas(all);
      if (currentSalon) {
        setComandas(all.filter(c => c.salonId === currentSalon.id));
      }
    }

    // Sync financial records linked to this comanda
    const allFin = loadFinancials();
    let finChanged = false;
    allFin.forEach(f => {
      if (f.relatedComandaId === updatedComanda.id) {
        f.date = updatedComanda.paymentDate || f.date;
        f.paymentDate = updatedComanda.paymentDate || f.paymentDate;
        f.competenceDate = updatedComanda.competenceDate || f.competenceDate;
        finChanged = true;
      }
    });
    if (finChanged) {
      saveFinancials(allFin);
      if (currentSalon) {
        setFinancials(allFin.filter(f => f.salonId === currentSalon.id));
      }
    }
  };

  const handleUpdateComandaStatus = async (id: string, newStatus: ComandaStatus, payment?: any, isFiado?: boolean, cardDetails?: any, pixPayload?: string) => {
    if (isMutationBlocked("Dar Baixa de Pagamento na Comanda")) return;
    const updated = updateComandaStatus(id, newStatus, payment, isFiado, cardDetails, pixPayload);
    if (updated) {
      try {
        const res = await fetch(`/api/comandas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated)
        });
        const data = await res.json();
        if (!data.success) {
          console.warn("[Comanda Status] Falha ao atualizar status no servidor:", data.error);
        }
      } catch (err) {
        console.warn("[Comanda Status] Erro de rede ao atualizar status no servidor:", err);
      }
      // Reload comandas and financials
      if (currentSalon) {
        setComandas(loadComandas(currentSalon.id));
        setFinancials(loadFinancials(currentSalon.id));
        setClients(loadClients(currentSalon.id));
      }
    }
  };

  const handleDeleteComandaObj = async (id: string) => {
    if (isMutationBlocked("Excluir Comanda")) return;
    // Abre modal de confirmação em cascata com preview dos registros vinculados
    setCascadeDeleteTarget(id);
  };

  const executeCascadeDelete = async (id: string) => {
    if (isMutationBlocked("Excluir Comanda")) return;
    try {
      const res = await fetch(`/api/comandas/${id}?cascade=true`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        console.warn("[Comanda Delete] Falha ao deletar no servidor:", data.error);
        return;
      }
    } catch (err) {
      console.warn("[Comanda Delete] Erro de rede ao deletar no servidor:", err);
      return;
    }
    const allComandas = loadComandas();
    const filtered = allComandas.filter(c => c.id !== id);
    saveComandas(filtered);
    if (currentSalon) {
      setComandas(filtered.filter(c => c.salonId === currentSalon.id));
    }

    // Remove registros financeiros vinculados à comanda excluída
    const allFinancials = loadFinancials();
    const filteredFinancials = allFinancials.filter(f => f.relatedComandaId !== id);
    saveFinancials(filteredFinancials);
    if (currentSalon) {
      setFinancials(filteredFinancials.filter(f => f.salonId === currentSalon.id));
    }
  };

  const handleAddFinancialRecordObj = (record: FinancialRecord) => {
    if (isMutationBlocked("Adicionar Lançamento Financeiro")) return;
    const allFinancials = loadFinancials();
    allFinancials.push(record);
    saveFinancials(allFinancials);
    if (currentSalon) {
      setFinancials(allFinancials.filter(f => f.salonId === currentSalon.id));
    }
  };

  const handleUpdateFinancialRecordObj = async (updatedRecord: FinancialRecord) => {
    if (isMutationBlocked("Atualizar Lançamento Financeiro")) return;
    const all = loadFinancials();
    const idx = all.findIndex(f => f.id === updatedRecord.id);
    if (idx !== -1) {
      all[idx] = updatedRecord;
      saveFinancials(all);

      // Bidirectional sync: if this has a related comanda, update it too
      if (updatedRecord.relatedComandaId) {
        const allComandas = loadComandas();
        const cIdx = allComandas.findIndex(c => c.id === updatedRecord.relatedComandaId);
        if (cIdx !== -1) {
          allComandas[cIdx].totalValue = updatedRecord.amount;
          if (updatedRecord.status === 'pago') {
            allComandas[cIdx].isFiado = false;
            allComandas[cIdx].paymentMethod = 'Pix';
            allComandas[cIdx].paymentDate = updatedRecord.paymentDate || new Date().toISOString().split('T')[0];
          } else {
            allComandas[cIdx].isFiado = true;
            allComandas[cIdx].paymentMethod = 'Caderno';
          }
          try {
            await fetch(`/api/comandas/${updatedRecord.relatedComandaId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(allComandas[cIdx])
            });
          } catch (err) {
            console.warn("[Comanda Sync] Falha ao sincronizar comanda via financeiro:", err);
          }
          saveComandas(allComandas);
          if (currentSalon) {
            setComandas(allComandas.filter(c => c.salonId === currentSalon.id));
          }
        }
      }

      if (currentSalon) {
        setFinancials(all.filter(f => f.salonId === currentSalon.id));
      }
    }
  };

  const handleDeleteFinancialRecordObj = async (id: string) => {
    if (isMutationBlocked("Excluir Lançamento Financeiro")) return;
    const all = loadFinancials();
    const targetRecord = all.find(f => f.id === id);

    // Se o registro financeiro tem comanda vinculada, deleta do Supabase primeiro
    if (targetRecord && targetRecord.relatedComandaId) {
      try {
        const res = await fetch(`/api/comandas/${targetRecord.relatedComandaId}`, { method: "DELETE" });
        const data = await res.json();
        if (!data.success) {
          console.warn("[Comanda Delete via Financeiro] Falha ao deletar comanda no servidor:", data.error);
          return;
        }
      } catch (err) {
        console.warn("[Comanda Delete via Financeiro] Erro de rede ao deletar comanda:", err);
        return;
      }
      const allComandas = loadComandas();
      const filteredComandas = allComandas.filter(c => c.id !== targetRecord.relatedComandaId);
      saveComandas(filteredComandas);
      if (currentSalon) {
        setComandas(filteredComandas.filter(c => c.salonId === currentSalon.id));
      }
    }

    const filtered = all.filter(f => f.id !== id);
    saveFinancials(filtered);
    if (currentSalon) {
      setFinancials(filtered.filter(f => f.salonId === currentSalon.id));
    }
  };

  // Settle Accounts Receivables "No Caderno" Debt
  const handleSettleDebtObj = async (comandaId: string) => {
    if (isMutationBlocked("Liquidar Débito no Cadastro")) return;
    const allComandas = loadComandas();
    const cIdx = allComandas.findIndex(c => c.id === comandaId);
    if (cIdx === -1) return;

    // Persiste a quitação no Supabase primeiro
    allComandas[cIdx].isFiado = false;
    allComandas[cIdx].paymentMethod = 'Pix';
    allComandas[cIdx].paymentDate = new Date().toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/comandas/${comandaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allComandas[cIdx])
      });
      const data = await res.json();
      if (!data.success) {
        console.warn("[Settle Debt] Falha ao quitar comanda no servidor:", data.error);
        return;
      }
    } catch (err) {
      console.warn("[Settle Debt] Erro de rede ao quitar comanda:", err);
      return;
    }
    saveComandas(allComandas);

    // Update financial record entries
    const allFinancials = loadFinancials();
    // Locate revenue for this comanda and mark as "pago"
    const fIdx = allFinancials.findIndex(f => f.relatedComandaId === comandaId && f.type === 'receita');
    if (fIdx !== -1) {
      allFinancials[fIdx].status = 'pago';
      allFinancials[fIdx].category = 'Serviço';
    }

    // Locate commission expenses and mark as "pago"
    allFinancials.forEach((f, idx) => {
      if (f.relatedComandaId === comandaId && f.type === 'despesa') {
        allFinancials[idx].status = 'pago';
      }
    });

    saveFinancials(allFinancials);

    // Refresh active views
    if (currentSalon) {
      setComandas(allComandas.filter(c => c.salonId === currentSalon.id));
      setFinancials(allFinancials.filter(f => f.salonId === currentSalon.id));
    }
  };

  // Convert booked appointment into Comanda
  const handleConvertAppToComandaObj = async (app: Appointment) => {
    if (isMutationBlocked("Converter Agendamento em Comanda")) return;
    const nextTicketNumber = `CMD-000${comandas.length + 1}`;
    
    let comandaServicesList = [];

    if (app.services && app.services.length > 0) {
      comandaServicesList = app.services.map(s => {
        const serviceProfId = (s as any).professionalId || app.professionalId;
        const serviceProfObj = professionals.find(p => p.id === serviceProfId);
        const serviceCRate = serviceProfObj ? serviceProfObj.commissionRate : 30;
        const serviceCommissionVal = (s.price * serviceCRate) / 100;
        return {
          id: s.id,
          name: s.name,
          price: s.price,
          professionalId: serviceProfId,
          professionalName: serviceProfObj ? serviceProfObj.name : (s as any).professionalName || app.professionalName,
          commissionRate: serviceCRate,
          commissionValue: serviceCommissionVal
        };
      });
    } else {
      const profObj = professionals.find(p => p.id === app.professionalId);
      const cRate = profObj ? profObj.commissionRate : 30;
      const cValue = (app.price * cRate) / 100;
      comandaServicesList = [{
        id: app.serviceId,
        name: app.serviceName,
        price: app.price,
        professionalId: app.professionalId,
        professionalName: app.professionalName,
        commissionRate: cRate,
        commissionValue: cValue
      }];
    }

    const totalVal = comandaServicesList.reduce((sum, s) => sum + s.price, 0);

    const newComanda: Comanda = {
      id: 'cmd_' + Math.random().toString(36).substr(2, 9),
      salonId: app.salonId,
      ticketNumber: nextTicketNumber,
      clientId: app.clientId,
      clientName: app.clientName,
      clientPhone: app.clientPhone,
      services: comandaServicesList,
      products: [],
      totalValue: totalVal,
      status: 'Aberto',
      dateCreated: new Date().toISOString().substring(0, 16),
      isFiado: false
    };

    handleAddComandaObj(newComanda);

    // Remove appointment
    await handleDeleteAppointmentObj(app.id);
  };

  const handleDeleteAppointmentObj = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Falha ao excluir agendamento no Supabase");
    } catch (err) {
      console.warn("[Appointment Sync] Falha ao excluir agendamento no Supabase", err);
      return;
    }
    const allAppts = loadAppointments();
    const filtered = allAppts.filter(a => a.id !== id);
    saveAppointments(filtered);
    if (currentSalon) {
      setAppointments(filtered.filter(a => a.salonId === currentSalon.id));
    }
  };

  const handleAddAppointmentObj = async (newApp: Appointment) => {
    if (isMutationBlocked("Criar Agendamento")) return;
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newApp)
      });
      if (!response.ok) throw new Error("Falha ao criar agendamento no Supabase");
    } catch (err) {
      console.warn("[Appointment Sync] Falha ao criar agendamento no Supabase", err);
      return;
    }
    const allAppts = loadAppointments();
    allAppts.push(newApp);
    saveAppointments(allAppts);
    if (currentSalon) {
      setAppointments(allAppts.filter(a => a.salonId === currentSalon.id));
    }
  };

  const handleUpdateAppointmentObj = async (updatedApp: Appointment) => {
    if (isMutationBlocked("Atualizar Agendamento")) return;
    try {
      const response = await fetch(`/api/appointments/${updatedApp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedApp)
      });
      if (!response.ok) throw new Error("Falha ao atualizar agendamento no Supabase");
    } catch (err) {
      console.warn("[Appointment Sync] Falha ao atualizar agendamento no Supabase", err);
      return;
    }
    const all = loadAppointments();
    const idx = all.findIndex(a => a.id === updatedApp.id);
    if (idx !== -1) {
      all[idx] = updatedApp;
      saveAppointments(all);
      if (currentSalon) {
        setAppointments(all.filter(a => a.salonId === currentSalon.id));
      }
    }
  };

  // Salon multi-tenant registrations handler
  const handleAddNewSalonObj = (newSalon: Salon) => {
    const updated = [...salons, newSalon];
    triggerUpdateSalons(updated);
  };

  const handleUpdateSalonObj = async (updatedSalon: Salon) => {
    // 1. PRIMEIRO persiste campos de billing no servidor via endpoint dedicado
    //    (auto-sync NÃO sobrescreve billing fields no Supabase, então precisamos
    //     garantir que o banco já tenha os novos valores ANTES do sync)
    try {
      const existingSalonForBilling = salons.find(s => s.id === updatedSalon.id);
      const billingResp = await fetch("/api/update-tenant-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: updatedSalon.id,
          expirationDate: updatedSalon.expirationDate,
          planValue: updatedSalon.planValue,
          isActive: updatedSalon.isActive,
          cardFeePercentProfDeduct: updatedSalon.cardFeePercentProfDeduct ?? existingSalonForBilling?.cardFeePercentProfDeduct,
        })
      });
      const billingData = await billingResp.json();
      if (!billingData.success) {
        console.error("[Update Billing] Falha ao persistir:", billingData.error);
      }
    } catch (err) {
      console.error("[Update Billing] Erro de rede ao persistir:", err);
    }

    // 2. DEPOIS atualiza estado local (React + localStorage) e dispara auto-sync
    //    O auto-sync agora vai ler do banco que já tem os valores atualizados
    const updated = salons.map(s => s.id === updatedSalon.id ? updatedSalon : s);
    triggerUpdateSalons(updated);
    if (currentSalon && currentSalon.id === updatedSalon.id) {
      setCurrentSalon(updatedSalon);
    }
    performAutoSync(true);
  };

  const handleAddNewChartGroupObj = (group: ChartAccountGroup) => {
    const updated = [...charts, group];
    triggerUpdateCharts(updated);
  };

  const handleClearSalonData = (salonId: string) => {
    clearSalonMovements(salonId);
    if (currentSalon && currentSalon.id === salonId) {
      setComandas([]);
      setFinancials([]);
      setAppointments([]);
    }
  };

  const handleDeleteSalonFull = async (salonId: string, passwordConfirm: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await fetch('/api/delete-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: salonId, password: passwordConfirm })
      });
      const data = await response.json();
      if (data.success) {
        // 1. Apagar tudo do panel local/localStorage
        deleteSalonDataFull(salonId);
        
        // 2. Atualizar estados locais do React
        const remainingSalons = loadSalons();
        setSalons(remainingSalons);
        setProfessionals(loadProfessionals());
        setServices(loadServices());
        setProducts(loadProducts());
        setClients(loadClients());
        setComandas(loadComandas());
        setFinancials(loadFinancials());
        setAppointments(loadAppointments());
        
        // Se o salão deletado for o selecionado atualmente, limpa
        if (currentSalon && currentSalon.id === salonId) {
          setCurrentSalon(null);
        }
        
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Erro ao deletar do Supabase.' };
      }
    } catch (err: any) {
      console.error('Erro ao deletar salão:', err);
      return { success: false, error: err.message || 'Erro de conexão com o servidor.' };
    }
  };

// AUTHENTICATION LOGIC
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LOGIN DEBUG] ========== INÍCIO DO LOGIN ==========');
    console.log('[LOGIN DEBUG] 1. CNPJ digitado (mascarado):', loginCNPJ ? loginCNPJ.replace(/\d/g, 'X') : 'VAZIO');
    console.log('[LOGIN DEBUG] 2. CNPJ normalizado:', loginCNPJ ? loginCNPJ.replace(/\D/g, '') : 'VAZIO');
    console.log('[LOGIN DEBUG] 3. Lista de TODOS os salões carregados:', salons.map(s => ({ id: s.id, name: s.name, cnpj: s.cnpj, isActive: s.isActive })));
    console.log('[LOGIN DEBUG] loginType:', loginType, '| loginAdminPhone (mascarado):', loginAdminPhone ? loginAdminPhone.replace(/\d/g, 'X') : 'VAZIO');
    setLoginError(null);
    if (checkLoginLock()) {
      console.log('[LOGIN DEBUG] BLOQUEADO por rate limit');
      return;
    }

    // 1. Try Salon Admin Login with CNPJ, Admin Phone and Password
    if (loginType === 'ADMIN') {
      const cleanCNPJ = loginCNPJ.replace(/\D/g, '');
      const foundSalon = salons.find(s => s.cnpj.replace(/\D/g, '') === cleanCNPJ);
      console.log('[LOGIN DEBUG] 4. Salão encontrado pelo find():', foundSalon ? { id: foundSalon.id, name: foundSalon.name, cnpj: foundSalon.cnpj, isActive: foundSalon.isActive, hasPassword: !!foundSalon.password } : 'NÃO ENCONTRADO');
      
      if (!foundSalon) {
        registerLoginFailure();
        setLoginError('Salão com o CNPJ informado não foi encontrado.');
        console.log('[LOGIN DEBUG] 10. MOTIVO DA FALHA: Salão não encontrado para CNPJ normalizado:', cleanCNPJ);
        return;
      }

      if (foundSalon.isActive === false) {
        setLoginError('Este salão está inativo. Entre em contato com o administrador do SaaS.');
        console.log('[LOGIN DEBUG] 10. MOTIVO DA FALHA: Salão inativo (isActive === false)');
        return;
      }

      // Search for an administrator in the professionals list of this salon
      const allProfs = loadProfessionals();
      const salonProfs = allProfs.filter(p => p.salonId === foundSalon.id);
      const cleanAdminPhone = loginAdminPhone.replace(/\D/g, '');
      console.log('[LOGIN DEBUG] 6. Telefone digitado (mascarado):', loginAdminPhone ? loginAdminPhone.replace(/\d/g, 'X') : 'VAZIO');
      console.log('[LOGIN DEBUG] 7. Telefone normalizado:', cleanAdminPhone);
      console.log('[LOGIN DEBUG] 5. Lista de TODOS os administradores carregados para este salão:', salonProfs.filter(p => p.role === 'administrador').map(a => ({ id: a.id, salonId: a.salonId, phone: a.phone, role: a.role, isActive: a.isActive })));
      
      const activeAdmins = salonProfs.filter(p => p.role === 'administrador' && p.isActive !== false);
      console.log('[LOGIN DEBUG] Admins ativos no salão (count):', activeAdmins.length);

      let loggedAdmin: Professional | null = null;
      const existingProfWithPhone = salonProfs.find(p => p.phone.replace(/\D/g, '') === cleanAdminPhone);
      console.log('[LOGIN DEBUG] 8. Administrador encontrado por telefone:', existingProfWithPhone ? { id: existingProfWithPhone.id, name: existingProfWithPhone.name, phone: existingProfWithPhone.phone, role: existingProfWithPhone.role, isActive: existingProfWithPhone.isActive, hasPassword: !!existingProfWithPhone.password } : 'NÃO ENCONTRADO');

      if (existingProfWithPhone) {
        if (existingProfWithPhone.role !== 'administrador') {
          setLoginError('Este colaborador está cadastrado como profissional. Por favor, use a aba "Profissional Colaborador" para acessar.');
          console.log('[LOGIN DEBUG] 10. MOTIVO DA FALHA: Telefone pertence a profissional (role !== administrador)');
          return;
        }
        if (existingProfWithPhone.isActive === false) {
          setLoginError('Este administrador está inativo.');
          console.log('[LOGIN DEBUG] 10. MOTIVO DA FALHA: Administrador inativo (isActive === false)');
          return;
        }
        const passwordMatch = existingProfWithPhone.password === loginPassword;
        console.log('[LOGIN DEBUG] 9. Comparação de senha do admin:', passwordMatch ? 'COINCIDIU' : 'NÃO COINCIDIU');
        if (!passwordMatch) {
          registerLoginFailure();
          setLoginError('Senha incorreta para este administrador.');
          console.log('[LOGIN DEBUG] 10. MOTIVO DA FALHA: Senha do administrador não confere');
          return;
        }
        loggedAdmin = existingProfWithPhone;
        console.log('[LOGIN DEBUG] Admin autenticado via profissional cadastrado', { adminId: loggedAdmin.id, adminName: loggedAdmin.name });
      } else {
        const salonPasswordMatch = foundSalon.password === loginPassword;
        console.log('[LOGIN DEBUG] 9. Comparação de senha do salão (fallback):', salonPasswordMatch ? 'COINCIDIU' : 'NÃO COINCIDIU');
        if (salonPasswordMatch) {
          const defaultAdmin: Professional = {
            id: 'admin_sys_' + Math.random().toString(36).substr(2, 9),
            salonId: foundSalon.id,
            name: 'Administrador Principal',
            phone: formatPhone(loginAdminPhone) || foundSalon.phone || '(11) 99999-9999',
            password: loginPassword,
            commissionRate: 0,
            isActive: true,
            category: 'Outros',
            role: 'administrador'
          };
          const updated = [...allProfs, defaultAdmin];
          saveProfessionals(updated);
          loggedAdmin = defaultAdmin;
          console.log('[LOGIN DEBUG] Admin autenticado via senha do salão (fallback), admin criado', { adminId: loggedAdmin.id });
        } else {
          registerLoginFailure();
          setLoginError('Administrador não localizado ou senha primária do salão incorreta.');
          console.log('[LOGIN DEBUG] 10. MOTIVO DA FALHA: Admin não encontrado por telefone E senha do salão incorreta', { salonHasPassword: !!foundSalon.password });
          return;
        }
      }

      if (loggedAdmin) {
        setCurrentSalon(foundSalon);
        setUserRole('ADMIN');
        setCurrentProfessional(loggedAdmin);

        // Persist session
        localStorage.setItem('auth_userRole', 'ADMIN');
        localStorage.setItem('auth_currentSalonId', foundSalon.id);
        localStorage.setItem('auth_currentProfessionalId', loggedAdmin.id);
        localStorage.setItem('auth_lastRoute', 'dashboard');
        console.log('[LOGIN DEBUG] 11. Gravando no localStorage:', { auth_userRole: 'ADMIN', auth_currentSalonId: foundSalon.id, auth_currentProfessionalId: loggedAdmin.id, auth_lastRoute: 'dashboard' });

        // Load specific tenant sandbox arrays
        setProfessionals(loadProfessionals(foundSalon.id));
        setServices(loadServices(foundSalon.id));
        setProducts(loadProducts(foundSalon.id));
        setClients(loadClients(foundSalon.id));
        setComandas(loadComandas(foundSalon.id));
        setFinancials(loadFinancials(foundSalon.id));
        setAppointments(loadAppointments(foundSalon.id));
        setCharts(loadCharts(foundSalon.id));
        setServiceCategories(loadServiceCategories(foundSalon.id));
        setCardAcquirers(loadCardAcquirers(foundSalon.id));
        
        setActiveTab('dashboard');
        registerLoginSuccess();
        console.log('[LOGIN DEBUG] 12. REDIRECIONAMENTO: Login ADMIN concluído com sucesso, redirecionando para dashboard');
        return;
      } else {
        registerLoginFailure();
        setLoginError('Administrador colaborador não cadastrado, inativo ou senha inválida.');
        console.log('[LOGIN DEBUG] 10. MOTIVO DA FALHA: loggedAdmin é null (inesperado)');
        return;
      }
    }

    // 2. Try Professional Login with Telephone/Phone and Password
    if (loginType === 'PROFESSIONAL') {
      const cleanPhone = loginPhone.replace(/\D/g, '');
      console.log('[LOGIN DEBUG] ========== LOGIN PROFISSIONAL ==========');
      console.log('[LOGIN DEBUG] 1. Telefone digitado (mascarado):', loginPhone ? loginPhone.replace(/\d/g, 'X') : 'VAZIO');
      console.log('[LOGIN DEBUG] 2. Telefone normalizado:', cleanPhone);
      console.log('[LOGIN DEBUG] 3. Lista de TODOS os profissionais carregados:', loadProfessionals().map(p => ({ id: p.id, salonId: p.salonId, name: p.name, phone: p.phone, role: p.role, isActive: p.isActive, hasPassword: !!p.password })));
      
      const foundProf = loadProfessionals().find(p => {
        const pClean = p.phone.replace(/\D/g, '');
        const matchPhone = pClean === cleanPhone;
        const matchPassword = p.password === loginPassword;
        return matchPhone && matchPassword && p.role !== 'administrador' && p.isActive !== false;
      });
      console.log('[LOGIN DEBUG] 4. Profissional encontrado:', foundProf ? { id: foundProf.id, name: foundProf.name, phone: foundProf.phone, role: foundProf.role, isActive: foundProf.isActive, salonId: foundProf.salonId } : 'NÃO ENCONTRADO');
      
      if (foundProf) {
        // Find associated salon
        const matchSalon = salons.find(s => s.id === foundProf.salonId);
        console.log('[LOGIN DEBUG] 5. Salão do profissional:', matchSalon ? { id: matchSalon.id, name: matchSalon.name, cnpj: matchSalon.cnpj, isActive: matchSalon.isActive } : 'NÃO ENCONTRADO');
        if (matchSalon) {
          setCurrentSalon(matchSalon);
        }
        setCurrentProfessional(foundProf);
        setUserRole('PROFESSIONAL');

        // Persist session
        localStorage.setItem('auth_userRole', 'PROFESSIONAL');
        if (matchSalon) localStorage.setItem('auth_currentSalonId', matchSalon.id);
        localStorage.setItem('auth_currentProfessionalId', foundProf.id);
        localStorage.setItem('auth_lastRoute', 'dashboard');
        console.log('[LOGIN DEBUG] 6. Gravando no localStorage:', { auth_userRole: 'PROFESSIONAL', auth_currentSalonId: matchSalon?.id, auth_currentProfessionalId: foundProf.id, auth_lastRoute: 'dashboard' });
        
        // Load comanda history for professional stats comparison
        setComandas(loadComandas(matchSalon?.id));
        registerLoginSuccess();
        console.log('[LOGIN DEBUG] 7. REDIRECIONAMENTO: Login PROFESSIONAL concluído com sucesso, redirecionando para dashboard');
        return;
      } else {
        registerLoginFailure();
        setLoginError('Colaborador Profissional não encontrado, inativo ou senha inválida.');
        console.log('[LOGIN DEBUG] MOTIVO DA FALHA: Profissional não encontrado (telefone/senha/role/isActive)');
        return;
      }
    }

    registerLoginFailure();
    setLoginError('Credenciais inválidas ou senha incorreta para este salão.');
    console.log('[LOGIN DEBUG] Falha final: tipo de login não reconhecido ou credenciais inválidas', { loginType });
  };

  // Admin Direct quick demo shortcut filler
  const handleQuickFill = (type: 'éclat_admin' | 'paula_prof') => {
    if (type === 'éclat_admin') {
      setLoginCNPJ('12.345.678/0001-90');
      setLoginAdminPhone('(11) 98888-7777');
      setLoginPhone('');
      setLoginPassword('1234');
      setLoginType('ADMIN');
    } else {
      setLoginCNPJ('');
      setLoginAdminPhone('');
      setLoginPhone('(11) 98111-1111'); // Julianna Ricci (Senior)'s phone
      setLoginPassword('1234');
      setLoginType('PROFESSIONAL');
    }
    setLoginError(null);
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentSalon(null);
    setCurrentProfessional(null);
    setLoginError(null);
    setLoginLock({ count: 0, lockUntil: null });
    setActiveTab('dashboard');
    setLoginCNPJ('');
    setLoginAdminPhone('');
    setLoginPhone('');
    setLoginPassword('');
    // Clear persisted session
    localStorage.removeItem('auth_userRole');
    localStorage.removeItem('auth_currentSalonId');
    localStorage.removeItem('auth_currentProfessionalId');
    localStorage.removeItem('auth_lastRoute');
  };

  // App version for support reference
  const APP_VERSION = 'v1.1.3 (08/07/2026)';

  const handleClearCacheAndReload = async () => {
    if (!window.confirm('Tem certeza que deseja limpar o cache do sistema?\n\nIsso irá recarregar a aplicação com a versão mais recente. Sua sessão será mantida.')) return;

    // Preserve auth keys before clearing
    const authKeys = ['auth_userRole', 'auth_currentSalonId', 'auth_currentProfessionalId', 'auth_lastRoute'];
    const savedAuth: Record<string, string> = {};
    for (const key of authKeys) {
      const val = localStorage.getItem(key);
      if (val) savedAuth[key] = val;
    }

    // Clear service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }

    // Clear cache storage
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }

    // Clear session storage
    sessionStorage.clear();

    // Clear localStorage except auth keys
    localStorage.clear();

    // Restore auth keys so session survives reload
    for (const [key, val] of Object.entries(savedAuth)) {
      localStorage.setItem(key, val);
    }

    console.log('[Cache Clear] Cache limpo com sucesso. Sessão preservada.');
    window.location.reload();
  };

  const handleSaaSLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (checkLoginLock()) return;

    try {
      const res = await fetch("/api/admin/validate-master-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: saasEmail, password: saasPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserRole('SAAS_ADMIN');
        setSalons(loadSalons());
        setProfessionals(loadProfessionals());

        // Persist session
        localStorage.setItem('auth_userRole', 'SAAS_ADMIN');
        localStorage.removeItem('auth_currentSalonId');
        localStorage.removeItem('auth_currentProfessionalId');
        localStorage.setItem('auth_lastRoute', 'dashboard');

        registerLoginSuccess();
        return;
      }
    } catch {
      /* fallback */
    }

    registerLoginFailure();
    setLoginError('Credenciais Master SaaS incorretas. Acesso restrito e auditado.');
  };

  // MAIN LOGIN VIEW RENDER
  if (userRole === null) {
    return (
      <div className="min-h-screen bg-[#FCF9F2] flex flex-col justify-between items-center px-4 py-8 font-sans relative">
        
        {/* Sleek Floating Key for SaaS Owner Admin */}
        <div className="w-full max-w-4xl flex justify-end px-4">
          {isSaaSLogin ? (
            <button
              onClick={() => {
                setIsSaaSLogin(false);
                setLoginError(null);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-[#a0854c] rounded-lg text-[10px] uppercase font-black tracking-widest text-[#FCF9F2] transition-all shadow-md cursor-pointer z-15"
            >
              ← Painel Clientes
            </button>
          ) : (
            <button
              onClick={() => {
                setIsSaaSLogin(true);
                setLoginError(null);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-[#a0854c] rounded-lg text-[10px] uppercase font-black tracking-widest text-[#FCF9F2] transition-all shadow-md cursor-pointer z-15"
            >
              <ShieldAlert className="w-4 h-4 text-[#e5b35f]" />
              <span>Painel Franqueador Master</span>
            </button>
          )}
        </div>

        {/* Brand visual header */}
        <div className="text-center space-y-1 mt-4">
          <GestaoModelloLogo className="w-24 h-24 mx-auto" />
          <h1 className="text-3xl font-serif font-black tracking-tight text-gray-950">Gestão Modello</h1>
          <p className="text-xs text-stone-500 uppercase tracking-widest font-bold">
            {isSaaSLogin ? 'Portal de Licenciamento & Sandboxes' : 'Plataforma SaaS Multi-Salões de Beleza'}
          </p>
        </div>

        {/* Login Body Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gold-200/40 p-8 space-y-6 mt-4">
          {isSaaSLogin ? (
            /* SECURE MASTER SAAS LOGIN FORM */
            <>
              <div className="text-center">
                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-stone-900 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase scale-95">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#a0854c]" />
                  Conexão SaaS Master Habilitada
                </span>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight font-serif mt-2.5">Portal de Controle Comercial</h2>
                <p className="text-xs text-gray-400 mt-1">Conecte com credenciais criptografadas do licenciador.</p>
              </div>

              <form onSubmit={handleSaaSLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-250 text-rose-700 text-xs rounded-lg font-bold flex items-center gap-2">
                    <span>⚠️ {loginError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-stone-400 font-bold text-[10px] uppercase tracking-wider">E-mail Administrativo</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-[#FCF9F2] rounded-lg border border-gray-200 focus:border-gold-500 focus:outline-none text-xs text-stone-900 font-bold"
                    placeholder="E-mail administrativo"
                    value={saasEmail}
                    onChange={(e) => setSaasEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-stone-400 font-bold text-[10px] uppercase tracking-wider">Código de Acesso Seguro (Senha)</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-[#FCF9F2] rounded-lg border border-gray-200 focus:border-gold-500 focus:outline-none text-xs font-mono font-bold text-stone-950"
                    placeholder="••••••••••••••"
                    value={saasPassword}
                    onChange={(e) => setSaasPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-stone-950 hover:bg-[#a0854c] text-white font-serif font-black tracking-widest py-3.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer text-xs uppercase"
                >
                  Entrar no Painel Master
                </button>
              </form>

              <div className="pt-4 border-t border-gray-100/60 text-center">
                <span className="text-[10px] text-stone-400 font-medium">
                  Nota: Use as chaves de teste demonstradas acima para auditar as sandboxes.
                </span>
              </div>
            </>
          ) : (
            /* REGULAR CLIENT LOGIN FORM */
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight font-serif">Acesse seu Ambiente</h2>
                <p className="text-xs text-gray-400 mt-1">Insira os credenciais corporativas ou do profissional síncrono.</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Input Selection tabs */}
                <div className="flex gap-2 p-1 bg-[#FCF9F2] rounded-lg border border-gold-100">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginType('ADMIN');
                    }}
                    className={`flex-1 py-2 rounded-md font-sans text-xs font-bold text-center transition-all cursor-pointer ${
                      loginType === 'ADMIN' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                    }`}
                  >
                    Painel Administrativo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginType('PROFESSIONAL');
                    }}
                    className={`flex-1 py-2 rounded-md font-sans text-xs font-bold text-center transition-all cursor-pointer ${
                      loginType === 'PROFESSIONAL' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                    }`}
                  >
                    Espaço Profissional
                  </button>
                </div>

                {/* ERROR DISPATCH */}
                {loginError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-bold flex items-center gap-2">
                    <span>⚠️ {loginError}</span>
                  </div>
                )}

                {/* FOR ADMINISTRATOR */}
                {loginType === 'ADMIN' ? (
                  <>
                    <div className="space-y-1">
                      <label className="block text-stone-400 font-bold text-[10px] uppercase tracking-wider">CNPJ da Empresa</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          required
                          className="w-full pl-9 pr-4 py-3 bg-[#FCF9F2] rounded-lg border border-gray-200 focus:border-gold-500 focus:outline-none text-xs text-gray-900 font-bold"
                          placeholder="ex: 12.345.678/0001-90"
                          value={loginCNPJ}
                          onChange={(e) => setLoginCNPJ(formatCNPJ(e.target.value))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-stone-400 font-bold text-[10px] uppercase tracking-wider">Telefone do Administrador Colaborador</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          required
                          className="w-full pl-9 pr-4 py-3 bg-[#FCF9F2] rounded-lg border border-gray-200 focus:border-gold-500 focus:outline-none text-xs text-gray-900 font-bold"
                          placeholder="ex: (11) 98888-7777"
                          value={loginAdminPhone}
                          onChange={(e) => setLoginAdminPhone(formatPhone(e.target.value))}
                        />
                      </div>
                      <span className="text-[9px] text-amber-600 block leading-tight font-medium mt-0.5">
                        ⚠️ O telefone deve corresponder a um colaborador cadastrado com cargo de "Administrador".
                      </span>
                    </div>
                  </>
                ) : (
                  // Phone Field for Professional
                  <div className="space-y-1">
                    <label className="block text-stone-400 font-bold text-[10px] uppercase tracking-wider">Telefone do Profissional</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        required
                        className="w-full pl-9 pr-4 py-3 bg-[#FCF9F2] rounded-lg border border-gray-200 focus:border-gold-500 focus:outline-none text-xs text-gray-900"
                        placeholder="ex: (11) 98111-1111"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(formatPhone(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                {/* Password input */}
                <div className="space-y-1">
                  <label className="block text-stone-400 font-bold text-[10px] uppercase tracking-wider">Senha Secreta</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="password"
                      required
                      className="w-full pl-9 pr-4 py-3 bg-[#FCF9F2] rounded-lg border border-gray-200 focus:border-gold-500 focus:outline-none text-xs font-mono font-bold"
                      placeholder="••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* Submit checkout buttons */}
                <button
                  type="submit"
                  className="w-full bg-black hover:bg-[#a0854c] text-white font-serif font-black tracking-wide py-3.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer text-xs"
                >
                  Autenticar Acesso Seguro
                </button>
              </form>


            </>
          )}
        </div>

        {/* Help & Support section */}
        <div className="w-full max-w-md space-y-3 mt-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5 space-y-4">
            <h3 className="text-[10px] uppercase font-black tracking-widest text-stone-400 text-center">
              Ajuda
            </h3>

            <button
              onClick={handleClearCacheAndReload}
              className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Atualizar Sistema</span>
            </button>

            <a
              href="https://wa.me/5581999982848?text=Ol%C3%A1!%0A%0AEstou%20precisando%20de%20ajuda%20com%20o%20Gest%C3%A3o%20Modello.%0A%0AMeu%20sal%C3%A3o%20%C3%A9%3A"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Falar com o Suporte</span>
            </a>

            <p className="text-[9px] text-stone-400 text-center font-mono">
              Versão: {APP_VERSION}
            </p>
          </div>
        </div>

        {/* Footer info lock down */}
        <div className="text-center text-[10px] text-stone-400 w-full max-w-sm mt-4">
          <p>© 2026 Gestão Modello SaaS Enterprise • Multi-Tenancy Isolado • Banco Local Ativo & Síncrono</p>
        </div>

      </div>
    );
  }

  // RENDER PROFESSIONAL DESKTOP PORTAL DIRECT IF LOGGED IN
  if (userRole === 'PROFESSIONAL' && currentProfessional) {
    return (
      <ProfessionalDashboard
        professional={currentProfessional}
        comandas={comandas}
        salon={currentSalon}
        onLogout={handleLogout}
      />
    );
  }

  // RENDER SAAS CENTRAL MANAGER DASHBOARD PORTAL IF LOGGED IN
  if (userRole === 'SAAS_ADMIN') {
    return (
      <SaaSManagerDashboard
        salons={salons}
        allProfessionals={professionals}
        onAddSalon={(newSalon) => {
          const updated = [...salons, newSalon];
          setSalons(updated);
          saveSalons(updated);
          setTimeout(() => {
            performAutoSync(true);
          }, 200);
        }}
        onUpdateSalon={(updatedSalon) => {
          const updated = salons.map(s => s.id === updatedSalon.id ? updatedSalon : s);
          setSalons(updated);
          saveSalons(updated);
          if (currentSalon?.id === updatedSalon.id) {
            setCurrentSalon(updatedSalon);
          }
          setTimeout(() => {
            performAutoSync(true);
          }, 200);
        }}
        onLogout={handleLogout}
        onClearSalonData={handleClearSalonData}
        triggerUpdateAllProfessionals={(updatedProfs) => {
          setProfessionals(updatedProfs);
          saveProfessionals(updatedProfs);
        }}
        onRecalculateCommissions={(salonId: string) => {
          const res = recalculateAllCommissions(salonId);
          // Force reload active comandas state
          setComandas(loadComandas());
          return res;
        }}
        onDeleteSalon={handleDeleteSalonFull}
      />
    );
  }

  // ADMINISTRATIVE CONSOLE WORKSPACE FOR SALON OWNER
  return (
    <div className="min-h-screen md:h-screen overflow-hidden bg-[#FCF9F2] flex flex-col md:flex-row font-sans relative">

      {/* MOBILE STICKY HEADER TO AVOID EMPATHETIC CLUTTER AND SCROLL NOISE */}
      <header className="sticky top-0 left-0 right-0 h-16 bg-black text-white flex items-center justify-between px-5 z-40 md:hidden border-b border-zinc-800 shrink-0 print:hidden">
        <div className="flex items-center gap-2">
          <GestaoModelloLogo className="w-8 h-8 shrink-0" variant="dark" />
          <div className="leading-tight">
            <h1 className="font-serif font-bold text-stone-200 text-xs tracking-tight line-clamp-1">{currentSalon?.name}</h1>
            <span className="text-[8px] uppercase text-[#e5b35f] font-black tracking-widest">Admin</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 border border-zinc-800 hover:border-zinc-500 rounded-lg text-stone-300 hover:text-white transition focus:outline-none cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* MOBILE BACKDROP DRAWER EFFECT */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fade-in print:hidden"
        />
      )}

      {/* RESPONSIVE DRAWER SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-black text-white p-6 flex flex-col shrink-0 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky md:top-0 overflow-y-auto print:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Corporate logo section */}
          <div className="flex items-center justify-between pb-6 border-b border-zinc-800 mb-8 font-sans">
            <div className="flex items-center gap-3">
              <GestaoModelloLogo className="w-10 h-10 shrink-0" variant="dark" />
              <div>
                <h1 className="font-serif font-bold text-stone-200 tracking-tight leading-none text-sm">{currentSalon?.name}</h1>
                {currentSalon?.id.startsWith('trial_') ? (
                  <span className="bg-amber-500/10 text-[#e5b35f] text-[8px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider block mt-1 w-fit">
                    ⚡ SaaS Trial: 7 dias de Teste
                  </span>
                ) : (
                  <span className="text-[9px] text-stone-400 uppercase tracking-widest font-black block mt-1">Console Admin</span>
                )}
              </div>
            </div>
            {/* Close button on Mobile inside Aside */}
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-stone-400 hover:text-white p-1 cursor-pointer"
              title="Fechar Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab buttons with ordered sidebar */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
              { id: 'agendamentos', label: 'Agendamentos', icon: Calendar },
              { id: 'comandas', label: 'Comanda', icon: FileText },
              { id: 'financeiro', label: 'Financeiro', icon: Wallet },
              { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
              { id: 'colecoes', label: 'Cadastro', icon: Scissors },
              { id: 'configuracoes', label: 'Config Salão', icon: Settings }
            ].map(item => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isTabBlocked(item.id)) return;
                    setActiveTab(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold font-sans transition-all ${
                    isTabBlocked(item.id)
                      ? 'text-stone-600 cursor-not-allowed opacity-50'
                      : 'cursor-pointer ' + (activeTab === item.id 
                        ? 'bg-[#e5b35f] text-black font-extrabold shadow-sm' 
                        : 'text-stone-400 hover:text-white hover:bg-zinc-900')
                  }`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom account controls bar */}
        <div className="pt-6 border-t border-stone-850 mt-8 space-y-4">
          <div className="text-[11px] text-stone-500 font-medium">
            <p className="text-white font-bold truncate">{currentSalon?.name}</p>
            <p className="text-[9px] font-mono tracking-sans mt-0.5">{currentSalon?.cnpj}</p>
          </div>

          <button
            onClick={() => {
              handleLogout();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 border border-zinc-800 hover:border-rose-400 text-stone-400 hover:text-rose-500 bg-transparent text-xs py-2.5 rounded-full transition-all cursor-pointer font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTAINER SCROLL CONTEXT */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 max-w-[1200px] mx-auto w-full print:p-0 print:m-0 print:max-w-none relative">
        
        {/* Tenant Subscription Banner */}
        {currentSalon && (() => {
          if (userRole === "SAAS_ADMIN") return null;

          const { status, daysRemaining } = getTenantStatus(currentSalon.expirationDate);

          if (status === "EXPIRED") {
            const { isGracePeriod, daysOverdue } = getTenantStatus(currentSalon.expirationDate);
            if (isGracePeriod) {
              return (
                <div className="mb-6 bg-rose-50 border-2 border-rose-600 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-rose-900 leading-normal animate-fade-in shadow-sm font-sans">
                  <div className="flex gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-rose-950 font-extrabold text-sm">Período de carência — sistema em modo somente leitura.</strong>
                      <p className="text-xs text-rose-800 leading-relaxed max-w-2xl mt-0.5">
                        Sua assinatura venceu em <strong>{formatDateBR(currentSalon.expirationDate)}</strong> ({daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'} atrás). Você tem <strong>{GRACE_PERIOD_DAYS - daysOverdue}</strong> {GRACE_PERIOD_DAYS - daysOverdue === 1 ? 'dia' : 'dias'} restantes de carência para renovar. Durante este período, você pode visualizar relatórios e imprimir, mas não pode cadastrar, editar ou excluir informações.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLaunchStripeCheckout}
                    disabled={isProcessingPayment}
                    className="w-full md:w-auto shrink-0 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    {isProcessingPayment ? (
                      <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Processando...</span></>
                    ) : (
                      <><CreditCard className="w-4 h-4 text-stone-100" /><span>Renovar Assinatura</span></>
                    )}
                  </button>
                </div>
              );
            }
            return (
              <div className="mb-6 bg-red-50 border-2 border-red-700 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-red-900 leading-normal animate-fade-in shadow-sm font-sans">
                <div className="flex gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-red-950 font-extrabold text-sm">Assinatura bloqueada — período de carência expirado.</strong>
                    <p className="text-xs text-red-800 leading-relaxed max-w-2xl mt-0.5">
                      Sua assinatura expirou em <strong>{formatDateBR(currentSalon.expirationDate)}</strong> ({daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'} atrás) e o período de carência de {GRACE_PERIOD_DAYS} dias já se encerrou. Renove agora para voltar a utilizar o sistema.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLaunchStripeCheckout}
                  disabled={isProcessingPayment}
                  className="w-full md:w-auto shrink-0 bg-red-700 hover:bg-red-800 disabled:bg-red-300 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  {isProcessingPayment ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Processando...</span></>
                  ) : (
                    <><CreditCard className="w-4 h-4 text-stone-100" /><span>Renovar Assinatura</span></>
                  )}
                </button>
              </div>
            );
          }

          if (status === "EXPIRING_SOON") {
            return (
              <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-amber-900 leading-normal animate-fade-in shadow-xs font-sans">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-950 font-extrabold text-sm">Sua assinatura vence em {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}. Renove para evitar bloqueios.</strong>
                    <p className="text-xs text-amber-800 leading-relaxed max-w-2xl mt-0.5">
                      Vencimento em {formatDateBR(currentSalon.expirationDate)}. Renove agora para manter o sistema ativo.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLaunchStripeCheckout}
                  disabled={isProcessingPayment}
                  className="w-full md:w-auto shrink-0 bg-zinc-900 hover:bg-black disabled:bg-zinc-400 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  {isProcessingPayment ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Processando...</span></>
                  ) : (
                    <><CreditCard className="w-4 h-4 text-stone-200" /><span>Renovar Assinatura</span></>
                  )}
                </button>
              </div>
            );
          }

          return null;
        })()}

        {/* Restricted Mode Edit Blocks Intercept Modal */}
        {restrictedActionName && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 border-2 border-rose-600 shadow-2xl scale-in space-y-4 font-sans text-center animate-fade-in">
              <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto border-2 border-rose-250 shadow-2xs">
                <ShieldAlert className="w-7 h-7 text-rose-600 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-rose-950 leading-none">Acesso Bloqueado: Operação Restrita</h3>
                <p className="text-xs text-rose-800 leading-relaxed px-2 mt-2">
                  Você tentou executar a operação <strong>"{restrictedActionName}"</strong>, que está provisoriamente suspensa. O salão <strong>{currentSalon?.name}</strong> está sob regime de <strong>Modo Restrito (Somente Leitura)</strong> devido ao término do ciclo comercial.
                </p>
              </div>
              <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/75 text-left text-[10.5px] leading-relaxed text-rose-900">
                {currentSalon && (() => {
                  const { isGracePeriod, daysOverdue } = getTenantStatus(currentSalon.expirationDate);
                  if (isGracePeriod) {
                    const planMsg = currentSalon?.planValue ? `R$ ${currentSalon.planValue.toFixed(2).replace('.', ',')}` : 'R$ 120,00';
                    return `Sua assinatura venceu há ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'}. O sistema está em carência de ${GRACE_PERIOD_DAYS} dias em modo somente leitura. Para voltar a lançar comandas, cadastrar atendimentos, computar comissões e realizar baixas financeiras normais, faça a renovação da sua assinatura mensal de ${planMsg}.`;
                  }
                  return `Sua assinatura expirou há ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'} e o período de carência já se encerrou. Renove agora para voltar a utilizar o sistema.`;
                })()}
              </div>
              <div className="flex flex-col gap-2 pt-1.5">
                <button
                  onClick={async () => {
                    if (isProcessingPayment) return;
                    setRestrictedActionName(null);
                    await handleLaunchStripeCheckout();
                  }}
                  disabled={isProcessingPayment}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                >
                  {isProcessingPayment ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Processando...</span></>
                  ) : (
                    <><CreditCard className="w-4 h-4 text-stone-100" /><span>Renovar Assinatura (R$ {((currentSalon?.planValue ?? 120)).toFixed(2).replace('.', ',')})</span></>
                  )}
                </button>
                <button
                  onClick={() => setRestrictedActionName(null)}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-850 font-bold text-xs py-2.5 rounded-lg transition cursor-pointer"
                >
                  {currentSalon && (() => {
                    const { isGracePeriod } = getTenantStatus(currentSalon.expirationDate);
                    return isGracePeriod ? "Continuar Apenas Visualizando Relatórios" : "Sair";
                  })()}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PIX QR Code Modal */}
        <ModalPagamentoPix
          open={showPixModal}
          pixData={pixData}
          onClose={() => {
            setShowPixModal(false);
            setPixData(null);
          }}
          onPaymentConfirmed={() => {
            const list = loadSalons();
            const updated = list.map((s) => {
              if (s.id === currentSalon?.id) {
                const base = new Date();
                base.setDate(base.getDate() + 30);
                const yyyy = base.getFullYear();
                const mm = String(base.getMonth() + 1).padStart(2, '0');
                const dd = String(base.getDate()).padStart(2, '0');
                return { ...s, expirationDate: `${yyyy}-${mm}-${dd}`, isActive: true };
              }
              return s;
            });
            triggerUpdateSalons(updated);
            const updatedSalon = updated.find((s) => s.id === currentSalon?.id);
            if (updatedSalon) setCurrentSalon(updatedSalon);
            // Força sincronização imediata com Supabase para persistir a extensão local
            performAutoSync(true);
            setShowPixModal(false);
            setPixData(null);
            setShowStripeSuccessModal(true);
          }}
        />

        {/* Cascade Delete Confirmation Modal */}
        <ModalConfirmCascadeDelete
          open={!!cascadeDeleteTarget}
          comandaId={cascadeDeleteTarget}
          onConfirm={executeCascadeDelete}
          onClose={() => setCascadeDeleteTarget(null)}
        />

        {/* Modal de Sucesso - Pagamento PIX Confirmado */}
        {showStripeSuccessModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in animate-scale-in">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-emerald-350 shadow-2xl text-center space-y-4 font-sans">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-2xs">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-emerald-950 leading-none">Assinatura Renovada com Sucesso!</h3>
                <p className="text-xs text-emerald-850 leading-relaxed px-2 mt-2">
                  Parabéns! O faturamento mensal de <strong>R$ {((currentSalon?.planValue ?? 120)).toFixed(2).replace('.', ',')}</strong> foi detectado e processado com absoluto sucesso.
                </p>
              </div>
              <div className="bg-[#e6f4ea] text-[#137333] border border-[#ceead6] p-3.5 rounded-lg text-xs leading-relaxed text-left space-y-1 font-sans">
                <div className="flex justify-between font-bold"><span>Licença Atualizada:</span> <span className="font-mono text-stone-900">{currentSalon?.expirationDate ? formatDateBR(currentSalon.expirationDate) : 'Ativo'}</span></div>
                <div className="flex justify-between font-bold mt-0.5"><span>Situação da Licença:</span> <span className="text-[#137333]">Regularizado & Liberado!</span></div>
              </div>
              <button
                onClick={() => {
                  setShowStripeSuccessModal(false);
                  setDismissedWarning(false);
                }}
                className="w-full bg-zinc-950 hover:bg-black text-white font-bold text-xs py-2.5 rounded-lg shadow-sm transition cursor-pointer font-sans"
              >
                Acessar Painel Central do Salão
              </button>
            </div>
          </div>
        )}
        
        {/* RENDER DYNAMIC ACTIVE TAB */}
        {activeTab === 'dashboard' && currentSalon && (
          <DashboardAdmin
            salonId={currentSalon.id}
            comandas={comandas}
            financials={financials}
            professionals={professionals}
            appointments={appointments}
            onNavigateToTab={(tab) => {
              if (!isTabBlocked(tab)) setActiveTab(tab as any);
            }}
            commissionAccrualRule={currentSalon.commissionAccrualRule ?? 'caixa'}
          />
        )}

        {activeTab === 'comandas' && currentSalon && !isTabBlocked('comandas') && (
          <ComandasKanban
            salonId={currentSalon.id}
            salonName={currentSalon.name}
            comandas={comandas}
            clients={clients}
            professionals={professionals}
            services={services}
            products={products}
            serviceCategories={serviceCategories}
            cardAcquirers={cardAcquirers}
            onAddComanda={handleAddComandaObj}
            onUpdateComandaObj={handleUpdateComandaObj}
            onUpdateStatus={handleUpdateComandaStatus}
            onDeleteComanda={handleDeleteComandaObj}
            currentSalon={currentSalon}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === 'agendamentos' && currentSalon && !isTabBlocked('agendamentos') && (
          <AgendamentosList
            salonId={currentSalon.id}
            appointments={appointments}
            clients={clients}
            professionals={professionals}
            services={services}
            onAddAppointment={handleAddAppointmentObj}
            onUpdateAppointment={handleUpdateAppointmentObj}
            onConvertAppointmentToComanda={handleConvertAppToComandaObj}
            onDeleteAppointment={handleDeleteAppointmentObj}
            onUpdateClients={triggerUpdateClients}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === 'financeiro' && currentSalon && !isTabBlocked('financeiro') && (
          <FinanceiroDashboard
            salonId={currentSalon.id}
            financials={financials}
            comandas={comandas}
            charts={charts}
            professionals={professionals}
            onAddFinancialRecord={handleAddFinancialRecordObj}
            onUpdateFinancialRecord={handleUpdateFinancialRecordObj}
            onDeleteFinancialRecord={handleDeleteFinancialRecordObj}
            onSettleDebt={handleSettleDebtObj}
            onUpdateComandaObj={handleUpdateComandaObj}
            isReadOnly={isReadOnly}
            commissionAccrualRule={currentSalon.commissionAccrualRule ?? 'caixa'}
          />
        )}

        {activeTab === 'relatorios' && currentSalon && !isTabBlocked('relatorios') && (
          <RelatoriosDashboard
            salonId={currentSalon.id}
            financials={financials}
            comandas={comandas}
            professionals={professionals}
          />
        )}

        {activeTab === 'colecoes' && currentSalon && !isTabBlocked('colecoes') && (
          <ColecoesCrud
            salonId={currentSalon.id}
            maxProfessionals={currentSalon.maxProfessionals || 5}
            maxAdmins={currentSalon.maxAdmins || 2}
            professionals={professionals}
            services={services}
            products={products}
            clients={clients}
            serviceCategories={serviceCategories}
            cardAcquirers={cardAcquirers}
            onUpdateProfessionals={triggerUpdateProfessionals}
            onUpdateServices={triggerUpdateServices}
            onUpdateProducts={triggerUpdateProducts}
            onUpdateClients={triggerUpdateClients}
            onUpdateServiceCategories={triggerUpdateServiceCategories}
            onUpdateCardAcquirers={triggerUpdateCardAcquirers}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === 'configuracoes' && (
          <ConfiguracoesTenancy
            salons={salons}
            charts={charts}
            serviceCategories={serviceCategories}
            onAddSalon={handleAddNewSalonObj}
            onUpdateSalon={handleUpdateSalonObj}
            onAddChartGroup={handleAddNewChartGroupObj}
            onUpdateServiceCategories={triggerUpdateServiceCategories}
            userRole={userRole}
            currentSalon={currentSalon}
            onClearSalonData={handleClearSalonData}
            daysRemaining={getSubscriptionDaysRemaining()}
            isRestricted={isRestrictedModeActive()}
            onLaunchStripeCheckout={handleLaunchStripeCheckout}
            onSyncSuccess={(latestTenants) => {
              const mergedTenants = latestTenants.map((serverSalon: any) => {
                const localSalon = salons.find(s => s.id === serverSalon.id);
                if (localSalon) {
                  return {
                    ...serverSalon,
                  };
                }
                return serverSalon;
              });
              triggerUpdateSalons(mergedTenants);
              if (currentSalon) {
                const updatedCurrent = mergedTenants.find(s => s.id === currentSalon.id);
                if (updatedCurrent) {
                  setCurrentSalon(updatedCurrent);
                }
              }
            }}
          />
        )}

      </main>

      <AlertModal
        open={!!alertState}
        message={alertState?.message || ''}
        variant={alertState?.variant || 'error'}
        onClose={() => setAlertState(null)}
      />
    </div>
  );
}
