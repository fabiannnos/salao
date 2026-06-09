import React, { useState, useEffect } from 'react';
import { Salon, Professional } from '../types';
import { 
  ShieldCheck, 
  Building2, 
  Users, 
  Key, 
  Lock, 
  Unlock, 
  Calendar, 
  UserCheck, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Edit, 
  Plus, 
  LogOut, 
  RefreshCw, 
  Search, 
  Briefcase,
  User,
  MapPin,
  ClipboardList,
  Phone,
  Copy,
  Check,
  Trash2
} from 'lucide-react';
import { formatPhone, formatCNPJ, formatCEP } from '../utils';
import AlertModal from './AlertModal';

interface SaaSManagerDashboardProps {
  salons: Salon[];
  allProfessionals: Professional[];
  onAddSalon: (salon: Salon) => void;
  onUpdateSalon: (salon: Salon) => void;
  onLogout: () => void;
  triggerUpdateAllProfessionals: (list: Professional[]) => void;
  onClearSalonData?: (salonId: string) => void;
  onRecalculateCommissions?: (salonId: string) => { successCount: number; comandaCount: number };
  onDeleteSalon?: (salonId: string, passwordConfirm: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export default function SaaSManagerDashboard({
  salons,
  allProfessionals,
  onAddSalon,
  onUpdateSalon,
  onLogout,
  triggerUpdateAllProfessionals,
  onClearSalonData,
  onRecalculateCommissions,
  onDeleteSalon
}: SaaSManagerDashboardProps) {
  // Navigation tabs in SaaS Admin
  const [saasTab, setSaasTab] = useState<'overview' | 'criar'>('overview');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingSalonId, setEditingSalonId] = useState<string | null>(null);
  
  // Create / Edit Salon Form states
  const [formName, setFormName] = useState('');
  const [formCNPJ, setFormCNPJ] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPassword, setFormPassword] = useState('1234');
  const [formMaxProfs, setFormMaxProfs] = useState('5');
  const [formMaxAdmins, setFormMaxAdmins] = useState('2');
  const [formExpiration, setFormExpiration] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // Default to 30 days license
    return d.toISOString().split('T')[0];
  });
  const [formIsActive, setFormIsActive] = useState(true);
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formPlanValue, setFormPlanValue] = useState('120');
  
  const [formBairro, setFormBairro] = useState('');
  const [formEstado, setFormEstado] = useState('');
  const [formCEP, setFormCEP] = useState('');
  const [formNumero, setFormNumero] = useState('');
  const [formComplemento, setFormComplemento] = useState('');

  // Password reset inline state
  const [resettingSalonId, setResettingSalonId] = useState<string | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // Sandbox data clearing state managers (iframe safe)
  const [sandboxResetConfirmId, setSandboxResetConfirmId] = useState<string | null>(null);
  const [sandboxResetSuccessName, setSandboxResetSuccessName] = useState<string | null>(null);

  // Secure sandbox deletion states
  const [deletingSalonId, setDeletingSalonId] = useState<string | null>(null);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Selected company for detailed administrator management
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(() => {
    return salons.length > 0 ? salons[0].id : null;
  });

  // Auto-sync selectedSalonId if the current selected salon gets deleted or the salons list changes
  useEffect(() => {
    if (selectedSalonId && !salons.some(s => s.id === selectedSalonId)) {
      setSelectedSalonId(salons.length > 0 ? salons[0].id : null);
    } else if (!selectedSalonId && salons.length > 0) {
      setSelectedSalonId(salons[0].id);
    }
  }, [salons, selectedSalonId]);

  // State to edit an Administrator role cell
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editingAdminName, setEditingAdminName] = useState('');
  const [editingAdminPhone, setEditingAdminPhone] = useState('');
  const [editingAdminPassword, setEditingAdminPassword] = useState('');
  const [editingAdminActive, setEditingAdminActive] = useState<boolean>(true);

  // Ready message that the SaaS Master can copy to clipboard
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null);
  const [dispatchAdminName, setDispatchAdminName] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // State to Quick-Add another administrator inside the current salon
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('1234');

  // Commission recalculation state handlers
  const [recalculating, setRecalculating] = useState(false);
  const [recalcSummary, setRecalcSummary] = useState<{ success: boolean; text: string } | null>(null);
  const [recalcConfirmId, setRecalcConfirmId] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{message: string; variant?: 'info' | 'success' | 'error'} | null>(null);

  const executeRecalculate = (salonId: string, salonName: string) => {
    if (!onRecalculateCommissions) return;

    setRecalculating(true);
    setRecalcSummary(null);
    setTimeout(() => {
      try {
        const { successCount, comandaCount } = onRecalculateCommissions(salonId);
        setRecalcSummary({
          success: true,
          text: `Sucesso! Foram analisadas ${comandaCount} comandas para a sandbox de "${salonName}". Das quais ${successCount} foram recalculadas aplicando com sucesso a prioridade de taxas (Comissão Colaborador > Comissão do Produto).`
        });
      } catch (err) {
        console.error(err);
        setRecalcSummary({
          success: false,
          text: `Ocorreu um erro síncrono ao recalcular as comissões de "${salonName}".`
        });
      } finally {
        setRecalculating(false);
        setRecalcConfirmId(null);
      }
    }, 600);
  };

  // Reset form helper
  const clearForm = () => {
    setFormName('');
    setFormCNPJ('');
    setFormPhone('');
    setFormEmail('');
    setFormCity('São Paulo');
    setFormAddress('');
    setFormBairro('');
    setFormEstado('');
    setFormCEP('');
    setFormNumero('');
    setFormComplemento('');
    setFormPassword('1234');
    setFormMaxProfs('5');
    setFormMaxAdmins('2');
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setFormExpiration(d.toISOString().split('T')[0]);
    setFormIsActive(true);
    setFormLogoUrl('');
    setFormPlanValue('120');
    setEditingSalonId(null);
  };

  // Trigger editing a salon sandbox
  const handleStartEdit = (salon: Salon) => {
    setEditingSalonId(salon.id);
    setFormName(salon.name);
    setFormCNPJ(formatCNPJ(salon.cnpj));
    setFormPhone(salon.phone);
    setFormEmail(salon.email || '');
    setFormCity(salon.city || 'São Paulo');
    setFormAddress(salon.address || '');
    setFormBairro(salon.bairro || '');
    setFormEstado(salon.estado || '');
    setFormCEP(formatCEP(salon.cep || ''));
    setFormNumero(salon.numero || '');
    setFormComplemento(salon.complemento || '');
    setFormPassword(salon.password || '1234');
    setFormMaxProfs((salon.maxProfessionals || 5).toString());
    setFormMaxAdmins((salon.maxAdmins || 2).toString());
    setFormExpiration(salon.expirationDate || new Date().toISOString().split('T')[0]);
    setFormIsActive(salon.isActive !== false);
    setFormLogoUrl(salon.logoUrl || '');
    setFormPlanValue((salon.planValue ?? 120).toString());
    setSaasTab('criar');
  };

  // Fetch address from ViaCEP
  const handleCEPLookup = async (cepValue: string) => {
    const formatted = formatCEP(cepValue);
    setFormCEP(formatted);
    
    const clean = cepValue.replace(/\D/g, '');
    if (clean.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        if (response.ok) {
          const data = await response.json();
          if (!data.erro) {
            setFormAddress(data.logradouro || '');
            setFormBairro(data.bairro || '');
            setFormCity(data.localidade || '');
            setFormEstado(data.uf || '');
          }
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  // Create or Update Salon handler
  const handleSaveSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCNPJ) {
      setAlertState({message: "Por favor, preencha a Razão Social e o CNPJ da sandbox.", variant: 'error'});
      return;
    }

    // Desabilita o botão pra evitar duplo clique
    setIsSaving(true);

    try {
      if (editingSalonId) {
        const existingSalon = salons.find(s => s.id === editingSalonId);
        const updated: Salon = {
        id: editingSalonId,
        name: formName,
        cnpj: formCNPJ,
        phone: formPhone,
        email: formEmail,
        city: formCity,
        address: formAddress,
        bairro: formBairro,
        estado: formEstado,
        cep: formCEP,
        numero: formNumero,
        complemento: formComplemento,
        password: formPassword,
        maxProfessionals: parseInt(formMaxProfs) || 5,
        maxAdmins: parseInt(formMaxAdmins) || 2,
        expirationDate: formExpiration,
        isActive: formIsActive,
        logoUrl: formLogoUrl,
        planValue: parseFloat(formPlanValue) || 120,
        cardFeePercentProfDeduct: existingSalon?.cardFeePercentProfDeduct ?? 0
      };
      
      // 1. PERSISTE NO SUPABASE PRIMEIRO (antes de qualquer estado local ou auto-sync)
      try {
        const billingResp = await fetch("/api/update-tenant-billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: editingSalonId,
            expirationDate: formExpiration,
            planValue: parseFloat(formPlanValue) || 120,
            isActive: formIsActive,
          })
        });
        const billingData = await billingResp.json();
        if (!billingData.success) {
          console.error("[SaveSalon] Erro no billing endpoint:", billingData.error);
        }
      } catch (err) {
        console.error("[SaveSalon] Erro de rede ao persistir no Supabase:", err);
      }

      // 2. SÓ DEPOIS atualiza estado local + dispara auto-sync
      //    (o auto-sync agora vai ler do Supabase que já tem os valores atualizados)
      onUpdateSalon(updated);
      setAlertState({message: `Licença e dados da sandbox "${formName}" atualizados com sucesso !`, variant: 'success'});
      setSaasTab('overview');
      clearForm();
    } else {
      // Create new Salon
      // Validate unique CNPJ first
      const cnpjClean = formCNPJ.replace(/\D/g, '');
      if (salons.some(s => s.cnpj.replace(/\D/g, '') === cnpjClean)) {
        setAlertState({message: "Já existe uma sandbox configurada com este CNPJ.", variant: 'error'});
        setIsSaving(false);
        return;
      }

      const newSalonId = 'salon_' + Math.random().toString(36).substr(2, 9);
      const newSalon: Salon = {
        id: newSalonId,
        name: formName,
        cnpj: formCNPJ,
        phone: formPhone,
        email: formEmail,
        city: formCity,
        address: formAddress,
        bairro: formBairro,
        estado: formEstado,
        cep: formCEP,
        numero: formNumero,
        complemento: formComplemento,
        password: formPassword,
        maxProfessionals: parseInt(formMaxProfs) || 5,
        maxAdmins: parseInt(formMaxAdmins) || 2,
        expirationDate: formExpiration,
        isActive: formIsActive,
        logoUrl: formLogoUrl,
        planValue: parseFloat(formPlanValue) || 120
      };

      onAddSalon(newSalon);
      setAlertState({message: `Nova sandbox "${formName}" provisionada com sucesso !`, variant: 'success'});
      
      // Auto-populate default administrator in that newly created salon
      // to avoid initial login blocker for the customer!
      const defaultAdmin: Professional = {
        id: 'prof_' + Math.random().toString(36).substr(2, 9),
        salonId: newSalonId,
        name: "Gerente Master Admin",
        phone: formPhone || "(11) 90000-0000",
        commissionRate: 0,
        category: 'Outros',
        password: formPassword || "1234",
        isActive: true,
        role: 'administrador',
        specialties: []
      };

      triggerUpdateAllProfessionals([...allProfessionals, defaultAdmin]);
      setSaasTab('overview');
      clearForm();
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Inline Admin Password Reset for a specific salon
  const handleResetPasswordSubmit = (salonId: string) => {
    if (!newPasswordVal.trim()) {
      setAlertState({message: "A nova senha não pode estar vazia.", variant: 'error'});
      return;
    }
    const match = salons.find(s => s.id === salonId);
    if (match) {
      onUpdateSalon({
        ...match,
        password: newPasswordVal
      });
      setAlertState({message: `Senha mestre do administrador de "${match.name}" alterada com sucesso para: ${newPasswordVal}`, variant: 'success'});
      
      // Also update any admin in `allProfessionals` belonging to this salon and named "Gerente Master Admin"
      const updatedProfs = allProfessionals.map(p => {
        if (p.salonId === salonId && p.role === 'administrador') {
          return { ...p, password: newPasswordVal };
        }
        return p;
      });
      triggerUpdateAllProfessionals(updatedProfs);

      setResettingSalonId(null);
      setNewPasswordVal('');
    }
  };

  // Helper actions to manage specific admin logins
  const handleStartEditAdmin = (admin: Professional) => {
    setEditingAdminId(admin.id);
    setEditingAdminName(admin.name);
    setEditingAdminPhone(admin.phone);
    setEditingAdminPassword(admin.password || '1234');
    setEditingAdminActive(admin.isActive !== false);
    setDispatchMessage(null);
  };

  const handleSaveAdminEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdminId) return;

    if (!editingAdminName.trim() || !editingAdminPhone.trim()) {
      setAlertState({message: "Por favor, preencha Nome e Telefone do administrador.", variant: 'error'});
      return;
    }

    const cleanPhone = editingAdminPhone.replace(/\D/g, '');
    const phoneExists = allProfessionals.some(p => p.id !== editingAdminId && p.phone.replace(/\D/g, '') === cleanPhone);
    if (phoneExists) {
      setAlertState({message: "Este celular já está cadastrado para outro profissional / administrador.", variant: 'error'});
      return;
    }

    const updated = allProfessionals.map(p => {
      if (p.id === editingAdminId) {
        return {
          ...p,
          name: editingAdminName,
          phone: editingAdminPhone,
          password: editingAdminPassword || '1234',
          isActive: editingAdminActive
        };
      }
      return p;
    });

    triggerUpdateAllProfessionals(updated);
    setEditingAdminId(null);
    setAlertState({message: "Ddos do administrador atualizados com sucesso!", variant: 'success'});
  };

  const handleResetAndSendAdmin = (admin: Professional) => {
    // Generate a secure 4-digit code
    const newPass = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Update the DB (allProfessionals)
    const updated = allProfessionals.map(p => {
      if (p.id === admin.id) {
        return { ...p, password: newPass };
      }
      return p;
    });
    triggerUpdateAllProfessionals(updated);

    // Find salon for CNPJ info
    const salonObj = salons.find(s => s.id === admin.salonId);

    // Build beautiful Copyable text
    const msgText = `🚀 *GESTÃO MODELLO - ACESSO RECOMPILADO*

Olá, *${admin.name}*! Percebemos sua solicitação de reset e seu acesso ao painel administrativo do salão *${salonObj?.name || 'Modello'}* foi redefinido com sucesso!

📍 *SEUS DADOS DE ACESSO DO CLIENTE:*
🏢 *CNPJ:* ${salonObj?.cnpj || 'N/A'}
📱 *Celular (Login):* ${admin.phone}
🔑 *Senha Gerada:* ${newPass}

Acesse o painel em: ${window.location.origin}
_Nota: Guarde seus dados em local seguro e confidencial. Suporte SaaS Modello._`;

    setDispatchAdminName(admin.name);
    setDispatchMessage(msgText);
    setCopiedSuccess(false);
  };

  const handleQuickCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalonId) return;
    
    const targetSalon = salons.find(s => s.id === selectedSalonId);
    if (!targetSalon) return;

    const currentAdminsGroup = allProfessionals.filter(p => p.salonId === selectedSalonId && p.role === 'administrador');
    const maxAllowed = targetSalon.maxAdmins || 2;
    if (currentAdminsGroup.length >= maxAllowed) {
      setAlertState({message: `Não é possível adicionar! Limite contratado atingido. O plano deste salão de beleza permite no máximo ${maxAllowed} administradores simultâneos. Se precisar de mais, edite a sandbox aumentando o limite.`, variant: 'error'});
      return;
    }

    if (!newAdminName || !newAdminPhone) {
      setAlertState({message: "Nome e celular são obrigatórios.", variant: 'error'});
      return;
    }

    const cleanPhone = newAdminPhone.replace(/\D/g, '');
    const phoneExists = allProfessionals.some(p => p.phone.replace(/\D/g, '') === cleanPhone);
    if (phoneExists) {
      setAlertState({message: "Já existe um colaborador cadastrado com este telefone.", variant: 'error'});
      return;
    }

    const newAdminObj: Professional = {
      id: 'admin_usr_' + Math.random().toString(36).substr(2, 9),
      salonId: selectedSalonId,
      name: newAdminName,
      phone: formatPhone(newAdminPhone),
      password: newAdminPassword || '1234',
      commissionRate: 0,
      isActive: true,
      category: 'Outros',
      role: 'administrador',
      specialties: []
    };

    triggerUpdateAllProfessionals([...allProfessionals, newAdminObj]);
    setNewAdminName('');
    setNewAdminPhone('');
    setNewAdminPassword('1234');
    setShowAddAdminForm(false);
    setAlertState({message: `Administrador "${newAdminObj.name}" incluído com sucesso!`, variant: 'success'});
  };

  // Compute stats across all sandboxes
  const totalClients = salons.length;
  const activeClients = salons.filter(s => {
    const today = new Date().toISOString().split('T')[0];
    const isNotExpired = !s.expirationDate || s.expirationDate >= today;
    return s.isActive !== false && isNotExpired;
  }).length;
  const suspendedClients = salons.filter(s => s.isActive === false).length;
  
  // Total count of active staff across all clients
  const activeProfsCount = allProfessionals.filter(p => p.isActive !== false && p.role !== 'administrador').length;
  const activeAdminsCount = allProfessionals.filter(p => p.isActive !== false && p.role === 'administrador').length;

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered sandbox list
  const filteredSalons = salons.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cnpj.replace(/\D/g, '').includes(searchQuery.replace(/\D/g, '')) ||
    (s.city || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedSalon = selectedSalonId ? salons.find(s => s.id === selectedSalonId) : null;

  return (
    <div id="saas-admin-container" className="min-h-screen bg-[#FDFBF7] text-stone-700 font-sans flex flex-col">
      {/* Top Admin Header */}
      <nav className="bg-stone-950 text-white px-6 py-4 flex items-center justify-between border-b border-stone-850 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-[#e5b35f] text-stone-950 p-1.5 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 font-black" />
          </div>
          <div>
            <h1 className="font-serif font-black text-stone-100 text-sm tracking-tight leading-none">Painel SaaS Gerencial</h1>
            <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold block mt-1">Portal do Franqueador & Licenciador Modello</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-zinc-400">Autenticado como</p>
            <p className="text-xs font-black text-[#e5b35f]">MASTER SAAS ADMIN</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-850 hover:bg-rose-950 hover:text-rose-250 border border-stone-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </nav>

      {/* Hero Stats Section */}
      <div className="max-w-7xl w-full mx-auto px-6 mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200/65 shadow-xs">
          <span className="text-stone-400 text-[10px] uppercase font-bold tracking-widest block">Total Sandboxes</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-stone-900">{totalClients}</span>
            <Building2 className="w-4 h-4 text-[#e5b35f] ml-auto" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/65 shadow-xs">
          <span className="text-stone-400 text-[10px] uppercase font-bold tracking-widest block">Ambientes Ativos</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">{activeClients}</span>
            <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />
          </div>
          <span className="text-[9px] text-stone-450 block mt-1">{totalClients - activeClients} bloqueados / expirados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/65 shadow-xs">
          <span className="text-stone-400 text-[10px] uppercase font-bold tracking-widest block">Licenças Profissionais</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-stone-900">{activeProfsCount}</span>
            <Users className="w-4 h-4 text-stone-400 ml-auto" />
          </div>
          <span className="text-[9px] text-stone-450 block mt-1">Colaboradores de tabela ativos</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/65 shadow-xs">
          <span className="text-stone-400 text-[10px] uppercase font-bold tracking-widest block">Licenças Admin</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-700">{activeAdminsCount}</span>
            <UserCheck className="w-4 h-4 text-rose-400 ml-auto" />
          </div>
          <span className="text-[9px] text-stone-450 block mt-1">Gestores simultâneos activos</span>
        </div>

        <div className="bg-neutral-900 text-white p-4 rounded-xl border border-stone-800 shadow-xs col-span-2 md:col-span-1">
          <span className="text-stone-400 text-[10px] uppercase font-bold tracking-widest block">Faturamento Estimado</span>
          <div className="mt-1">
            <span className="text-lg font-black text-[#e5b35f] block">
              R$ {((activeProfsCount * 45) + (activeAdminsCount * 95)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[8px] text-stone-400 block mt-0.5">Auditoria mensal baseada em licenças ativa</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="max-w-7xl w-full mx-auto px-6 mt-6 flex justify-between items-center bg-stone-100 p-1.5 rounded-lg border border-stone-200">
        <div className="flex gap-2">
          <button
            onClick={() => { setSaasTab('overview'); clearForm(); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md font-sans text-xs font-bold transition-all cursor-pointer ${
              saasTab === 'overview' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-850'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-stone-500" />
            <span>Ver Sandboxes e Contratos Ativos</span>
          </button>
          
          <button
            onClick={() => { setSaasTab('criar'); clearForm(); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md font-sans text-xs font-bold transition-all cursor-pointer ${
              saasTab === 'criar' ? 'bg-white text-stone-900 shadow-xs animate-pulse-slow' : 'text-stone-500 hover:text-stone-850'
            }`}
          >
            <Plus className="w-4 h-4 text-[#e5b35f]" />
            <span>{editingSalonId ? 'Editar Sandbox' : 'Provisionar Nova Sandbox / Franquia'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {onRecalculateCommissions && (
            <button
              onClick={() => selectedSalon && setRecalcConfirmId(selectedSalon.id)}
              disabled={recalculating || !selectedSalon}
              id="recalculate-commissions-btn"
              className="flex items-center gap-2 px-3 py-1.5 bg-[#e5b35f] hover:bg-stone-900 border border-[#c69a51] hover:border-black text-stone-950 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title={selectedSalon ? `Sincronizar e recalcular as taxas de comissão da sandbox "${selectedSalon.name}"` : "Selecione um cliente/sandbox abaixo para habilitar"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              <span>
                {recalculating ? 'Processando...' : selectedSalon ? `Recalcular Comissões (${selectedSalon.name.split(' ')[0]})` : 'Recalcular Comissões'}
              </span>
            </button>
          )}

          <div className="text-[10px] bg-stone-200 border border-stone-300 text-stone-550 px-3 py-1.5 rounded-md font-mono font-bold tracking-wide">
            SAAS STATUS: CRIPTOGRÁFICO INTEGRADO
          </div>
        </div>
      </div>

      {recalcSummary && (
        <div id="recalc-status-alert" className="max-w-7xl w-full mx-auto px-6 mt-4">
          <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${
            recalcSummary.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="text-xs font-semibold leading-relaxed">
              {recalcSummary.text}
            </div>
            <button 
              onClick={() => setRecalcSummary(null)}
              className="ml-auto text-stone-400 hover:text-stone-900 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 font-sans text-xs">
        
        {/* VIEW SANDBOX TAB */}
        {saasTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Search filtering */}
            <div className="bg-white p-4 rounded-xl border border-stone-200/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome do salão, CNPJ ou cidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#fdfdfc] pl-9 pr-4 py-2.5 rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none text-xs text-stone-900 font-medium"
                />
              </div>

              <div className="text-stone-450 text-[10.5px] italic text-right shrink-0">
                Mostrando {filteredSalons.length} de {salons.length} sandboxes de clientes cadastradas no banco local.
              </div>
            </div>

            {/* Sandbox list TABLE */}
            <div className="bg-white rounded-xl border border-stone-200/50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 text-stone-450 uppercase tracking-wider text-[10px] font-bold border-b border-stone-200">
                      <th className="px-6 py-3.5">Razão Social / Sandbox</th>
                      <th className="px-6 py-3.5">Cidade</th>
                      <th className="px-6 py-3.5 text-center">Licenças de Admins</th>
                      <th className="px-6 py-3.5 text-center">Licenças de Profissionais</th>
                      <th className="px-6 py-3.5 text-center">Expiração da Licença</th>
                      <th className="px-6 py-3.5 text-center">Status Contrato</th>
                      <th className="px-6 py-3.5 text-right">Controles & Suporte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-650 font-sans">
                    {filteredSalons.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-400 italic">
                          Nenhum ambiente de simulação encontrado para o termo especificado.
                        </td>
                      </tr>
                    ) : (
                      filteredSalons.map(s => {
                        // Compute statistics
                        const totalRegisteredProfs = allProfessionals.filter(p => p.salonId === s.id && p.role !== 'administrador').length;
                        const activeRegisteredProfs = allProfessionals.filter(p => p.salonId === s.id && p.isActive !== false && p.role !== 'administrador').length;
                        
                        const totalRegisteredAdmins = allProfessionals.filter(p => p.salonId === s.id && p.role === 'administrador').length;
                        const activeRegisteredAdmins = allProfessionals.filter(p => p.salonId === s.id && p.isActive !== false && p.role === 'administrador').length;

                        const maxProfs = s.maxProfessionals || 5;
                        const maxAdmins = s.maxAdmins || 2;

                        const isBlocked = s.isActive === false;
                        const isExpired = s.expirationDate && s.expirationDate < todayStr;
                        
                        let statusText = "Ativo";
                        let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        if (isBlocked) {
                          statusText = "Suspenso";
                          statusColor = "bg-rose-50 text-rose-700 border-rose-250";
                        } else if (isExpired) {
                          statusText = "Expirado";
                          statusColor = "bg-amber-50 text-amber-700 border-amber-250";
                        }

                        // Estimate monthly bill
                        const estimatedBill = (activeRegisteredProfs * 45) + (activeRegisteredAdmins * 95);

                        return (
                          <tr 
                            key={s.id} 
                            onClick={() => {
                              setSelectedSalonId(s.id);
                              setEditingAdminId(null);
                              setDispatchMessage(null);
                            }}
                            className={`transition-all cursor-pointer ${
                              selectedSalonId === s.id 
                                ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-[#a0854c]' 
                                : 'hover:bg-amber-500/5 border-l-4 border-l-transparent'
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-850 text-[#e5b35f] font-serif font-black text-xs flex items-center justify-center">
                                  {s.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="leading-tight">
                                  <p className="font-bold text-stone-900 text-xs">{s.name}</p>
                                  <p className="text-[10px] text-stone-400 font-mono mt-0.5">CNPJ: {s.cnpj}</p>
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 font-medium text-stone-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span className="line-clamp-1">{s.city || 'São Paulo'}</span>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center">
                              <div className="inline-block px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
                                <div className="flex items-center gap-1 text-rose-800 font-mono font-black text-xs justify-center">
                                  <span>{activeRegisteredAdmins}</span>
                                  <span className="text-rose-400 font-normal">/</span>
                                  <span className="text-rose-500">{maxAdmins}</span>
                                </div>
                                <span className="text-[8px] text-rose-500 uppercase tracking-wide block leading-none mt-0.5 font-bold">
                                  Ativos ({totalRegisteredAdmins} total)
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center">
                              <div className="inline-block px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-center">
                                <div className="flex items-center gap-1 text-sky-800 font-mono font-black text-xs justify-center">
                                  <span>{activeRegisteredProfs}</span>
                                  <span className="text-sky-450 font-normal">/</span>
                                  <span className="text-sky-550">{maxProfs}</span>
                                </div>
                                <span className="text-[8px] text-sky-550 uppercase tracking-wide block leading-none mt-0.5 font-bold">
                                  Ativos ({totalRegisteredProfs} total)
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center font-mono font-bold text-stone-750">
                              <div className="inline-flex items-center gap-1 justify-center">
                                <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span>{s.expirationDate ? s.expirationDate.split('-').reverse().join('/') : '7 Dias'}</span>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full border ${statusColor}`}>
                                {statusText}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right space-y-2">
                              {/* Standard actions */}
                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(s);
                                  }}
                                  className="p-1.5 text-blue-700 hover:text-white hover:bg-blue-600 rounded-md border border-blue-200 bg-blue-50 transition-all cursor-pointer font-bold flex items-center gap-1 text-[10px]"
                                  title="Editar Sandbox"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Editar</span>
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextStatus = s.isActive !== false ? false : true;
                                    onUpdateSalon({ ...s, isActive: nextStatus });
                                  }}
                                  className={`p-1.5 rounded-md border transition-all cursor-pointer font-bold flex items-center gap-1 text-[10px] ${
                                    s.isActive !== false
                                      ? 'text-rose-700 hover:text-white hover:bg-rose-600 border-rose-200 bg-rose-50'
                                      : 'text-emerald-700 hover:text-white hover:bg-emerald-600 border-emerald-200 bg-emerald-50'
                                  }`}
                                  title={s.isActive !== false ? "Suspender Acesso" : "Ativar Acesso"}
                                >
                                  {s.isActive !== false ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                  <span>{s.isActive !== false ? 'Bloquear' : 'Desbloquear'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSandboxResetConfirmId(s.id);
                                  }}
                                  className="p-1.5 text-amber-700 hover:text-white hover:bg-amber-600 rounded-md border border-amber-200 bg-amber-50 transition-all cursor-pointer font-bold flex items-center gap-1 text-[10px]"
                                  title="Zerar Todas as Movimentações"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Zerar Base</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRecalcConfirmId(s.id);
                                  }}
                                  className="p-1.5 text-indigo-755 hover:text-white hover:bg-indigo-600 rounded-md border border-indigo-200 bg-indigo-50 transition-all cursor-pointer font-bold flex items-center gap-1 text-[10px]"
                                  title="Recalcular as comissões registradas nesta sandbox"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Recalcular</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingSalonId(s.id);
                                    setDeleteConfirmPassword('');
                                    setDeleteErrorMsg(null);
                                  }}
                                  className="p-1.5 text-rose-700 hover:text-white hover:bg-rose-600 rounded-md border border-rose-250 bg-rose-50 transition-all cursor-pointer font-bold flex items-center gap-1 text-[10px]"
                                  title="Excluir salão e apagar toda a base permanentemente"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  <span>Excluir</span>
                                </button>
                                <button style={{ display: 'none' }}>
                                </button>
                              </div>

                              {/* Inline Admin password Reset area */}
                              <div className="flex items-center justify-end">
                                {resettingSalonId === s.id ? (
                                  <div className="flex gap-1.5 bg-amber-50 border border-amber-250 p-1.5 rounded-lg animate-slide-in">
                                    <input
                                      type="text"
                                      placeholder="Nova senha..."
                                      className="bg-white border border-stone-300 p-1 rounded font-bold max-w-28 text-[11px] font-mono"
                                      value={newPasswordVal}
                                      onChange={(e) => setNewPasswordVal(e.target.value)}
                                    />
                                    <button
                                      onClick={() => handleResetPasswordSubmit(s.id)}
                                      className="text-[10px] px-2 py-1 bg-amber-600 hover:bg-stone-900 border border-amber-700 hover:border-black text-white rounded font-bold cursor-pointer font-sans"
                                    >
                                      Salvar
                                    </button>
                                    <button
                                      onClick={() => setResettingSalonId(null)}
                                      className="text-[10px] px-1 text-stone-500 hover:text-rose-600 font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setResettingSalonId(s.id);
                                      setNewPasswordVal(s.password || '1234');
                                    }}
                                    className="text-[9.5px] font-black text-[#a0854c] hover:underline bg-[#FCF9F2] px-2 py-1 rounded border border-amber-200 hover:bg-stone-100 transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Key className="w-3 h-3 shrink-0" />
                                    <span>Trocar Senha Mestre</span>
                                  </button>
                                )}
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
            
            {/* DETAIL ZONE: ADMINISTRATORS MANAGEMENT FOR THE SELECTED COMPANY */}
            <div className="bg-[#FCF9F2]/65 p-5 rounded-xl border border-amber-200 space-y-4 animate-fade-in shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200">
                <div>
                  <h4 className="font-serif font-black text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-[#a0854c]" />
                    <span>Administradores Cadastrados ({selectedSalon ? selectedSalon.name : 'Nenhum Salão Selecionado'})</span>
                  </h4>
                  <p className="text-[10px] text-stone-500">
                    Selecione qualquer salão na tabela acima para gerenciar seus logins de administrador autorizados, telefone e senhas.
                  </p>
                </div>
                
                {selectedSalon && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRecalcConfirmId(selectedSalon.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-stone-900 border border-indigo-750 hover:border-black text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      title={`Recalcular todas as comissões registradas na sandbox do cliente "${selectedSalon.name}"`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Recalcular Comissões</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddAdminForm(!showAddAdminForm);
                        setNewAdminName('');
                        setNewAdminPhone('');
                      }}
                      className="px-3 py-1.5 bg-black hover:bg-[#a0854c] text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddAdminForm ? 'Cancelar' : 'Cadastrar Administrador'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* DYNAMIC COPY-READY SUPPORT TEXT */}
              {dispatchMessage && (
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl space-y-2 animate-scale-up">
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-200">
                    <span className="font-semibold text-emerald-800 text-[11px] flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Acesso redefinido para o gestor: <strong className="text-stone-900">{dispatchAdminName}</strong>
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(dispatchMessage);
                        setCopiedSuccess(true);
                        setTimeout(() => setCopiedSuccess(false), 3000);
                      }}
                      className={`px-3 py-1 text-[10px] font-sans font-bold uppercase rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                        copiedSuccess 
                          ? 'bg-emerald-700 text-white border-emerald-850' 
                          : 'bg-white hover:bg-emerald-100 text-emerald-800 border-emerald-250'
                      }`}
                    >
                      {copiedSuccess ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSuccess ? 'Copiado!' : 'Copiar Texto Pronto 📋'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-white border border-emerald-100 rounded-lg text-[10px] font-mono text-emerald-950 whitespace-pre-wrap select-all cursor-text leading-tight shadow-inner">
                    {dispatchMessage}
                  </pre>
                  <p className="text-[9px] text-emerald-700 italic block leading-snug">
                    💡 <strong>Como enviar:</strong> O texto acima está pronto para envio via WhatsApp ou e-mail de suporte seguro para o cliente!
                  </p>
                </div>
              )}

              {/* QUICK ADD NEW ADMIN FORM */}
              {showAddAdminForm && selectedSalonId && (
                <form onSubmit={handleQuickCreateAdmin} className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-4 animate-slide-in">
                  <div className="text-stone-800 font-bold text-[10.5px] uppercase tracking-wide">
                    Novo Administrador do Salão: <span className="text-amber-800 font-black">{salons.find(s => s.id === selectedSalonId)?.name}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-stone-450 font-bold mb-1 uppercase text-[9px] tracking-wide">Nome Completo</label>
                      <input
                        type="text"
                        required
                        placeholder="Nome do Administrador"
                        className="w-full p-2 bg-[#FDFBF7] border border-stone-250 rounded text-xs text-stone-850"
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-stone-450 font-bold mb-1 uppercase text-[9px] tracking-wide">Celular (Login)</label>
                      <input
                        type="text"
                        required
                        placeholder="(11) 99999-9999"
                        className="w-full p-2 bg-[#FDFBF7] border border-stone-250 rounded text-xs text-stone-850 font-mono"
                        value={newAdminPhone}
                        onChange={(e) => setNewAdminPhone(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-stone-450 font-bold mb-1 uppercase text-[9px] tracking-wide">Senha Provisória</label>
                      <input
                        type="text"
                        required
                        className="w-full p-2 bg-[#FDFBF7] border border-stone-250 rounded text-xs text-stone-850 font-mono"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddAdminForm(false)}
                      className="px-3 py-1.5 text-[10px] font-bold border border-stone-200 text-stone-500 rounded bg-white hover:bg-stone-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-[10px] font-bold bg-[#a0854c] hover:bg-stone-900 border border-[#a0854c] text-white rounded cursor-pointer"
                    >
                      Gravar Administrador
                    </button>
                  </div>
                </form>
              )}

              {/* TABLE LISTING SELECTED SALON ADMINS */}
              {!selectedSalonId ? (
                <div className="py-8 bg-white border border-dashed border-stone-250 rounded-xl text-center text-stone-400 italic">
                  Por favor, escolha uma empresa / sandbox na lista superior para auditar seus administradores.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="bg-stone-50 text-stone-450 text-[10px] font-bold uppercase tracking-wider border-b border-stone-200">
                          <th className="px-5 py-3">Administrador</th>
                          <th className="px-5 py-3">Celular de Login</th>
                          <th className="px-5 py-3">Senha Atual</th>
                          <th className="px-5 py-3 text-center">Status</th>
                          <th className="px-5 py-3 text-right">Controle Master</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-[#423C36]">
                        {(() => {
                          const salonAdmins = allProfessionals.filter(p => p.salonId === selectedSalonId && p.role === 'administrador');
                          if (salonAdmins.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="px-5 py-8 text-center text-stone-400 italic">
                                  Nenhum perfil administrador cadastrado para este salão de beleza. Clique no botão superior direito para criar um administrador provisório.
                                </td>
                              </tr>
                            );
                          }
                          return salonAdmins.map(admin => {
                            const isEditingThis = editingAdminId === admin.id;
                            
                            if (isEditingThis) {
                              return (
                                <tr key={admin.id} className="bg-amber-50/40">
                                  <td colSpan={5} className="px-5 py-4">
                                    <form onSubmit={handleSaveAdminEdit} className="space-y-4 font-sans text-left">
                                      <div className="text-amber-800 font-bold text-[11px] uppercase tracking-wide">
                                        Modificando Administração Segura para: <span className="text-stone-950 font-black">{admin.name}</span>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <div>
                                          <label className="block text-stone-450 font-bold mb-1 text-[9px] uppercase">Nome</label>
                                          <input
                                            type="text"
                                            className="w-full p-2 bg-white border border-stone-250 rounded text-xs text-stone-900 font-semibold"
                                            value={editingAdminName}
                                            onChange={(e) => setEditingAdminName(e.target.value)}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-stone-450 font-bold mb-1 text-[9px] uppercase">Telefone (Login)</label>
                                          <input
                                            type="text"
                                            className="w-full p-2 bg-white border border-stone-250 rounded text-xs text-stone-900 font-semibold font-mono"
                                            value={editingAdminPhone}
                                            onChange={(e) => setEditingAdminPhone(e.target.value)}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-stone-450 font-bold mb-1 text-[9px] uppercase">Senha</label>
                                          <input
                                            type="text"
                                            className="w-full p-2 bg-white border border-stone-250 rounded text-xs text-stone-900 font-semibold font-mono"
                                            value={editingAdminPassword}
                                            onChange={(e) => setEditingAdminPassword(e.target.value)}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-stone-450 font-bold mb-1 text-[9px] uppercase">Estado de Acesso</label>
                                          <select
                                            className="w-full p-2 bg-white border border-stone-250 rounded text-xs text-stone-900 font-semibold"
                                            value={editingAdminActive ? "true" : "false"}
                                            onChange={(e) => setEditingAdminActive(e.target.value === "true")}
                                          >
                                            <option value="true">Ativo / Login Liberado</option>
                                            <option value="false">Suspenso / Bloqueado</option>
                                          </select>
                                        </div>
                                      </div>

                                      <div className="flex justify-end gap-2 pt-2">
                                        <button
                                          type="button"
                                          onClick={() => setEditingAdminId(null)}
                                          className="px-3 py-1.5 text-[10px] font-bold border border-stone-200 bg-white hover:bg-stone-50 rounded cursor-pointer text-stone-500"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          type="submit"
                                          className="px-4 py-1.5 text-[10px] font-bold bg-stone-950 hover:bg-[#a0854c] border border-black text-white rounded cursor-pointer"
                                        >
                                          Salvar Alteração
                                        </button>
                                      </div>
                                    </form>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={admin.id} className="hover:bg-amber-50/30 transition-all">
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[#a0854c]">
                                      <User className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="font-bold text-stone-900">{admin.name}</span>
                                  </div>
                                </td>
                                
                                <td className="px-5 py-3 font-mono text-xs font-semibold text-stone-600">
                                  {admin.phone}
                                </td>

                                <td className="px-5 py-3 font-mono text-xs font-bold text-stone-600">
                                  {admin.password || '1234'}
                                </td>

                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded-full border ${
                                    admin.isActive !== false 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    {admin.isActive !== false ? 'Ativo' : 'Bloqueado'}
                                  </span>
                                </td>

                                <td className="px-5 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditAdmin(admin)}
                                      className="px-2 py-1 text-[10px] border border-stone-200 hover:border-[#a0854c] text-stone-600 hover:text-[#a0854c] rounded cursor-pointer font-bold flex items-center gap-1 bg-white hover:bg-stone-50"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                      <span>Editar</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleResetAndSendAdmin(admin)}
                                      className="px-2 py-1 text-[10px] border border-amber-250 bg-amber-50 hover:bg-stone-900 text-stone-800 hover:text-white rounded cursor-pointer font-bold flex items-center gap-1 transition-all"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>Resetar e Enviar 🚀</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            {/* Explanatory notes about billing values */}
            <div className="bg-amber-50 border border-amber-250 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#a0854c] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[#a0854c] text-xs">Auditoria de Sandbox & Licenças Corporativas</p>
                <p className="text-amber-900 text-[10px] leading-relaxed">
                  Conforme requisitos comerciais, os valores mensais de licenciamento são calculados de forma separada:
                  <strong className="mx-1">Administradores ativos (R$ 95,00 / mês cada)</strong> e
                  <strong className="mx-1">Profissionais / Operadores síncronos (R$ 45,00 / mês cada)</strong>.
                  Os limites máximos são validados mecanicamente em tempo real no cadastro de cada salão para impedir violações e assegurar contratos corretos.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* CREATE / EDIT SANDBOX TAB */}
        {saasTab === 'criar' && (
          <div className="bg-white p-6 rounded-xl border border-stone-200/60 shadow-sm max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
              <div>
                <h4 className="font-serif font-black text-stone-900 text-sm">
                  {editingSalonId ? `Editar Sandbox de Salão de Beleza - ${formName}` : 'Provisionar Novo Salão de Beleza (SaaS Sandbox)'}
                </h4>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Insira as configurações corporativas, limite de colaboradores permitidos e datas de vencimento seguras.
                </p>
              </div>
              {editingSalonId && (
                <button
                  onClick={clearForm}
                  className="text-stone-400 hover:text-stone-900 font-bold border border-stone-200 bg-white px-2.5 py-1.5 rounded-lg text-[10px]"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <form onSubmit={handleSaveSalon} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider">Razão Social / Nome do Salão</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="ex: Maison de Beauté Premium"
                      className="w-full pl-9 pr-4 py-2.5 bg-[#FDFBF7] rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-bold text-stone-900 text-xs"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider">CNPJ da Sandbox</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="ex: 98.765.432/0001-21"
                      className="w-full pl-9 pr-4 py-2.5 bg-[#FDFBF7] rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-mono font-bold text-stone-900 text-xs"
                      value={formCNPJ}
                      onChange={(e) => setFormCNPJ(formatCNPJ(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider">Celular / WhatsApp Comercial</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: (11) 98888-8888"
                    className="w-full p-2.5 bg-[#FDFBF7] rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none text-xs text-stone-850"
                    value={formPhone}
                    onChange={(e) => setFormPhone(formatPhone(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider">E-mail Financeiro</label>
                  <input
                    type="email"
                    placeholder="ex: financeiro@modellosalon.com.br"
                    className="w-full p-2.5 bg-[#FDFBF7] rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none text-xs text-stone-850"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider">Senha Secreta Mestre Admin</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type="password"
                      required
                      placeholder="Defina a senha master..."
                      className="w-full pl-9 pr-4 py-2.5 bg-[#FDFBF7] rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none text-xs font-mono font-bold text-stone-900"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider">Valor do Plano Mensal (R$)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      className="w-full p-2.5 bg-[#FDFBF7] rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-bold text-stone-900 font-mono text-center text-xs"
                      value={formPlanValue}
                      onChange={(e) => setFormPlanValue(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Address Fields with CEP Autopopulation */}
              <div className="bg-[#FAF8F5] p-5 rounded-xl border border-stone-200/80 space-y-4 animate-fade-in">
                <h5 className="text-[11px] font-bold text-stone-700 uppercase tracking-widest border-b border-stone-200/50 pb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gold-600" />
                  <span>Configuração de Endereço e Localização</span>
                </h5>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider text-[10px]">CEP (Busca Automática)</label>
                    <input
                      type="text"
                      placeholder="ex: 01311-200"
                      className="w-full p-2.5 bg-white rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-mono font-bold text-xs text-stone-900"
                      value={formCEP}
                      onChange={(e) => handleCEPLookup(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider text-[10px]">Bairro</label>
                    <input
                      type="text"
                      placeholder="ex: Jardins"
                      className="w-full p-2.5 bg-white rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none text-xs text-stone-850"
                      value={formBairro}
                      onChange={(e) => setFormBairro(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider text-[10px]">Estado (UF)</label>
                    <input
                      type="text"
                      placeholder="ex: SP"
                      maxLength={2}
                      className="w-full p-2.5 bg-white rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none text-xs font-bold text-stone-850 uppercase"
                      value={formEstado}
                      onChange={(e) => setFormEstado(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider text-[10px]">Cidade</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: São Paulo"
                      className="w-full p-2.5 bg-white rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none text-xs text-stone-850"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider text-[10px]">Rua / Logradouro</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Avenida Paulista"
                      className="w-full p-2.5 bg-white rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none text-xs text-stone-850"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider text-[10px]">Número</label>
                    <input
                      type="text"
                      placeholder="ex: 1500"
                      className="w-full p-2.5 bg-white rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none text-xs text-stone-850"
                      value={formNumero}
                      onChange={(e) => setFormNumero(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider text-[10px]">Complemento</label>
                    <input
                      type="text"
                      placeholder="ex: Ap 42 / Bloco B"
                      className="w-full p-2.5 bg-white rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none text-xs text-stone-850"
                      value={formComplemento}
                      onChange={(e) => setFormComplemento(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider">URL do Logotipo da Empresa / Salão (caso tenha)</label>
                <input
                  type="text"
                  placeholder="ex: https://site.com/logo.png"
                  className="w-full p-2.5 bg-[#FDFBF7] rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none text-xs text-stone-850"
                  value={formLogoUrl}
                  onChange={(e) => setFormLogoUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-rose-800 font-bold mb-1 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                    <UserCheck className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Limite de Administradores</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full p-2.5 bg-white rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-bold text-stone-900 font-mono text-center text-xs"
                    value={formMaxAdmins}
                    onChange={(e) => setFormMaxAdmins(e.target.value)}
                  />
                  <span className="text-[9px] text-stone-450 block mt-1 leading-normal">Seu limite de gestores contratados simultâneos (R$ 95/mês cada)</span>
                </div>

                <div>
                  <label className="block text-sky-800 font-bold mb-1 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                    <Users className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                    <span>Limite de Profissionais</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full p-2.5 bg-white rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-bold text-stone-900 font-mono text-center text-xs"
                    value={formMaxProfs}
                    onChange={(e) => setFormMaxProfs(e.target.value)}
                  />
                  <span className="text-[9px] text-stone-450 block mt-1 leading-normal">Seu limite de operadores ativos cadastrados (R$ 45/mês cada)</span>
                </div>

                <div>
                  <label className="block text-amber-800 font-bold mb-1 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>Vencimento do Contrato</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-2.5 bg-white rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-bold text-stone-900 font-mono text-center text-xs"
                    value={formExpiration}
                    onChange={(e) => setFormExpiration(e.target.value)}
                  />
                  <span className="text-[9px] text-stone-450 block mt-1 leading-normal">Data em formato YYYY-MM-DD para fechamento mecânico de licença</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wider">Estado Operacional Inicial</label>
                  <select
                    value={formIsActive ? "active" : "blocked"}
                    onChange={(e) => setFormIsActive(e.target.value === "active")}
                    className="w-full p-2.5 bg-[#FDFBF7] rounded-lg border border-stone-250 focus:border-gold-500 focus:outline-none font-bold text-stone-900"
                  >
                    <option value="active">✓ Ativado e Liberado (Liberada p/ Login)</option>
                    <option value="blocked">✕ Mecanicamente Suspenso (Acesso Bloqueado)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-stone-950 hover:bg-[#a0854c] text-white font-serif font-black uppercase tracking-widest py-3.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '⏳ Salvando...' : (editingSalonId ? '💾 Salvar Alterações na Licença' : '🚀 Criar Sandbox e Liberar Licença Mestre')}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* Corporate platform footer */}
      <footer className="bg-stone-900 text-stone-400 py-6 px-6 border-t border-stone-850 text-center shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10.5px]">
          <p>© 2026 Modello SaaS Group Enterprise. Multi-Tenant Sandbox Isolations Corp.</p>
          <div className="flex gap-4 font-mono">
            <span>PLATFORM: HIGHLY_SECURE</span>
            <span>STORAGE: PERSISTENT_STORE</span>
          </div>
        </div>
      </footer>

      {/* Confirmation modal for clearing sandbox (iframe safe) */}
      {sandboxResetConfirmId && (
        (() => {
          const tgt = salons.find(s => s.id === sandboxResetConfirmId);
          if (!tgt) return null;
          return (
            <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
              <div className="bg-[#FCF9F2] rounded-2xl border border-rose-200 p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-rose-900 tracking-tight text-lg">Zerar Toda a Base Comercial?</h3>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono">Sandbox: {tgt.name}</p>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl space-y-2 text-stone-800 text-xs leading-relaxed">
                  <p className="font-bold text-rose-800">
                    ATENÇÃO: Você está prestes a realizar uma limpeza de movimentações!
                  </p>
                  <p>
                    Isto irá apagar permanentemente todas as <strong>comandas (Kanban)</strong>, lançamentos do <strong>fluxo de caixa / faturamento (DRE)</strong>, e <strong>agendamentos de testes</strong> desta sandbox.
                  </p>
                  <p className="font-bold text-emerald-800 bg-[#eaf8ea] border border-emerald-100 px-2.5 py-1.5 rounded-lg text-left mt-1 block">
                    ✓ Os cadastros principais (profissionais, serviços, categorias, produtos e clientes) ESTÃO TOTALMENTE PROTEGIDOS e NÃO serão alterados.
                  </p>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onClearSalonData) {
                        onClearSalonData(tgt.id);
                        setSandboxResetSuccessName(tgt.name);
                      }
                      setSandboxResetConfirmId(null);
                    }}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-sans font-black tracking-wider uppercase text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Sim, Zerar Base
                  </button>
                  <button
                    type="button"
                    onClick={() => setSandboxResetConfirmId(null)}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 font-sans font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancelar e Voltar
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Commission recalculation confirm modal (iframe safe) */}
      {recalcConfirmId && (
        (() => {
          const tgt = salons.find(s => s.id === recalcConfirmId);
          if (!tgt) return null;
          return (
            <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
              <div className="bg-[#FCF9F2] rounded-2xl border border-indigo-200 p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-250 shrink-0">
                    <RefreshCw className={`w-5 h-5 ${recalculating ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-indigo-900 tracking-tight text-lg">Recalcular Comissões?</h3>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono">Sandbox: {tgt.name}</p>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl space-y-2 text-stone-850 text-xs leading-relaxed">
                  <p className="font-bold text-indigo-950">
                    Você está prestes a recalcular todas as comissões desta sandbox:
                  </p>
                  <p>
                    O sistema buscará todas as comandas registradas para o cliente <strong className="text-stone-950">{tgt.name}</strong> e atualizará as taxas correspondentes de serviços e produtos usando as regras prioritárias:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 font-medium text-stone-850 mt-1">
                    <li>Prioridade mestre: Se houver comissão informada no cadastro do profissional, esta será utilizada.</li>
                    <li>Segunda regra: Caso contrário, assumirá a comissão padrão informada no cadastro do produto.</li>
                    <li>Terceira regra: Sem comissão cadastrada no profissional ou produto, o repasse será zero.</li>
                  </ol>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    disabled={recalculating}
                    onClick={() => executeRecalculate(tgt.id, tgt.name)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-stone-950 text-white font-sans font-black tracking-wider uppercase text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {recalculating ? 'Processando...' : 'Sim, Recalcular'}
                  </button>
                  <button
                    type="button"
                    disabled={recalculating}
                    onClick={() => setRecalcConfirmId(null)}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 font-sans font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancelar e Voltar
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Success Modal (iframe safe) */}
      {sandboxResetSuccessName && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-center">
          <div className="bg-[#FCF9F2] rounded-2xl border border-emerald-200 p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-250 flex items-center justify-center mx-auto scale-110">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif font-black text-gray-950 tracking-tight text-lg">Base Reiniciada!</h3>
              <p className="text-xs text-stone-500">
                A sandbox <strong className="text-stone-800">{sandboxResetSuccessName}</strong> teve todas as suas movimentações limpas de forma isolada. Próximas comandas iniciarão em CMD-0001.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSandboxResetSuccessName(null)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xs transition cursor-pointer"
            >
              Entendido, Excelente!
            </button>
          </div>
        </div>
      )}

      {/* Secure Deletion confirmation modal with password confirmation */}
      {deletingSalonId && (
        (() => {
          const tgt = salons.find(s => s.id === deletingSalonId);
          if (!tgt) return null;
          return (
            <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
              <div className="bg-[#FCF9F2] rounded-2xl border border-rose-300 p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200 shrink-0">
                    <AlertCircle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-rose-950 tracking-tight text-lg">Excluir Cliente Permanentemente?</h3>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono">Sandbox ID: {tgt.id}</p>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl space-y-2.5 text-stone-800 text-xs leading-relaxed">
                  <p className="font-bold text-rose-800 uppercase tracking-wide text-[10px]">
                    ⚠️ AÇÃO CRÍTICA E IRREVERSÍVEL!
                  </p>
                  <p>
                    Você está prestes a excluir o salão <strong>{tgt.name}</strong> (CNPJ: {tgt.cnpj}) e <strong>TODOS</strong> os seus dados relacionados do sistema.
                  </p>
                  <p className="font-bold text-rose-900 bg-rose-100/50 p-2 rounded border border-rose-250 text-rose-950">
                    Isso apagará de forma definitiva: comandas, fluxo financeiro, agendamentos, clientes, produtos, serviços, profissionais e o próprio salão do banco de dados na nuvem e do painel. Não haverá cópia de segurança!
                  </p>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!onDeleteSalon) return;
                  if (!deleteConfirmPassword.trim()) {
                    setDeleteErrorMsg("Por favor, informe a senha.");
                    return;
                  }
                  setDeletingInProgress(true);
                  setDeleteErrorMsg(null);
                  
                  const res = await onDeleteSalon(tgt.id, deleteConfirmPassword);
                  setDeletingInProgress(false);
                  if (res && res.success) {
                    setDeletingSalonId(null);
                    setDeleteConfirmPassword('');
                    setAlertState({message: res.message || "Cliente excluído permanentemente com sucesso!", variant: 'success'});
                  } else {
                    setDeleteErrorMsg(res.error || "Ocorreu um erro ao excluir o cliente. Verifique sua senha.");
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-stone-500 font-bold mb-1 uppercase text-[9px] tracking-widest text-[#a0854c]">
                      Para confirmar, digite a senha de login do painel SaaS (a credencial configurada no ambiente):
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Senha Master SaaS..."
                      value={deleteConfirmPassword}
                      onChange={(e) => {
                        setDeleteConfirmPassword(e.target.value);
                        setDeleteErrorMsg(null);
                      }}
                      disabled={deletingInProgress}
                      className="w-full p-2.5 bg-white border border-rose-250 focus:border-rose-500 focus:outline-none rounded-lg text-xs font-mono font-bold text-stone-900"
                    />
                  </div>

                  {deleteErrorMsg && (
                    <p className="text-[10px] text-rose-600 font-bold bg-rose-50 p-2 rounded border border-rose-100 animate-pulse">
                      ✕ {deleteErrorMsg}
                    </p>
                  )}

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      disabled={deletingInProgress}
                      onClick={() => {
                        setDeletingSalonId(null);
                        setDeleteConfirmPassword('');
                        setDeleteErrorMsg(null);
                      }}
                      className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 font-sans font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={deletingInProgress}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-sans font-black tracking-wider uppercase text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {deletingInProgress ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processando...</span>
                        </>
                      ) : (
                        <span>Apagar Definitivamente</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()
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
