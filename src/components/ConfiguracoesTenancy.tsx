import React, { useState } from 'react';
import { Salon, ChartAccountGroup, ServiceCategory, PixKeyType } from '../types';
import { ShieldAlert, Building, HelpCircle, Key, Plus, FileText, Check, AlertCircle, Trash2, Edit, Settings, CreditCard, CheckSquare, Database, RefreshCw, Code } from 'lucide-react';
import {
  loadSalons,
  loadProfessionals,
  loadServices,
  loadProducts,
  loadClients,
  loadComandas,
  loadFinancials,
  loadAppointments
} from '../dataStore';
import { formatCNPJ, formatPhone } from '../utils';
import { fetchTenantPixConfig, saveTenantPixConfig } from '../utils/pix/tenantPixConfig';
import AlertModal from './AlertModal';

interface ConfiguracoesTenancyProps {
  salons: Salon[];
  charts: ChartAccountGroup[];
  serviceCategories: ServiceCategory[];
  onAddSalon: (salon: Salon) => void;
  onUpdateSalon?: (salon: Salon) => void;
  onAddChartGroup: (group: ChartAccountGroup) => void;
  onUpdateServiceCategories: (categories: ServiceCategory[]) => void;
  userRole?: 'ADMIN' | 'PROFESSIONAL' | 'SAAS_ADMIN' | null;
  currentSalon?: Salon | null;
  onClearSalonData?: (salonId: string) => void;
  daysRemaining?: number;
  isRestricted?: boolean;
  onLaunchStripeCheckout?: () => void;
  onSyncSuccess?: (latestTenants: any[]) => void;
}

export default function ConfiguracoesTenancy({
  salons,
  charts,
  serviceCategories,
  onAddSalon,
  onUpdateSalon,
  onAddChartGroup,
  onUpdateServiceCategories,
  userRole,
  currentSalon,
  onClearSalonData,
  daysRemaining,
  isRestricted,
  onLaunchStripeCheckout,
  onSyncSuccess
}: ConfiguracoesTenancyProps) {
  // States
  const [salonName, setSalonName] = useState('');
  const [salonPhone, setSalonPhone] = useState('');
  const [salonCNPJ, setSalonCNPJ] = useState('');
  const [salonPass, setSalonPass] = useState('1234');
  const [salonAddress, setSalonAddress] = useState('');
  const [salonMaxProfs, setSalonMaxProfs] = useState('5');

  const [chartName, setChartName] = useState('');
  const [chartType, setChartType] = useState<'receita' | 'despesa'>('despesa');

  // Service Category CRUD states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [catDeleteConfirmId, setCatDeleteConfirmId] = useState<string | null>(null);

  // Safe developer sandbox reset states (iframe resilient)
  const [showLocalResetConfirm, setShowLocalResetConfirm] = useState(false);
  const [localResetSuccess, setLocalResetSuccess] = useState(false);
  const [alertState, setAlertState] = useState<{message: string; variant?: 'info' | 'success' | 'error'} | null>(null);

  // Local PIX form state — lido e gravado EXCLUSIVAMENTE via
  // /api/tenant-pix-config. Não há leitura de `currentSalon.pixKeyType`
  // (esse campo foi removido do modelo Salon) nem uso de onUpdateSalon
  // para PIX.
  const [localPixKeyType, setLocalPixKeyType] = useState<PixKeyType | ''>('');
  const [localPixKey, setLocalPixKey] = useState<string>('');
  const [pixLoading, setPixLoading] = useState(false);
  const [pixSaving, setPixSaving] = useState(false);

  // Carrega a config PIX uma vez ao montar (sem polling).
  React.useEffect(() => {
    if (!currentSalon?.id) return;
    let cancelled = false;
    setPixLoading(true);
    fetchTenantPixConfig(currentSalon.id)
      .then(cfg => {
        if (cancelled) return;
        setLocalPixKeyType(cfg?.pix_key_type || '');
        setLocalPixKey(cfg?.pix_key || '');
      })
      .catch(err => {
        if (cancelled) return;
        setAlertState({ message: 'Erro ao carregar configuração de PIX: ' + (err?.message || err), variant: 'error' });
      })
      .finally(() => { if (!cancelled) setPixLoading(false); });
    return () => { cancelled = true; };
  }, [currentSalon?.id]);

  const resolvedPixKey = localPixKey || '';

  const pixKeyTypeLabels: Record<string, string> = {
    telefone: 'Telefone',
    cnpj: 'CNPJ',
    email: 'E-mail',
    aleatoria: 'Chave Aleatória',
  };

  // Supabase Backup and Real-time syncing states
  const [syncStatus, setSyncStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    results?: any;
    errors?: any;
    isMock?: boolean;
  } | null>(null);

  const handleSupaSync = async () => {
    setSyncStatus({ loading: true });
    try {
      const payload = {
        isSaaSAdmin: userRole === 'SAAS_ADMIN',
        tenants: loadSalons(),
        professionals: loadProfessionals(),
        services: loadServices(),
        products: loadProducts(),
        clients: loadClients(),
        // comandas não são mais enviadas por supa-sync — usam REST API própria
        financials: loadFinancials(),
        appointments: loadAppointments()
      };

      const response = await fetch("/api/supa-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      setSyncStatus({
        loading: false,
        success: data.success,
        message: data.message,
        results: data.results,
        errors: data.errors,
        isMock: data.isMock
      });

      // Se o servidor retornou dados reais e atualizados diretos do Supabase, propagamos para o estado pai
      // Fazemos isso independente de data.success para garantir que atualizações corporativas de limites e endereços não fiquem presas por erros em outras tabelas
      if (data.tenants && Array.isArray(data.tenants) && onSyncSuccess) {
        onSyncSuccess(data.tenants);
      }
    } catch (err: any) {
      setSyncStatus({
        loading: false,
        success: false,
        message: "Ocorreu uma falha na conexão com o servidor de banco de dados: " + err.message
      });
    }
  };

  const handleRegisterCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const targetSalonId = currentSalon?.id || salons[0]?.id || 'salon_1';

    const exists = serviceCategories.some(sc => sc.name.toLowerCase() === newCategoryName.trim().toLowerCase() && sc.salonId === targetSalonId);
    if (exists) {
      setAlertState({message: "Já existe uma categoria de serviço com este nome.", variant: 'error'});
      return;
    }

    const newSC: ServiceCategory = {
      id: 'sc_' + Math.random().toString(36).substr(2, 9),
      salonId: targetSalonId,
      name: newCategoryName.trim()
    };

    onUpdateServiceCategories([...serviceCategories, newSC]);
    setNewCategoryName('');
    setAlertState({message: `Categoria de Serviço "${newSC.name}" adicionada com sucesso.`, variant: 'success'});
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (catDeleteConfirmId !== id) {
      setCatDeleteConfirmId(id);
      return;
    }
    const updated = serviceCategories.filter(sc => sc.id !== id);
    onUpdateServiceCategories(updated);
    setCatDeleteConfirmId(null);
    setAlertState({message: `Categoria de Serviço "${name}" excluída.`, variant: 'success'});
  };

  const handleSaveEditCategory = (id: string) => {
    if (!editCategoryName.trim()) return;

    const targetSalonId = currentSalon?.id || salons[0]?.id || 'salon_1';

    const exists = serviceCategories.some(sc => sc.name.toLowerCase() === editCategoryName.trim().toLowerCase() && sc.id !== id && sc.salonId === targetSalonId);
    if (exists) {
      setAlertState({message: "Já existe outra categoria de serviço com este nome.", variant: 'error'});
      return;
    }

    const updated = serviceCategories.map(sc => {
      if (sc.id === id) {
        return { ...sc, name: editCategoryName.trim() };
      }
      return sc;
    });

    onUpdateServiceCategories(updated);
    setEditingCategoryId(null);
    setEditCategoryName('');
  };

  const handleRegisterSalon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonName || !salonCNPJ) {
      setAlertState({message: "Nome e CNPJ da empresa são requeridos.", variant: 'error'});
      return;
    }

    const newSalon: Salon = {
      id: 'salon_' + Math.random().toString(36).substr(2, 9),
      name: salonName,
      cnpj: salonCNPJ,
      phone: salonPhone || '(11) 99999-9999',
      address: salonAddress || 'Endereço Corporativo Demo',
      password: salonPass,
      city: 'São Paulo',
      maxProfessionals: parseInt(salonMaxProfs) || 5
    };

    onAddSalon(newSalon);
    setSalonName('');
    setSalonCNPJ('');
    setSalonPhone('');
    setSalonAddress('');
    setSalonMaxProfs('5');
    setAlertState({message: `Empresa / Salão de Beleza "${newSalon.name}" cadastrada com sucesso com limite de ${newSalon.maxProfessionals} profissionais ativos.`, variant: 'success'});
  };

  const handleRegisterChart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chartName) return;

    const newCH: ChartAccountGroup = {
      id: 'ch_' + Math.random().toString(36).substr(2, 9),
      salonId: currentSalon?.id || salons[0]?.id || 'salon_1',
      name: chartName,
      type: chartType
    };

    onAddChartGroup(newCH);
    setChartName('');
    setAlertState({message: `Plano de contas "${newCH.name}" adicionado.`, variant: 'success'});
  };

  return (
    <div className="space-y-8 font-sans text-xs text-stone-700">
      
      {/* Informative Security and Tenancy Setup Banner */}
      <div className="bg-neutral-950 text-white p-6 rounded-xl border border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-serif font-bold text-gold-300 uppercase tracking-widest flex items-center gap-2">
            <Building className="w-4 h-4 text-gold-400" />
            <span>{userRole === 'SAAS_ADMIN' ? 'Multi-Tenant Enterprise Config' : 'Configurações de Acesso e Sandbox'}</span>
          </h3>
          <p className="text-[11px] text-stone-400 max-w-2xl font-sans">
            {userRole === 'SAAS_ADMIN' 
              ? 'Cada salão cadastrado opera em sandbox criptográfico exclusivo. Profissionais de um salão não possuem acesso cruzado aos caixas de outras filiais ou comissão corporativa.'
              : 'Seu salão opera em conexão de segurança de inquilino isolado (multi-tenant) síncrono. Seus faturamentos, comissionamentos e de seus colaboradores são mecanicamente privados.'}
          </p>
        </div>
        <div className="flex bg-neutral-900 border border-stone-800 p-2 text-[10px] rounded-lg tracking-wider text-stone-500 font-mono">
          STATUS: SEGUIDO / ISOLADO
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: CONDITIONAL DEPENDING ON USER ROLE */}
        {userRole === 'SAAS_ADMIN' ? (
          /* SaaS Master Admin sees enrollment and all tenants */
          <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h4 className="font-serif font-bold text-gray-900 text-sm">Registrar Novo Salão de Beleza (Franquia / Cliente)</h4>
              <p className="text-[11px] text-stone-400 mt-0.5">Cadastre uma nova empresa com CNPJ para habilitar login síncronos individuais.</p>
            </div>

            <form onSubmit={handleRegisterSalon} className="space-y-4">
              <div>
                <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider">Razão Social / Nome do Salão</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#FCF9F2] p-2.5 rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none"
                  placeholder="ex: Modello SPA Premium"
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider">CNPJ da Empresa</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#FCF9F2] p-2.5 rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-mono text-xs font-bold"
                    placeholder="ex: 12.345.678/0001-90"
                    value={salonCNPJ}
                    onChange={(e) => setSalonCNPJ(formatCNPJ(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider">Telefone Comercial</label>
                  <input
                    type="text"
                    className="w-full bg-[#FCF9F2] p-2.5 rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-mono text-xs font-bold"
                    placeholder="ex: (11) 98888-8888"
                    value={salonPhone}
                    onChange={(e) => setSalonPhone(formatPhone(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider">Endereço</label>
                  <input
                    type="text"
                    className="w-full bg-[#FCF9F2] p-2.5 rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none"
                    placeholder="ex: Av. Paulista, 1000 - SP"
                    value={salonAddress}
                    onChange={(e) => setSalonAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider">Limite Profissionais Ativos</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full bg-[#FCF9F2] p-2.5 rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-mono font-bold"
                    value={salonMaxProfs}
                    onChange={(e) => setSalonMaxProfs(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider">Senha mestre Admin do Salão</label>
                <input
                  type="password"
                  required
                  className="w-full bg-[#FCF9F2] p-2.5 rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-mono"
                  value={salonPass}
                  onChange={(e) => setSalonPass(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black hover:bg-gold-500 text-white font-bold py-3.5 px-4 rounded-full transition-all cursor-pointer"
              >
                Criar Nova Sandbox de Salão de Beleza
              </button>
            </form>

            {/* List existing corporate salons */}
            <div className="border-t border-gray-100 pt-5">
              <h5 className="font-bold text-gray-900 mb-3">Salões Ativos no Servidor ({salons.length})</h5>
              <div className="space-y-2">
                {salons.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-3 bg-[#FCF9F2] rounded-lg border border-stone-150 flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-stone-900">{s.name}</p>
                      <p className="text-[10px] text-stone-400 font-mono">CNPJ: {s.cnpj} • Tel: {s.phone}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-500 font-bold text-[10px]">Profs:</span>
                        <input
                          type="number"
                          min="1"
                          className="w-12 bg-white p-1 text-center rounded border border-gray-300 font-bold text-gray-900 font-mono text-xs"
                          value={s.maxProfessionals || 5}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            if (onUpdateSalon) {
                              onUpdateSalon({ ...s, maxProfessionals: val });
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-500 font-bold text-[10px]">Admins:</span>
                        <input
                          type="number"
                          min="1"
                          className="w-12 bg-white p-1 text-center rounded border border-gray-300 font-bold text-gray-900 font-mono text-xs"
                          value={s.maxAdmins || 2}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            if (onUpdateSalon) {
                              onUpdateSalon({ ...s, maxAdmins: val });
                            }
                          }}
                        />
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                        Ativo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Client/Salon owner sees isolated license metrics and current details of their own contract */
          <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h4 className="font-serif font-bold text-gray-900 text-sm">Status do Licenciamento Modello</h4>
              <p className="text-[11px] text-stone-400 mt-0.5 font-sans">Ver detalhes da licença ativa desta sandbox exclusiva.</p>
            </div>

            <div className="space-y-5 font-sans">
              
              {/* License Status Header Widget */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-amber-600/10 border border-amber-200/60 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase font-black tracking-widest text-[#a0854c] font-sans">Contrato Ativo</span>
                  <span className="bg-emerald-100 border border-emerald-250 text-emerald-800 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    ONLINE • PROTEGIDO
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-serif font-bold text-stone-900">{currentSalon?.name || "Ambiente Cliente"}</h3>
                  <p className="text-[10px] text-stone-450 font-mono">CNPJ: {currentSalon?.cnpj || "Isolado"}</p>
                  <p className="text-[10px] text-stone-450 font-sans">Contato: {currentSalon?.phone || "Não especificado"}</p>
                </div>
              </div>

              {/* License Core Indicators Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-center space-y-1">
                  <span className="text-stone-400 text-[9px] uppercase font-bold tracking-wider block">Limite Profissionais</span>
                  <div className="text-xl font-black text-stone-900 font-mono leading-none py-1">
                    {currentSalon?.maxProfessionals || 5}
                  </div>
                  <span className="text-[9px] text-zinc-500 block leading-tight font-sans">Colaboradores ativos</span>
                </div>

                <div className="p-3 bg-zinc-900 text-stone-100 rounded-xl border border-zinc-950 text-center space-y-1">
                  <span className="text-stone-400 text-[9px] uppercase font-bold tracking-wider block">Vencimento da Licença</span>
                  <div className="text-xs font-black text-[#e5b35f] font-mono leading-none py-2">
                    {currentSalon?.expirationDate ? currentSalon.expirationDate.split('-').reverse().join('/') : '30 Dias - Sandbox'}
                  </div>
                  <span className="text-[9px] text-stone-400 block leading-tight font-sans">Instalação renovada</span>
                </div>
              </div>

              {/* Security Advisory Badge */}
              <div className="bg-[#FAF8F5] border border-stone-200 p-3 rounded-lg flex gap-3 text-stone-550 leading-relaxed text-[10px]">
                <AlertCircle className="w-4 h-4 text-[#a0854c] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-stone-900 mb-0.5 font-sans">Isolamento de Base Ativa</strong>
                  <p className="text-[9px] text-stone-500 leading-normal font-sans">
                    Você está operando sob uma licença restrita de inquilino. Todas as sessões financeiras e de equipe estão criptografadas e restritas para terceiros. Para ajustar seu plano de cobrança ou limites, contate o administrador SaaS master no painel central.
                  </p>
                </div>
              </div>

              {/* Global Salon Config for Fees and split rules */}
              {currentSalon && (
                <div className="pt-4 border-t border-stone-200 space-y-4">
                  
                  {/* Stripe Subscription & Billing Management Widget */}
                  <div className="border-b border-stone-100 pb-2">
                    <h5 className="font-bold text-stone-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#a0854c]" />
                      <span>Gerenciamento de Assinatura & Faturamento SaaS</span>
                    </h5>
                    <p className="text-[9.5px] text-stone-400">Gerencie e acompanhe a regularidade da sua licença de uso do software.</p>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-stone-250 shadow-2xs space-y-3.5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-sans">
                      <div>
                        <span className="text-[9px] uppercase font-black text-stone-400 tracking-wider">Plano Atual</span>
                        <h4 className="text-sm font-black text-stone-900 leading-tight">Modello Enterprise Mensal</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {isRestricted ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-250 text-[9.5px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full inline-block animate-ping"></span>
                            Modo Restrito (Bloqueado)
                          </span>
                        ) : daysRemaining !== undefined && daysRemaining <= 0 ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[9.5px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                            Atrasado / Pendente
                          </span>
                        ) : daysRemaining !== undefined && daysRemaining <= 3 ? (
                          <span className="bg-amber-100 text-[#b06000] border border-[#fde293] text-[9.5px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 font-sans">
                            Vence em Breve
                          </span>
                        ) : (
                          <span className="bg-[#e6f4ea] text-[#137333] border border-[#ceead6] text-[9.5px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5" />
                            Assinatura Regular
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-stone-750 border-t border-stone-100 text-[10.5px] font-sans">
                      <div>
                        <span className="text-stone-400 text-[8.5px] uppercase font-bold block">Valor do Plano</span>
                        <strong className="text-stone-900">R$ 120,00 <span className="text-[9px] font-normal text-stone-500">/mês</span></strong>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[8.5px] uppercase font-bold block">Próximo Vencimento</span>
                        <strong className="text-stone-900">
                          {currentSalon.expirationDate ? currentSalon.expirationDate.split('-').reverse().join('/') : '30 Dias - Sandbox'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[8.5px] uppercase font-bold block">Dias Restantes</span>
                        <strong className={isRestricted ? "text-rose-600 font-extrabold" : "text-stone-900"}>
                          {daysRemaining !== undefined ? (daysRemaining < 0 ? `${Math.abs(daysRemaining)} dias atrasados` : `${daysRemaining} dias`) : 'N/A'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[8.5px] uppercase font-bold block">Situação da Conta</span>
                        <strong className="text-stone-950 font-bold block truncate">
                          {isRestricted ? "Bloqueada (Modo Estrito)" : daysRemaining !== undefined && daysRemaining <= 0 ? "Fatura em Aberto" : "Ativa e Liberada"}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-2 font-sans">
                      <button
                        onClick={onLaunchStripeCheckout}
                        className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold text-white transition shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                          isRestricted 
                            ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800' 
                            : 'bg-zinc-950 hover:bg-zinc-800'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 text-stone-100" />
                        <span>Renovar Assinatura (R$ 120,00)</span>
                      </button>
                      <p className="text-[8.5px] text-stone-400 mt-1.5 leading-relaxed font-sans">
                        Ao clicar, você iniciará uma sessão de pagamento seguro online. Pagamento efetuado antes do vencimento soma +1 mês na data limite. Pagamentos atrasados liberam o sistema com vencimento para 30 dias subsequentes.
                      </p>
                    </div>
                  </div>

                  {/* Supabase Database Sync Module */}
                  <div className="border-b border-stone-100 pb-2 pt-2">
                    <h5 className="font-bold text-stone-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5 font-sans">
                      <Database className="w-3.5 h-3.5 text-blue-600" />
                      <span>Sincronização & Persistência Supabase Cloud</span>
                    </h5>
                    <p className="text-[9.5px] text-stone-400 font-sans">Envie dados locais salvos em cache ou configure seu banco de dados PostgreSQL na nuvem.</p>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-stone-250 shadow-2xs space-y-3 font-sans">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <span className="text-[9px] uppercase font-black text-stone-400 tracking-wider">Status da Sincronização</span>
                        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5 leading-tight">
                          <span className={`w-2 h-2 rounded-full inline-block ${syncStatus === null ? 'bg-amber-500' : syncStatus.success ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {syncStatus === null ? "Pronto para Sincronizar" : syncStatus.loading ? "Processando Backup..." : syncStatus.success ? "Sincronizado com o Banco" : "Pendência Detectada"}
                        </h4>
                      </div>
                      <button
                        onClick={handleSupaSync}
                        disabled={syncStatus?.loading || isRestricted}
                        title={isRestricted ? "Plano expirado. Renove para voltar a realizar alterações." : undefined}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncStatus?.loading ? 'animate-spin' : ''}`} />
                        <span>{syncStatus?.loading ? "Enviando..." : "Sincronizar Agora"}</span>
                      </button>
                    </div>

                    {syncStatus && !syncStatus.loading && (
                      <div className={`p-3 rounded-lg text-xs leading-relaxed space-y-1 ${syncStatus.success ? 'bg-emerald-50 text-emerald-950 border border-emerald-200' : 'bg-orange-50 text-orange-950 border border-orange-200'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <span className="text-sm">⚡</span> {syncStatus.message}
                        </div>
                        {syncStatus.results && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-[10px] bg-white/40 p-2 rounded border border-current/10 font-mono">
                            <div>Salões: <strong>{syncStatus.results.tenants || 0}</strong></div>
                            <div>Membros: <strong>{syncStatus.results.professionals || 0}</strong></div>
                            <div>Serviços: <strong>{syncStatus.results.services || 0}</strong></div>
                            <div>Clientes: <strong>{syncStatus.results.clients || 0}</strong></div>
                            <div>Produtos: <strong>{syncStatus.results.products || 0}</strong></div>
                            <div>Comandas: <strong>{syncStatus.results.comandas || 0}</strong></div>
                            <div>Movimentos: <strong>{syncStatus.results.financials || 0}</strong></div>
                            <div>Agendas: <strong>{syncStatus.results.appointments || 0}</strong></div>
                          </div>
                        )}
                        {syncStatus.errors && (
                          <div className="text-[10px] text-rose-700 bg-rose-105 border border-rose-200/60 p-3 rounded-xl mt-3 space-y-2">
                            <span className="font-bold block text-rose-950 border-b border-rose-200/40 pb-1.5 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Tabelas não encontradas ou erros na estrutura:</span>
                            </span>
                            
                            <div className="space-y-1">
                              {Object.entries(syncStatus.errors).map(([key, value]) => (
                                <div key={key} className="bg-rose-50 p-1.5 rounded border border-rose-100/50 leading-relaxed">
                                  Tabela <code className="font-bold font-mono text-stone-900 bg-rose-100/60 px-1 rounded">{key}</code>: {String(value)}
                                </div>
                              ))}
                            </div>

                            <div className="mt-2.5 space-y-1 bg-amber-50 rounded-lg p-3 text-amber-950 border border-amber-200/80">
                              <span className="font-bold text-[10.5px] block text-amber-900">🛠️ Script de Correção do Banco (SQL)</span>
                              <p className="leading-relaxed text-[9.5px] text-amber-850">
                                Se você configurou um Supabase existente e adicionou um tenant, mude a estrutura do seu banco inserindo as novas colunas. Copie o script SQL abaixo, acesse o <strong>SQL Editor</strong> do painel do seu Supabase, cole e clique em <strong>Run</strong>:
                              </p>
                              
                              <textarea
                                readOnly
                                className="w-full h-32 bg-stone-900 text-stone-200 p-2 rounded-md font-mono text-[9px] mt-1.5 border border-stone-800 focus:outline-none"
                                value={`-- CORREÇÃO DA TABELA TENANTS COM NOVOS CAMPOS DE LICENÇA, ENDEREÇO E SENHA
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bairro text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS complemento text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_professionals integer DEFAULT 10;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_admins integer DEFAULT 3;`}
                                onClick={(e) => {
                                  (e.target as HTMLTextAreaElement).select();
                                  navigator.clipboard.writeText((e.target as HTMLTextAreaElement).value);
                                  setAlertState({message: "Script SQL copiado para a área de transferência!", variant: 'info'});
                                }}
                              />
                              <span className="text-[8.5px] text-amber-800 block mt-1 text-right">💡 Clique dentro do box acima para copiar automaticamente o SQL</span>
                            </div>
                          </div>
                        )}
                        {syncStatus.isMock && (
                          <div className="text-[10.5px] text-amber-950 bg-amber-50/70 p-2 rounded-lg border border-amber-200 mt-2 font-sans space-y-1">
                            <strong className="block text-amber-950">ℹ️ Nota do Desenvolvedor:</strong>
                            <p className="leading-relaxed text-amber-900">
                              O sistema guardou todos os seus dados locais com segurança em localStorage. Para sincronizá-los com uma conta real do Supabase:
                            </p>
                            <ol className="list-decimal pl-4 space-y-0.5 text-[10px] text-stone-700 font-sans">
                              <li>Abra o menu de Configurações no canto superior do painel AI Studio.</li>
                              <li>Adicione as chaves <code className="bg-stone-100 px-1 rounded text-[9.5px] font-mono">SUPABASE_URL</code> e <code className="bg-stone-100 px-1 rounded text-[9.5px] font-mono">SUPABASE_SERVICE_ROLE_KEY</code> ao arquivo de variáveis.</li>
                              <li>Clique em <strong>Sincronizar dados</strong> para fazer a carga dos dados instantaneamente.</li>
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Company Name and Logo customization section */}
                  <div className="border-b border-stone-100 pb-2">
                    <h5 className="font-bold text-stone-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5 flex-sans">
                      <Building className="w-3.5 h-3.5 text-[#a0854c]" />
                      <span>Nome da Empresa e Logotipo</span>
                    </h5>
                    <p className="text-[9.5px] text-stone-400 flex-sans">Personalize o logotipo e o nome comercial exibido nos cabeçalhos.</p>
                  </div>

                  <div className="space-y-3.5 p-3.5 bg-[#FAF8F5] rounded-xl border border-stone-250 shadow-2xs">
                    <div>
                      <label className="block text-stone-750 font-extrabold text-[9.5px] uppercase mb-1 tracking-wider">
                        Nome Comercial da Empresa
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-stone-250 p-2 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:border-stone-400 text-stone-900"
                        value={currentSalon.name}
                        onChange={(e) => {
                          if (onUpdateSalon) {
                            onUpdateSalon({
                              ...currentSalon,
                              name: e.target.value
                            });
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-stone-750 font-extrabold text-[9.5px] uppercase mb-1 tracking-wider">
                        URL do Logotipo do Cliente / Salão
                      </label>
                      <input
                        type="text"
                        placeholder="ex: https://site.com/logo.png"
                        className="w-full bg-white border border-stone-250 p-2 py-1.5 rounded-lg text-[10.5px] focus:outline-none focus:border-stone-400 font-mono text-stone-900"
                        value={currentSalon.logoUrl || ''}
                        onChange={(e) => {
                          if (onUpdateSalon) {
                            onUpdateSalon({
                              ...currentSalon,
                              logoUrl: e.target.value
                            });
                          }
                        }}
                      />
                      <p className="text-[9px] text-stone-450 mt-1">Insira um link de imagem do logotipo da sua empresa (arquivos .png ou .jpeg).</p>
                    </div>
                  </div>

                  <div className="border-b border-stone-100 pb-2 pt-2">
                    <h5 className="font-bold text-stone-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-[#a0854c]" />
                      <span>Regras de Negócio do Salão (Geral)</span>
                    </h5>
                    <p className="text-[9.5px] text-stone-400">Automatize as regras financeiras padrões para todas as comandas.</p>
                  </div>

                  <div className="space-y-3.5 p-3.5 bg-[#FAF8F5] rounded-xl border border-stone-205/70 shadow-2xs">
                    <div>
                      <label className="block text-stone-750 font-extrabold text-[9.5px] uppercase mb-1 tracking-wider">
                        Repasse da Taxa de Cartão p/ Comissão
                      </label>
                      <p className="text-[9.5px] text-stone-500 leading-relaxed mb-3">
                        Escolha o padrão geral de como as taxas de transação das operadoras de cartão de débito/crédito devem ser descontadas da comissão paga aos profissionais.
                      </p>
                      
                      <select
                        className="w-full bg-white border border-stone-250 p-2.5 rounded-lg text-[10.5px] font-bold focus:outline-none focus:border-stone-400 cursor-pointer"
                        value={currentSalon.cardFeePercentProfDeduct !== undefined ? currentSalon.cardFeePercentProfDeduct : 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (onUpdateSalon) {
                            onUpdateSalon({
                              ...currentSalon,
                              cardFeePercentProfDeduct: val
                            });
                          }
                        }}
                      >
                        <option value={0}>0% — Salão absorve 100% da taxa (Não repassar aos colaboradores)</option>
                        <option value={50}>50% — Dividir meio a meio (50% Profissional / 50% Salão)</option>
                        <option value={100}>100% — Repassar taxa completa de cartão para o profissional</option>
                      </select>
                    </div>

                    <div className="text-[9.5px] text-stone-300 bg-stone-900 p-3 rounded-lg font-mono flex items-center gap-1.5 leading-snug">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span>
                        Automático Ativo: Rateio de taxa fixado em <strong className="text-[#eed093]">{currentSalon.cardFeePercentProfDeduct !== undefined ? currentSalon.cardFeePercentProfDeduct : 0}%</strong> de desconto na comissão profissional.
                      </span>
                    </div>
                  </div>

                  {/* PIX Configuration */}
                  <div className="border-b border-stone-100 pb-2 pt-6">
                    <h5 className="font-bold text-stone-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#a0854c]" />
                      <span>PIX</span>
                    </h5>
                    <p className="text-[9.5px] text-stone-400">Configure a chave PIX para recebimento automático nas comandas.</p>
                  </div>

                  <div className="space-y-3.5 p-3.5 bg-[#FAF8F5] rounded-xl border border-stone-205/70 shadow-2xs">
                    <div>
                      <label className="block text-stone-750 font-extrabold text-[9.5px] uppercase mb-1 tracking-wider">
                        Tipo da Chave PIX
                      </label>
                      <select
                        className="w-full bg-white border border-stone-250 p-2.5 rounded-lg text-[10.5px] font-bold focus:outline-none focus:border-stone-400 cursor-pointer"
                        value={localPixKeyType}
                        onChange={(e) => setLocalPixKeyType(e.target.value as PixKeyType | '')}
                        disabled={pixLoading || pixSaving}
                      >
                        <option value="">Selecione o tipo de chave</option>
                        <option value="telefone">Telefone</option>
                        <option value="cnpj">CNPJ</option>
                        <option value="email">E-mail</option>
                        <option value="aleatoria">Chave Aleatória</option>
                      </select>
                    </div>

                    {localPixKeyType === 'telefone' && (
                      <div>
                        <label className="block text-stone-750 font-extrabold text-[9.5px] uppercase mb-1 tracking-wider">
                          Chave PIX Telefone
                        </label>
                        <input
                          type="text"
                          className="w-full bg-white border border-stone-250 p-2.5 rounded-lg text-[10.5px] font-bold focus:outline-none focus:border-stone-400"
                          placeholder="(11) 98888-7777"
                          value={localPixKey}
                          onChange={(e) => setLocalPixKey(e.target.value)}
                          disabled={pixLoading || pixSaving}
                        />
                      </div>
                    )}

                    {localPixKeyType === 'cnpj' && (
                      <div>
                        <label className="block text-stone-750 font-extrabold text-[9.5px] uppercase mb-1 tracking-wider">
                          Chave PIX CNPJ
                        </label>
                        <input
                          type="text"
                          className="w-full bg-white border border-stone-250 p-2.5 rounded-lg text-[10.5px] font-bold focus:outline-none focus:border-stone-400"
                          placeholder="00.000.000/0001-00"
                          value={localPixKey}
                          onChange={(e) => setLocalPixKey(e.target.value)}
                          disabled={pixLoading || pixSaving}
                        />
                      </div>
                    )}

                    {localPixKeyType === 'email' && (
                      <div>
                        <label className="block text-stone-750 font-extrabold text-[9.5px] uppercase mb-1 tracking-wider">
                          Chave PIX E-mail
                        </label>
                        <input
                          type="email"
                          className="w-full bg-white border border-stone-250 p-2.5 rounded-lg text-[10.5px] font-bold focus:outline-none focus:border-stone-400"
                          placeholder="financeiro@empresa.com.br"
                          value={localPixKey}
                          onChange={(e) => setLocalPixKey(e.target.value)}
                          disabled={pixLoading || pixSaving}
                        />
                      </div>
                    )}

                    {localPixKeyType === 'aleatoria' && (
                      <div>
                        <label className="block text-stone-750 font-extrabold text-[9.5px] uppercase mb-1 tracking-wider">
                          Chave Aleatória
                        </label>
                        <input
                          type="text"
                          className="w-full bg-white border border-stone-250 p-2.5 rounded-lg text-[10.5px] font-bold focus:outline-none focus:border-stone-400"
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          value={localPixKey}
                          onChange={(e) => setLocalPixKey(e.target.value)}
                          disabled={pixLoading || pixSaving}
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        if (!currentSalon?.id) return;
                        if (!localPixKeyType) {
                          setAlertState({ message: 'Selecione o tipo da chave PIX.', variant: 'error' });
                          return;
                        }
                        if (!localPixKey.trim()) {
                          setAlertState({ message: 'Informe a chave PIX.', variant: 'error' });
                          return;
                        }
                        setPixSaving(true);
                        try {
                          const cfg = await saveTenantPixConfig({
                            tenant_id: currentSalon.id,
                            pix_key_type: localPixKeyType as PixKeyType,
                            pix_key: localPixKey.trim(),
                          });
                          setAlertState({
                            message: `Configuração de PIX salva com sucesso (${cfg.pix_key_type}).`,
                            variant: 'success',
                          });
                        } catch (err: any) {
                          setAlertState({ message: 'Erro ao salvar PIX: ' + (err?.message || String(err)), variant: 'error' });
                        } finally {
                          setPixSaving(false);
                        }
                      }}
                      disabled={pixLoading || pixSaving || !localPixKeyType || !localPixKey.trim() || isRestricted}
                      title={isRestricted ? "Plano expirado. Renove para voltar a realizar alterações." : undefined}
                      className="w-full mt-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-stone-300 disabled:to-stone-300 disabled:cursor-not-allowed text-white font-extrabold text-[10.5px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                    >
                      {pixSaving ? 'Salvando...' : 'Salvar Configuração PIX'}
                    </button>

                    {localPixKeyType && (
                      <div className="text-[9.5px] text-stone-300 bg-stone-900 p-3 rounded-lg font-mono flex items-center gap-1.5 leading-snug">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${resolvedPixKey ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                        <span>
                          {resolvedPixKey ? (
                            <>PIX Configurado: <strong className="text-[#eed093]">{pixKeyTypeLabels[localPixKeyType] || localPixKeyType}: {resolvedPixKey}</strong></>
                          ) : (
                            <>PIX incompleto — preencha a chave do tipo selecionado</>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Right column stacked panels */}
        <div className="space-y-8 w-full">

          {/* Custom Plan Chart of accounts */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h4 className="font-serif font-bold text-gray-900 text-sm">Plano de Contas Customizado (Finanças)</h4>
              <p className="text-[11px] text-stone-400 mt-0.5">DRE e Balanços de Caixa utilizam categorias do plano de contas para consolidar lucros operacionais.</p>
            </div>

            <form onSubmit={handleRegisterChart} className="space-y-4">
              <div>
                <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider">Nome da Categoria Financeira</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#FCF9F2] p-2.5 rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none"
                  placeholder="ex: Conta de Água Copasa"
                  value={chartName}
                  onChange={(e) => setChartName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider">Tipo do Lançamento</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setChartType('despesa')}
                    className={`flex-1 py-2.5 rounded-lg border font-bold text-center transition-all ${
                      chartType === 'despesa' 
                        ? 'bg-rose-50 text-rose-700 border-rose-300' 
                        : 'bg-white text-stone-500 border-stone-200 font-normal'
                    }`}
                  >
                    Saída / Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('receita')}
                    className={`flex-1 py-2.5 rounded-lg border font-bold text-center transition-all ${
                      chartType === 'receita' 
                        ? 'bg-green-50 text-green-700 border-green-300' 
                        : 'bg-white text-stone-500 border-stone-200 font-normal'
                    }`}
                  >
                    Entrada / Receita
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-black hover:bg-gold-500 text-white font-bold py-3.5 px-4 rounded-full transition-all cursor-pointer"
              >
                Adicionar ao Plano de Contas
              </button>
            </form>

            {/* List existing charts */}
            <div className="border-t border-gray-100 pt-5">
              <h5 className="font-bold text-gray-900 mb-3 font-sans">Categorias Disponíveis</h5>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {charts.map(c => (
                  <div key={c.id} className="p-2.5 bg-stone-50 rounded-lg border border-stone-150 flex justify-between items-center">
                    <span className="font-medium text-stone-800">{c.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.type === 'receita' ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>
                      {c.type === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Custom Service Categories Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h4 className="font-serif font-bold text-gray-900 text-sm">Categorias do Serviço</h4>
              <p className="text-[11px] text-stone-400 mt-0.5">Gerencie os grupos de especialidades (ex: Unhas, Cabelo, Estética) do catálogo de serviços.</p>
            </div>

            <form onSubmit={handleRegisterCategory} className="space-y-4">
              <div>
                <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider">Nome da Categoria de Serviço</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    className="flex-1 bg-[#FCF9F2] p-2.5 rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none"
                    placeholder="ex: Sobrancelhas"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="bg-black hover:bg-gold-500 text-white font-bold px-5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar</span>
                  </button>
                </div>
              </div>
            </form>

            {/* List existing service categories with Inline Edit & Delete */}
            <div className="border-t border-gray-100 pt-5">
              <h5 className="font-bold text-gray-900 mb-3">Categorias Habilitadas ({serviceCategories.length})</h5>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                {serviceCategories.length === 0 ? (
                  <p className="text-stone-400 text-center italic py-4">Nenhuma categoria cadastrada.</p>
                ) : (
                  serviceCategories.map(sc => (
                    <div key={sc.id} className="p-2.5 bg-stone-50 rounded-lg border border-stone-150 flex justify-between items-center transition-all hover:bg-stone-100/40">
                      {editingCategoryId === sc.id ? (
                        <div className="flex gap-2 w-full">
                          <input
                            type="text"
                            className="flex-1 bg-white p-1.5 text-xs rounded border border-gray-300 focus:outline-none font-medium h-8"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => { if (isRestricted) return; handleSaveEditCategory(sc.id); }}
                            className={"bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded text-[10px] h-8" + (isRestricted ? " opacity-50" : "")}
                            title={isRestricted ? "Plano expirado. Renove para voltar a realizar alterações." : undefined}
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold px-3 py-1 rounded text-[10px] h-8"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold text-stone-800 text-[11.5px]">{sc.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(sc.id);
                                setEditCategoryName(sc.name);
                              }}
                              className="text-stone-400 hover:text-stone-600 p-1 rounded hover:bg-white border border-transparent hover:border-stone-200 transition cursor-pointer"
                              title="Editar Categoria"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(sc.id, sc.name)}
                              className={`p-1 rounded border transition cursor-pointer flex items-center gap-0.5 text-[10px] font-black ${
                                catDeleteConfirmId === sc.id 
                                  ? 'bg-red-50 border-red-200 text-red-650 animate-pulse px-1.5' 
                                  : 'text-stone-400 hover:text-rose-600 hover:bg-white border-transparent hover:border-stone-200'
                              }`}
                              title={catDeleteConfirmId === sc.id ? "Clique novamente para confirmar" : "Excluir Categoria"}
                            >
                              {catDeleteConfirmId === sc.id ? (
                                <span>Confirmar?</span>
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      <AlertModal
        open={!!alertState}
        message={alertState?.message || ''}
        variant={alertState?.variant || 'info'}
        onClose={() => setAlertState(null)}
      />

    </div>
  );
}
