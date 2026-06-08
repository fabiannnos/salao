import React, { useState } from 'react';
import { Professional, Service, Product, Client, ServiceCategory, CardAcquirer, CardFeeRule } from '../types';
import { formatCurrency, formatPhone } from '../utils';
import { Users, Scissors, Tag, Sparkles, Plus, Trash2, Edit, Save, CheckSquare, Square, Upload, AlertTriangle, Download, ChevronDown, ChevronRight, CreditCard } from 'lucide-react';
import AlertModal from './AlertModal';
import { loadComandas, loadAppointments, loadFinancials } from '../dataStore';

interface ColecoesCrudProps {
  salonId: string;
  maxProfessionals: number;
  maxAdmins: number;
  professionals: Professional[];
  services: Service[];
  products: Product[];
  clients: Client[];
  serviceCategories?: ServiceCategory[];
  cardAcquirers?: CardAcquirer[];
  onUpdateProfessionals: (list: Professional[]) => void;
  onUpdateServices: (list: Service[]) => void;
  onUpdateProducts: (list: Product[]) => void;
  onUpdateClients: (list: Client[]) => void;
  onUpdateServiceCategories?: (list: ServiceCategory[]) => void;
  onUpdateCardAcquirers?: (list: CardAcquirer[]) => void;
  isReadOnly?: boolean;
}

const TOOLTIP_READONLY = "Plano expirado. Renove para voltar a realizar alterações.";

export default function ColecoesCrud({
  salonId,
  maxProfessionals,
  maxAdmins,
  professionals,
  services,
  products,
  clients,
  serviceCategories = [],
  cardAcquirers = [],
  onUpdateProfessionals,
  onUpdateServices,
  onUpdateProducts,
  onUpdateClients,
  onUpdateServiceCategories,
  onUpdateCardAcquirers,
  isReadOnly = false
}: ColecoesCrudProps) {
  const [activeCatalog, setActiveCatalog] = useState<'profissionais' | 'servicos' | 'produtos' | 'clientes' | 'cartoes'>('profissionais');
  
  // Dynamic Form Builders state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'profissionais' | 'servicos' | 'produtos' | 'clientes' | 'cartoes'; name: string } | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // Card fee rules templates defaults (Minizinha rates)
  const defaultFeeRulesTemplates: CardFeeRule[] = [
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

  // Card Acquirer fields state
  const [acqName, setAcqName] = useState('');
  const [acqActive, setAcqActive] = useState(true);
  const [acqRules, setAcqRules] = useState<CardFeeRule[]>([]);

  // Professional form fields
  const [profName, setProfName] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profComm, setProfComm] = useState('30');
  const [profPass, setProfPass] = useState('1234');
  const [profActive, setProfActive] = useState(true);
  const [profRole, setProfRole] = useState<'profissional' | 'administrador'>('profissional');
  const [profSpecialties, setProfSpecialties] = useState<string[]>([]); // Selected service IDs
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Service form fields
  const [servName, setServName] = useState('');
  const [servCat, setServCat] = useState('Cabelo');
  const [servPrice, setServPrice] = useState('');
  const [servDuration, setServDuration] = useState('45');
  const [servActive, setServActive] = useState(true);

  // Product form fields
  const [prodName, setProdName] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodCommissionRate, setProdCommissionRate] = useState('0');

  // Client fields
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientBirthMonth, setClientBirthMonth] = useState('');
  const [clientBirthDay, setClientBirthDay] = useState('');
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{message: string; variant?: 'info' | 'success' | 'error'} | null>(null);

  // Dynamically compute unified categories list
  const availableCategories = Array.from(new Set([
    'Cabelo', 'Estética', 'Unhas', 'Outros',
    ...serviceCategories.map(sc => sc.name)
  ]));

  // Active limits checks for real-time visualization (always shows the true total in the list)
  const currentActiveProfsCount = professionals.filter(p => p.isActive !== false && p.role !== 'administrador').length;
  const currentActiveAdminsCount = professionals.filter(p => p.isActive !== false && p.role === 'administrador').length;
  const limitProfs = maxProfessionals || 5;
  const limitAdmins = maxAdmins || 2;

  // Active checks excluding the current edited item (used for submit validation and warning banners)
  const otherActiveProfsCount = professionals.filter(p => p.isActive !== false && p.role !== 'administrador' && p.id !== editingItemId).length;
  const otherActiveAdminsCount = professionals.filter(p => p.isActive !== false && p.role === 'administrador' && p.id !== editingItemId).length;

  // Trigger Edit Mode
  const handleStartEdit = (item: any, type: typeof activeCatalog) => {
    setEditingItemId(item.id);
    if (type === 'profissionais') {
      const p = item as Professional;
      setProfName(p.name);
      setProfPhone(p.phone);
      setProfComm(p.commissionRate.toString());
      setProfPass(p.password || '1234');
      setProfActive(p.isActive !== false);
      setProfSpecialties(p.specialties || []);
      setCollapsedCategories({});
      setProfRole(p.role || 'profissional');
    } else if (type === 'servicos') {
      const s = item as Service;
      setServName(s.name);
      setServCat(s.category);
      setServPrice(s.price.toString());
      setServDuration(s.durationMin.toString());
    } else if (type === 'produtos') {
      const pr = item as Product;
      setProdName(pr.name);
      setProdStock(pr.stock.toString());
      setProdPrice(pr.price.toString());
      setProdCost((pr.costPrice !== undefined ? pr.costPrice : pr.cost).toString());
      setProdCommissionRate(pr.commissionRate !== undefined ? pr.commissionRate.toString() : '0');
    } else if (type === 'clientes') {
      const c = item as Client;
      setClientName(c.name);
      setClientPhone(c.phone);
      setClientEmail(c.email || '');
      if (c.birthDayMonth) {
        const parts = c.birthDayMonth.split('/');
        setClientBirthDay(parts[0] || '');
        setClientBirthMonth(parts[1] || '');
      } else {
        setClientBirthDay('');
        setClientBirthMonth('');
      }
    } else if (type === 'cartoes') {
      const acq = item as CardAcquirer;
      setAcqName(acq.name);
      setAcqActive(acq.isActive !== false);
      setAcqRules(acq.rules || []);
    }
    setShowFormModal(true);
  };

  // Process addition or modification
  const handleSaveProfessional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profName || !profPhone) return;

    const activeProfsCount = professionals.filter(p => p.isActive !== false && p.role !== 'administrador' && p.id !== editingItemId).length;
    const activeAdminsCount = professionals.filter(p => p.isActive !== false && p.role === 'administrador' && p.id !== editingItemId).length;

    const limitProfs = maxProfessionals || 5;
    const limitAdmins = maxAdmins || 2;

    if (profActive) {
      if (profRole === 'administrador') {
        if (activeAdminsCount >= limitAdmins) {
          setAlertState({message: `Não é possível ativar/cadastrar este Administrador! Limite de administradores ativos atingido. Seu plano contratado permite no máximo ${limitAdmins} administradores ativos simultaneamente. Se necessitar de mais administradores, por favor abra um ticket de suporte para alteração do seu plano.`, variant: 'error'});
          return;
        }
      } else {
        if (activeProfsCount >= limitProfs) {
          setAlertState({message: `Não é possível ativar/cadastrar este Profissional! Limite de profissionais ativos atingido. Seu plano contratado permite no máximo ${limitProfs} profissionais ativos simultaneamente. Se necessitar de mais profissionais, por favor abra um ticket de suporte para alteração do seu plano.`, variant: 'error'});
          return;
        }
      }
    }

    if (editingItemId) {
      const updatedList = professionals.map(p => {
        if (p.id === editingItemId) {
          return {
            ...p,
            name: profName,
            phone: formatPhone(profPhone),
            commissionRate: parseFloat(profComm),
            category: 'Outros' as any, // removed specialty input category
            password: profPass,
            specialties: profSpecialties,
            isActive: profActive,
            role: profRole
          };
        }
        return p;
      });
      onUpdateProfessionals(updatedList);
      setAlertState({message: "Colaborador atualizado com sucesso!", variant: 'success'});
    } else {
      const newProf: Professional = {
        id: 'prof_' + Math.random().toString(36).substr(2, 9),
        salonId,
        name: profName,
        phone: formatPhone(profPhone),
        commissionRate: parseFloat(profComm),
        category: 'Outros' as any,
        password: profPass,
        specialties: profSpecialties,
        isActive: profActive,
        role: profRole
      };
      onUpdateProfessionals([...professionals, newProf]);
      setAlertState({message: "Novo colaborador adicionado com sucesso!", variant: 'success'});
    }
    resetForm();
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!servName || !servPrice) return;

    if (editingItemId) {
      const updatedList = services.map(s => {
        if (s.id === editingItemId) {
          return {
            ...s,
            name: servName,
            category: servCat as any,
            price: parseFloat(servPrice),
            durationMin: parseInt(servDuration),
            isActive: servActive
          };
        }
        return s;
      });
      onUpdateServices(updatedList);
      setAlertState({message: "Serviço atualizado!", variant: 'success'});
    } else {
      const newServ: Service = {
        id: 'serv_' + Math.random().toString(36).substr(2, 9),
        salonId,
        name: servName,
        category: servCat as any,
        price: parseFloat(servPrice),
        durationMin: parseInt(servDuration),
        isActive: servActive
      };
      onUpdateServices([...services, newServ]);
      setAlertState({message: "Serviço registrado!", variant: 'success'});
    }
    resetForm();
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodCost) return;

    if (editingItemId) {
      const updatedList = products.map(p => {
        if (p.id === editingItemId) {
          return {
            ...p,
            name: prodName,
            stock: parseInt(prodStock),
            price: parseFloat(prodPrice),
            cost: parseFloat(prodCost),
            costPrice: parseFloat(prodCost),
            commissionRate: parseFloat(prodCommissionRate) || 0
          };
        }
        return p;
      });
      onUpdateProducts(updatedList);
      setAlertState({message: "Inventário de produto atualizado!", variant: 'success'});
    } else {
      const newProd: Product = {
        id: 'prod_' + Math.random().toString(36).substr(2, 9),
        salonId,
        name: prodName,
        stock: parseInt(prodStock),
        price: parseFloat(prodPrice),
        cost: parseFloat(prodCost),
        costPrice: parseFloat(prodCost),
        commissionRate: parseFloat(prodCommissionRate) || 0
      };
      onUpdateProducts([...products, newProd]);
      setAlertState({message: "Produto registrado no estoque com êxito!", variant: 'success'});
    }
    resetForm();
  };

  const handleSaveClientObj = (e: React.FormEvent) => {
    e.preventDefault();
    setClientFormError(null);

    if (!clientName.trim() || !clientPhone.trim()) {
      setClientFormError("O preenchimento do Nome e do WhatsApp/Celular é obrigatório.");
      return;
    }

    // Strict validation: Required First and Last name
    const nameParts = clientName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setClientFormError("Por favor, digite o nome completo (sobrenome obrigatório, por exemplo: Mariana Costa, ou coloque um sobrenome fictício caso necessário).");
      return;
    }

    // Build optional birthday month-day format
    let birthStr = undefined;
    if (clientBirthDay && clientBirthMonth) {
      birthStr = `${clientBirthDay.padStart(2, '0')}/${clientBirthMonth.padStart(2, '0')}`;
    }

    const cleanedPhone = formatPhone(clientPhone);

    if (editingItemId) {
      const updatedList = clients.map(c => {
        if (c.id === editingItemId) {
          return {
            ...c,
            name: clientName,
            phone: cleanedPhone,
            email: clientEmail || undefined,
            birthDayMonth: birthStr
          };
        }
        return c;
      });
      onUpdateClients(updatedList);
      setAlertState({message: "Dados da cliente atualizados!", variant: 'success'});
    } else {
      const newClient: Client = {
        id: 'cl_' + Math.random().toString(36).substr(2, 9),
        salonId,
        name: clientName,
        phone: cleanedPhone,
        email: clientEmail || undefined,
        birthDayMonth: birthStr,
        fidelityPoints: 0
      };
      onUpdateClients([...clients, newClient]);
      setAlertState({message: "Nova cliente cadastrada!", variant: 'success'});
    }
    resetForm();
  };

  const handleSaveCardAcquirer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acqName) {
      setAlertState({message: "Por favor, preencha o nome da administradora.", variant: 'info'});
      return;
    }

    if (editingItemId) {
      // Update existing
      const updated = cardAcquirers.map(acq => {
        if (acq.id === editingItemId) {
          return {
            ...acq,
            name: acqName,
            isActive: acqActive,
            rules: acqRules
          };
        }
        return acq;
      });
      if (onUpdateCardAcquirers) {
        onUpdateCardAcquirers(updated);
        setAlertState({message: "Administradora de cartão atualizada!", variant: 'success'});
      }
    } else {
      // Create new
      const newAcq: CardAcquirer = {
        id: 'acq_' + Math.random().toString(36).substr(2, 9),
        salonId,
        name: acqName,
        isActive: acqActive,
        rules: acqRules.length > 0 ? acqRules : [...defaultFeeRulesTemplates]
      };
      if (onUpdateCardAcquirers) {
        onUpdateCardAcquirers([...cardAcquirers, newAcq]);
        setAlertState({message: "Nova administradora cadastrada!", variant: 'success'});
      }
    }
    resetForm();
  };

  const resetForm = () => {
    setShowFormModal(false);
    setEditingItemId(null);
    
    setProfName('');
    setProfPhone('');
    setProfComm('30');
    setProfPass('1234');
    setProfActive(true);
    setProfRole('profissional');
    setProfSpecialties([]);
    setCollapsedCategories({});

    setServName('');
    setServCat('Cabelo');
    setServPrice('');
    setServDuration('45');
    setServActive(true);

    setProdName('');
    setProdStock('10');
    setProdPrice('');
    setProdCost('');
    setProdCommissionRate('0');

    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientBirthDay('');
    setClientBirthMonth('');
    setClientFormError(null);

    setAcqName('');
    setAcqActive(true);
    setAcqRules([]);
  };

  const handleDeleteProfessional = (id: string) => {
    const item = professionals.find(p => p.id === id);
    if (item) {
      setDeleteConfirm({ id, type: 'profissionais', name: item.name });
    }
  };

  const handleDeleteService = (id: string) => {
    const item = services.find(s => s.id === id);
    if (item) {
      setDeleteConfirm({ id, type: 'servicos', name: item.name });
    }
  };

  const handleDeleteProduct = (id: string) => {
    const item = products.find(p => p.id === id);
    if (item) {
      setDeleteConfirm({ id, type: 'produtos', name: item.name });
    }
  };

  const handleDeleteClient = (id: string) => {
    const item = clients.find(c => c.id === id);
    if (item) {
      setDeleteConfirm({ id, type: 'clientes', name: item.name });
    }
  };

  const executeDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    if (type === 'profissionais') {
      onUpdateProfessionals(professionals.filter(p => p.id !== id));
    } else if (type === 'servicos') {
      onUpdateServices(services.filter(s => s.id !== id));
    } else if (type === 'produtos') {
      onUpdateProducts(products.filter(p => p.id !== id));
    } else if (type === 'clientes') {
      // PD-19: impedir exclusão de cliente com comandas, agendamentos ou financeiros vinculados
      const allComandas = loadComandas(salonId);
      const openComanda = allComandas.find(c => c.clientId === id && c.status !== 'Concluido');
      if (openComanda) {
        setDeleteConfirm(null);
        setAlertState({ message: `Não é possível excluir o cliente: existe comanda em aberto (${openComanda.ticketNumber}). Conclua ou exclua a comanda antes.`, variant: 'error' });
        return;
      }
      const activeAppointment = loadAppointments(salonId).find(a => a.clientId === id);
      if (activeAppointment) {
        setDeleteConfirm(null);
        setAlertState({ message: `Não é possível excluir o cliente: existe agendamento ativo (${activeAppointment.date} ${activeAppointment.time}). Cancele ou remova o agendamento antes.`, variant: 'error' });
        return;
      }
      const clientComandaIds = new Set(allComandas.filter(c => c.clientId === id).map(c => c.id));
      const linkedFinance = loadFinancials(salonId).find(f => f.relatedComandaId && clientComandaIds.has(f.relatedComandaId));
      if (linkedFinance) {
        setDeleteConfirm(null);
        setAlertState({ message: `Não é possível excluir o cliente: existe registro financeiro vinculado. Quite ou remova o lançamento antes.`, variant: 'error' });
        return;
      }
      onUpdateClients(clients.filter(c => c.id !== id));
    } else if (type === 'cartoes') {
      if (onUpdateCardAcquirers) {
        onUpdateCardAcquirers(cardAcquirers.filter(a => a.id !== id));
      }
    }
    setDeleteConfirm(null);
  };

  const handleCreateCategoryAndRevalidate = (categoryName: string) => {
    if (!categoryName) return;
    const trimmed = categoryName.trim();
    if (!trimmed) return;

    // 1. Create the new service category
    if (onUpdateServiceCategories) {
      const alreadyExists = serviceCategories.some(sc => sc.name.toLowerCase() === trimmed.toLowerCase());
      if (!alreadyExists) {
        const newSC: ServiceCategory = {
          id: 'sc_' + Math.random().toString(36).substr(2, 9),
          salonId,
          name: trimmed
        };
        onUpdateServiceCategories([...serviceCategories, newSC]);
      }
    }

    // 2. Revalidate and activate all services under this category
    const updatedServices = services.map(s => {
      if (s.category.trim().toLowerCase() === trimmed.toLowerCase()) {
        return { ...s, isActive: true };
      }
      return s;
    });

    onUpdateServices(updatedServices);

    setAlertState({message: `Sucesso! A categoria "${trimmed}" foi registrada oficialmente e todos os procedimentos correspondentes foram validados e ativados.`, variant: 'success'});
  };

  const toggleSpecialty = (serviceId: string) => {
    if (profSpecialties.includes(serviceId)) {
      setProfSpecialties(profSpecialties.filter(id => id !== serviceId));
    } else {
      setProfSpecialties([...profSpecialties, serviceId]);
    }
  };

  const handleSelectAllSpecialties = () => {
    setProfSpecialties(services.map(s => s.id));
  };

  const handleClearAllSpecialties = () => {
    setProfSpecialties([]);
  };

  // Helper to download files
  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. SERVICES
  const handleDownloadServicesTemplate = () => {
    const csvContent = "Nome do Procedimento;Categoria;Preço;Tempo em Minuto\n" +
      "Corte Moicano Masculino;Cabelo;55,00;35\n" +
      "Escova Progressiva;Cabelo;180,00;120\n" +
      "Manicure e Pedicure;Unhas;65,00;60\n" +
      "Limpeza Facial Premium;Estética;150,00;45\n" +
      "Drenagem Linfática;Estética Inválida (Apenas teste);110,00;50";
    downloadCSV("modelo_servicos.csv", csvContent);
  };

  const handleImportServicesCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          setAlertState({message: "O arquivo CSV está vazio ou contém apenas o cabeçalho.", variant: 'error'});
          return;
        }

        const header = lines[0];
        const separator = header.includes(';') ? ';' : ',';

        const importedServices: Service[] = [];
        let inactivesCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = line.split(separator);
          if (cols.length < 2) continue; // Must have at least Nome and Categoria

          const name = cols[0]?.replace(/^["']|["']$/g, '').trim();
          const category = cols[1]?.replace(/^["']|["']$/g, '').trim();
          const priceStr = cols[2]?.replace(/^["']|["']$/g, '').trim() || '0';
          const durationStr = cols[3]?.replace(/^["']|["']$/g, '').trim() || '30';

          if (!name) continue;

          const price = parseFloat(priceStr.replace(',', '.')) || 0;
          const duration = parseInt(durationStr) || 0;

          // Check if category is valid (case-insensitive check)
          const matchedCategoryIdx = availableCategories.findIndex(ac => ac.trim().toLowerCase() === (category || '').trim().toLowerCase());
          
          let resolvedCat = category || 'Outros';
          let isActive = true;

          if (matchedCategoryIdx !== -1) {
            resolvedCat = availableCategories[matchedCategoryIdx]; // preserve exact syntax from salon database
          } else {
            // invalid category: stays inactive, with warning mark
            isActive = false;
            inactivesCount++;
          }

          importedServices.push({
            id: 'serv_csv_' + Math.random().toString(36).substr(2, 9),
            salonId,
            name,
            category: resolvedCat,
            price,
            durationMin: duration,
            isActive
          });
        }

        if (importedServices.length === 0) {
          setAlertState({message: "Nenhum serviço válido identificado. Certifique-se de que a planilha possui dados do procedimento e preço.", variant: 'error'});
          return;
        }

        onUpdateServices([...services, ...importedServices]);
        if (inactivesCount > 0) {
          setAlertState({message: `Importado com sucesso! ${importedServices.length} serviços inseridos. Atenção: ${inactivesCount} serviços foram cadastrados como INATIVOS e com aviso de "Requer Ajuste" por conterem categorias não regulamentadas neste salão.`, variant: 'info'});
        } else {
          setAlertState({message: `Sucesso! ${importedServices.length} serviços do salão importados e ativados com sucesso.`, variant: 'success'});
        }
      } catch (err) {
        console.error(err);
        setAlertState({message: "Falha na formatação do arquivo CSV. Verifique o cabeçalho e tente novamente.", variant: 'error'});
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleExportServicesCSV = () => {
    let csvContent = "Nome do Procedimento;Categoria;Preço;Tempo em Minuto;Ativo\n";
    services.forEach(s => {
      const activeStr = s.isActive !== false ? "Sim" : "Não";
      csvContent += `"${s.name.replace(/"/g, '""')}";"${s.category.replace(/"/g, '""')}";${s.price.toString().replace('.', ',')};${s.durationMin};${activeStr}\n`;
    });
    downloadCSV(`servicos_exportados.csv`, csvContent);
  };


  // 2. PRODUCTS
  const handleDownloadProductsTemplate = () => {
    const csvContent = "Nome do Produto;Estoque;Custo;Preco de Venda;Comissao\n" +
      "Shampoo Profissional Argan 1L;12;24,50;59,90;10\n" +
      "Máscara Hidratação Intensa 500g;8;18,00;39,90;5\n" +
      "Gel Fixador Forte;20;8,50;19,90;0\n" +
      "Oleo de Cuticula Hidratante;15;6,00;12,00;8";
    downloadCSV("modelo_produtos.csv", csvContent);
  };

  const handleImportProductsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          setAlertState({message: "O arquivo CSV está vazio ou contém apenas o cabeçalho.", variant: 'error'});
          return;
        }

        const header = lines[0];
        const separator = header.includes(';') ? ';' : ',';

        const importedProducts: Product[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = line.split(separator);
          if (cols.length < 1) continue;

          const name = cols[0]?.replace(/^["']|["']$/g, '').trim();
          const stockStr = cols[1]?.replace(/^["']|["']$/g, '').trim() || '0';
          const costStr = cols[2]?.replace(/^["']|["']$/g, '').trim() || '0';
          const priceStr = cols[3]?.replace(/^["']|["']$/g, '').trim() || '0';
          const commStr = cols[4]?.replace(/^["']|["']$/g, '').trim() || '0';

          if (!name) continue;

          const stock = parseInt(stockStr) || 0;
          const cost = parseFloat(costStr.replace(',', '.')) || 0;
          const price = parseFloat(priceStr.replace(',', '.')) || 0;
          const commissionRate = parseFloat(commStr.replace('%', '').replace(',', '.')) || 0;

          importedProducts.push({
            id: 'prod_csv_' + Math.random().toString(36).substr(2, 9),
            salonId,
            name,
            stock,
            cost,
            costPrice: cost,
            price,
            commissionRate
          });
        }

        if (importedProducts.length === 0) {
          setAlertState({message: "Nenhum produto válido cadastrado no arquivo CSV.", variant: 'error'});
          return;
        }

        onUpdateProducts([...products, ...importedProducts]);
        setAlertState({message: `Sucesso! ${importedProducts.length} produtos importados para o estoque com êxito.`, variant: 'success'});
      } catch (err) {
        console.error(err);
        setAlertState({message: "Ocorreu um erro ao decodificar a planilha de produtos. Verifique o padrão e tente novamente.", variant: 'error'});
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleExportProductsCSV = () => {
    let csvContent = "Nome do Produto;Estoque;Custo;Preco de Venda;Comissao\n";
    products.forEach(p => {
      const costVal = p.costPrice !== undefined ? p.costPrice : p.cost;
      const commVal = p.commissionRate !== undefined ? p.commissionRate : 0;
      csvContent += `"${p.name.replace(/"/g, '""')}";${p.stock};${costVal.toString().replace('.', ',')};${p.price.toString().replace('.', ',')};${commVal.toString().replace('.', ',')}\n`;
    });
    downloadCSV(`produtos_exportados.csv`, csvContent);
  };


  // 3. CLIENTS
  const handleDownloadClientsTemplate = () => {
    const csvContent = "Nome e Sobrenome;Telefone;Email;Data de Nascimento\n" +
      "Gabriela Santos Ferreira;(11) 99888-7711;gabriela@exemplo.com;14/06/1988\n" +
      "Beatriz Silveira Nunes;(21) 97777-6622;beatriz@webmail.com;12/03\n" +
      "Fernanda Costa Lima;(19) 98888-5544;;30/11/1995\n" +
      "Carla Souza;(31) 99222-3344;carla.souza@gmail.com;04/01";
    downloadCSV("modelo_clientes.csv", csvContent);
  };

  const handleImportClientsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          setAlertState({message: "O arquivo CSV está vazio ou contém apenas o cabeçalho.", variant: 'error'});
          return;
        }

        const header = lines[0];
        const separator = header.includes(';') ? ';' : ',';

        const importedClients: Client[] = [];
        let errorLines = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = line.split(separator);
          if (cols.length < 2) {
            errorLines++;
            continue;
          }

          const rawName = cols[0]?.replace(/^["']|["']$/g, '').trim() || '';
          const rawPhone = cols[1]?.replace(/^["']|["']$/g, '').trim() || '';
          const rawEmail = cols[2]?.replace(/^["']|["']$/g, '').trim() || '';
          const rawBirth = cols[3]?.replace(/^["']|["']$/g, '').trim() || '';

          // Field checking: Name + Sobrenome and phone
          const nameParts = rawName.split(/\s+/);
          const cleanedPhone = formatPhone(rawPhone);

          if (!rawName || nameParts.length < 2 || !cleanedPhone) {
            errorLines++;
            continue; // Skip entries missing Name + Sobrenome or phone
          }

          // Birthday Month-Day parser
          let birthStr: string | undefined = undefined;
          if (rawBirth) {
            const birthParts = rawBirth.split(/[-/]/);
            if (birthParts.length >= 2) {
              const d = birthParts[0].trim().padStart(2, '0');
              const m = birthParts[1].trim().padStart(2, '0');
              birthStr = `${d}/${m}`;
            }
          }

          importedClients.push({
            id: 'cl_csv_' + Math.random().toString(36).substr(2, 9),
            salonId,
            name: rawName,
            phone: cleanedPhone,
            email: rawEmail || undefined,
            birthDayMonth: birthStr,
            fidelityPoints: 0
          });
        }

        if (importedClients.length === 0) {
          setAlertState({message: "Nenhum cliente válido importado. Certifique-se de preencher Nome Completo e Telefone Corretos.", variant: 'error'});
          return;
        }

        onUpdateClients([...clients, ...importedClients]);
        if (errorLines > 0) {
          setAlertState({message: `Importado com sucesso! ${importedClients.length} novos clientes inseridos na base de dados. ${errorLines} linhas foram descartadas por não conterem [Nome Completo (Mínimo nome + sobrenome)] ou [Telefone válido].`, variant: 'info'});
        } else {
          setAlertState({message: `Sucesso! ${importedClients.length} clientes importados perfeitamente.`, variant: 'success'});
        }
      } catch (err) {
        console.error(err);
        setAlertState({message: "Desculpe, ocorreu uma falha ao ler a base de dados de clientes do CSV.", variant: 'error'});
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleExportClientsCSV = () => {
    let csvContent = "Nome e Sobrenome;Telefone;Email;Data de Nascimento\n";
    clients.forEach(c => {
      const birthVal = c.birthDayMonth || '';
      csvContent += `"${c.name.replace(/"/g, '""')}";"${c.phone}";"${(c.email || '').replace(/"/g, '""')}";"${birthVal}"\n`;
    });
    downloadCSV(`clientes_exportados.csv`, csvContent);
  };

  return (
    <div className="space-y-6">
      
      {/* Top catalog selection subcategories */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-white border border-gray-200/65 rounded-xl shadow-sm gap-4">
        <div className="flex gap-2">
          {[
            { id: 'profissionais', label: 'Colaboradores', icon: Users },
            { id: 'servicos', label: 'Serviços do Salão', icon: Scissors },
            { id: 'produtos', label: 'Produtos e Estoque', icon: Tag },
            { id: 'clientes', label: 'Clientes', icon: Sparkles },
            { id: 'cartoes', label: 'Taxas de Cartão', icon: CreditCard }
          ].map(spec => {
            const IconComp = spec.icon;
            return (
              <button
                key={spec.id}
                onClick={() => {
                  setActiveCatalog(spec.id as any);
                  setShowFormModal(false);
                }}
                className={`text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition cursor-pointer ${
                  activeCatalog === spec.id 
                    ? 'bg-black text-white' 
                    : 'bg-[#FCF9F2] text-stone-600 hover:bg-stone-100 border border-stone-200/50'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{spec.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isReadOnly) return;
              setEditingItemId(null);
              if (activeCatalog === 'cartoes') {
                setAcqName('');
                setAcqActive(true);
                setAcqRules([...defaultFeeRulesTemplates]);
              }
              setShowFormModal(true);
            }}
            className={"bg-black hover:bg-gold-500 text-white font-bold text-xs py-2 px-5 rounded-full flex items-center gap-1.5 transition cursor-pointer" + (isReadOnly ? " opacity-50" : "")}
            title={isReadOnly ? TOOLTIP_READONLY : undefined}
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo</span>
          </button>
        </div>
      </div>

      {/* Import/Export Card (rendered for editable collections: services, products, clients) */}
      {activeCatalog !== 'profissionais' && activeCatalog !== 'cartoes' && (
        <div className="bg-[#FCF9F2]/30 border border-stone-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h3 className="font-serif font-black text-stone-900 text-sm flex items-center gap-1.5 uppercase tracking-wider">
                <Upload className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>Planilhas: {activeCatalog === 'servicos' ? 'Serviços' : activeCatalog === 'produtos' ? 'Produtos & Estoque' : 'Clientes'}</span>
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Atualize sua base de dados em massa com arquivos CSV Excel-compatíveis com segurança e rapidez.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Export Button */}
              <button
                type="button"
                onClick={
                  activeCatalog === 'servicos' ? handleExportServicesCSV :
                  activeCatalog === 'produtos' ? handleExportProductsCSV :
                  handleExportClientsCSV
                }
                className="bg-white hover:bg-stone-50 text-stone-800 border border-stone-250 py-1.5 px-4 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>Exportar Base (.CSV)</span>
              </button>

              {/* Template Download Button */}
              <button
                type="button"
                onClick={
                  activeCatalog === 'servicos' ? handleDownloadServicesTemplate :
                  activeCatalog === 'produtos' ? handleDownloadProductsTemplate :
                  handleDownloadClientsTemplate
                }
                className="bg-stone-900 hover:bg-stone-850 text-white py-1.5 px-4 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-gold-400" />
                <span>Baixar Modelo Planilha</span>
              </button>

              {/* Import Button */}
              <label
                className={"bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-4 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs" + (isReadOnly ? " opacity-50" : "")}
                title={isReadOnly ? TOOLTIP_READONLY : undefined}
                onClick={(e) => { if (isReadOnly) e.preventDefault(); }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Planilha (.CSV)</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={
                    activeCatalog === 'servicos' ? handleImportServicesCSV :
                    activeCatalog === 'produtos' ? handleImportProductsCSV :
                    handleImportClientsCSV
                  }
                />
              </label>

              {/* Destructive Clear All Services Button */}
              {activeCatalog === 'servicos' && services.length > 0 && (
                <button
                  type="button"
                  onClick={() => { if (isReadOnly) return; setShowClearAllConfirm(true); }}
                  className={"bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 py-1.5 px-4 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs" + (isReadOnly ? " opacity-50" : "")}
                  title={isReadOnly ? TOOLTIP_READONLY : undefined}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Apagar Todos os Serviços ({services.length})</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
            <div className="p-3 bg-white rounded-lg border border-stone-150 space-y-1 shadow-2xs">
              <span className="font-bold text-stone-850 block">📋 Regras de Formato:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-stone-500 font-sans">
                {activeCatalog === 'servicos' && (
                  <>
                    <li>Separador suportado: Semicolo (<code className="font-bold text-stone-800">;</code>) ou Vírgula (<code className="font-bold text-stone-800">,</code>)</li>
                    <li>Preços vazios ou zerados serão salvos como <code className="font-bold text-stone-800">0</code></li>
                    <li>Sistemas de vírgula decimal (<code className="font-bold text-stone-800">15,50</code>) são autodetectados</li>
                  </>
                )}
                {activeCatalog === 'produtos' && (
                  <>
                    <li>Aceita valores de custo e venda zerados (<code className="font-bold text-stone-800">0</code>)</li>
                    <li>Comissão pode ser número ou percentual (<code className="font-bold text-stone-800">10%</code> ou <code className="font-bold text-stone-800">10</code>)</li>
                    <li>Atualiza o estoque com as quantidades especificadas</li>
                  </>
                )}
                {activeCatalog === 'clientes' && (
                  <>
                    <li>Nome e Sobrenome completo são <code className="font-bold text-rose-600">obrigatórios</code></li>
                    <li>O Telefone Celular Whatsapp é <code className="font-bold text-rose-600">obrigatório</code></li>
                    <li>O E-mail e a Data de nascimento são opcionais</li>
                  </>
                )}
              </ul>
            </div>

            <div className="p-3 bg-white rounded-lg border border-stone-150 space-y-1 shadow-2xs">
              <span className="font-bold text-stone-850 block">🔍 Colunas do Modelo (Ordem exata):</span>
              <p className="font-mono bg-stone-50 p-1.5 rounded text-[10px] text-stone-600 border border-stone-100 break-normal">
                {activeCatalog === 'servicos' && "Nome do Procedimento; Categoria; Preço; Tempo em Minuto"}
                {activeCatalog === 'produtos' && "Nome do Produto; Estoque; Custo; Preço de Venda; Comissão"}
                {activeCatalog === 'clientes' && "Nome e Sobrenome; Telefone; Email; Data de Nascimento"}
              </p>
              <span className="text-stone-400 text-[9.5px] block">O sistema detecta e ignora a linha de cabeçalho automaticamente.</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-stone-150 space-y-1 shadow-2xs">
              <span className="font-bold text-stone-850 block">⚠️ Validação:</span>
              {activeCatalog === 'servicos' && (
                <p className="text-stone-500 leading-normal">
                  Se a categoria importada não coincidir com as cadastradas no salão, o procedimento será criado como <span className="font-bold text-red-600">Inativo</span> e receberá uma marcação visual <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-900 border border-amber-200 px-1 rounded text-[9px] font-bold"><AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> Requer Ajuste</span> para correção manual.
                </p>
              )}
              {activeCatalog === 'produtos' && (
                <p className="text-stone-500 leading-normal">
                  Valores vazios de estoque e custos serão preenchidos como zero no catálogo. A taxa de porcentagem correspondente ao comissionamento do produto atualizará os repasses automáticos do painel.
                </p>
              )}
              {activeCatalog === 'clientes' && (
                <p className="text-stone-500 leading-normal">
                  Linhas incompletas de clientes (sem sobrenome ou sem celular) serão ignoradas no log de importação. A data de nascimento no modelo aceita ano ou apenas dia/mês (ex: 28/05/1994 ou 28/05).
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE DATABASE LIST */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* PROFESSIONALS TAB */}
        {activeCatalog === 'profissionais' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-stone-400 font-bold uppercase tracking-widest text-[11px]">
                  <th className="px-8 py-4">Nome do Colaborador</th>
                  <th className="px-8 py-4">Telefone (Login da Área)</th>
                  <th className="px-8 py-4 text-center">Comissão Repassada</th>
                  <th className="px-8 py-4 text-center">Senha Inicial</th>
                  <th className="px-8 py-4 text-center">Status</th>
                  <th className="px-8 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-105 text-stone-700">
                {professionals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 italic">Nenhum colaborador cadastrado.</td>
                  </tr>
                ) : (
                  professionals.map(p => (
                    <tr key={p.id} className="hover:bg-gold-50/15">
                      <td className="px-8 py-4 font-bold text-gray-950 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center uppercase text-[10px]">
                          {p.name.substring(0, 2)}
                        </div>
                        <div>
                          <span className="block font-bold">{p.name}</span>
                          <span className={`inline-block text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold border mt-0.5 ${
                            p.role === 'administrador'
                              ? 'text-rose-700 bg-rose-50 border-rose-250'
                              : 'text-sky-700 bg-sky-50 border-sky-250'
                          }`}>
                            {p.role === 'administrador' ? 'Administrador' : 'Profissional'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4 font-mono text-stone-600 font-bold">{p.phone}</td>
                      <td className="px-8 py-4 text-center text-gold-500 font-black text-sm">{p.commissionRate}%</td>
                      <td className="px-8 py-4 text-center font-mono text-stone-400">{p.password || '1234'}</td>
                      <td className="px-8 py-4 text-center">
                        <button
                          onClick={() => {
                            const wasActive = p.isActive !== false;
                            const isCurrentlyAdmin = p.role === 'administrador';
                            if (!wasActive) {
                              if (isCurrentlyAdmin) {
                                const activeAdminsCount = professionals.filter(prof => prof.isActive !== false && prof.role === 'administrador' && prof.id !== p.id).length;
                                const limitAdmins = maxAdmins || 2;
                                if (activeAdminsCount >= limitAdmins) {
                                  setAlertState({message: `Não foi possível ativar! Limite de administradores atingido. Seu plano contratado permite no máximo ${limitAdmins} administradores ativos. Caso necessite de mais, por favor abra um ticket de suporte para alteração do seu plano.`, variant: 'error'});
                                  return;
                                }
                              } else {
                                const activeProfsCount = professionals.filter(prof => prof.isActive !== false && prof.role !== 'administrador' && prof.id !== p.id).length;
                                const limitProfs = maxProfessionals || 5;
                                if (activeProfsCount >= limitProfs) {
                                  setAlertState({message: `Não foi possível ativar! Limite de profissionais atingido. Seu plano contratado permite no máximo ${limitProfs} profissionais ativos. Caso necessite de mais, por favor abra um ticket de suporte para alteração do seu plano.`, variant: 'error'});
                                  return;
                                }
                              }
                            }
                            const updated = professionals.map(prof => prof.id === p.id ? { ...prof, isActive: !wasActive } : prof);
                            onUpdateProfessionals(updated);
                            setAlertState({message: `${p.name} foi ${!wasActive ? 'ativado' : 'desativado'} com sucesso!`, variant: 'success'});
                          }}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer font-sans transition-all inline-block ${
                            p.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-250'
                              : 'bg-stone-100 text-stone-500 border border-stone-300 hover:bg-stone-150'
                          }`}
                        >
                          {p.isActive !== false ? '● Ativo' : '○ Inativo'}
                        </button>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { if (isReadOnly) return; handleStartEdit(p, 'profissionais'); }}
                            className={"bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg py-1 px-2.5 border border-stone-250 transition cursor-pointer flex items-center gap-1 font-bold" + (isReadOnly ? " opacity-50" : "")}
                            title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => { if (isReadOnly) return; handleDeleteProfessional(p.id); }}
                            className={"p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition border border-rose-200 cursor-pointer" + (isReadOnly ? " opacity-50" : "")}
                            title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SERVICES LIST TAB */}
        {activeCatalog === 'servicos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
               <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-stone-400 font-bold uppercase tracking-widest text-[11px]">
                  <th className="px-8 py-4">Nome do Serviço</th>
                  <th className="px-8 py-4">Categoria</th>
                  <th className="px-8 py-4">Tempo Estimado (Minutos)</th>
                  <th className="px-8 py-4 text-right font-sans">Preço de Tabela</th>
                  <th className="px-8 py-4 text-center">Status</th>
                  <th className="px-8 py-4 text-right font-sans">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-stone-700">
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 italic font-sans">Nenhum serviço disponível.</td>
                  </tr>
                ) : (
                  services.map(s => (
                    <tr key={s.id} className="hover:bg-gold-50/15">
                      <td className="px-8 py-4 font-bold text-gray-950 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${s.isActive !== false ? 'bg-gold-400' : 'bg-stone-300'}`} />
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 flex-wrap">
                            {s.name}
                            {!availableCategories.some(ac => ac.trim().toLowerCase() === s.category.trim().toLowerCase()) && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-805 text-[9.5px] px-1.5 py-0.5 rounded border border-amber-250 font-black font-sans animate-pulse" title="Categoria fornecida não cadastrada! Edite este procedimento para corrigir.">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Requer Ajuste</span>
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4 font-medium text-stone-500">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{s.category}</span>
                          {!availableCategories.some(ac => ac.trim().toLowerCase() === s.category.trim().toLowerCase()) && (
                            <button
                              type="button"
                              onClick={() => handleCreateCategoryAndRevalidate(s.category)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-sans text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-xs border border-amber-600 whitespace-nowrap animate-pulse hover:animate-none"
                              title={`Cadastrar a nova categoria "${s.category}" e revalidar/ativar todos os serviços desta categoria de forma instantânea.`}
                            >
                              <Plus className="w-2.5 h-2.5 text-white" />
                              <span>Cadastrar categoria</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-4 font-mono">{s.durationMin} min</td>
                      <td className="px-8 py-4 text-right font-bold text-stone-900">{formatCurrency(s.price)}</td>
                      <td className="px-8 py-4 text-center">
                        <button
                          onClick={() => {
                            const wasActive = s.isActive !== false;
                            const updated = services.map(ser => ser.id === s.id ? { ...ser, isActive: !wasActive } : ser);
                            onUpdateServices(updated);
                            setAlertState({message: `Serviço "${s.name}" marcado como ${!wasActive ? 'Ativo' : 'Inativo'}!`, variant: 'success'});
                          }}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer font-sans transition-all inline-block ${
                            s.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-250'
                              : 'bg-stone-100 text-stone-500 border border-stone-300 hover:bg-stone-150'
                          }`}
                        >
                          {s.isActive !== false ? '● Ativo' : '○ Inativo'}
                        </button>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { if (isReadOnly) return; handleStartEdit(s, 'servicos'); }}
                            className={"bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg py-1 px-2.5 border border-stone-250 transition cursor-pointer flex items-center gap-1 font-bold" + (isReadOnly ? " opacity-50" : "")}
                            title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => { if (isReadOnly) return; handleDeleteService(s.id); }}
                            className={"p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition cursor-pointer font-bold" + (isReadOnly ? " opacity-50" : "")}
                            title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PRODUCTS LIST TAB */}
        {activeCatalog === 'produtos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-stone-400 font-bold uppercase tracking-widest text-[11px]">
                  <th className="px-8 py-4">Produto</th>
                  <th className="px-8 py-4 text-center">Quantidade no Estoque</th>
                  <th className="px-8 py-4 text-right font-sans">Custo de Aquisição</th>
                  <th className="px-8 py-4 text-center font-sans">Comissão (%)</th>
                  <th className="px-8 py-4 text-right font-sans">Preço de Venda</th>
                  <th className="px-8 py-4 text-right font-sans">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-stone-700">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 italic">Nenhum produto em estoque.</td>
                  </tr>
                ) : (
                  products.map(p => {
                    const lowStock = p.stock < 10;
                    return (
                      <tr key={p.id} className="hover:bg-gold-50/15">
                        <td className="px-8 py-4 font-bold text-gray-950">{p.name}</td>
                        <td className="px-8 py-4 text-center font-mono">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-bold ${lowStock ? 'bg-rose-50 text-rose-700' : 'bg-green-50 text-green-700'}`}>
                            {p.stock} unidades {lowStock ? '• Repor!' : ''}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right font-mono text-stone-500">{formatCurrency(p.costPrice !== undefined ? p.costPrice : p.cost)}</td>
                        <td className="px-8 py-4 text-center font-mono font-bold text-amber-700">{p.commissionRate !== undefined ? `${p.commissionRate}%` : '0%'}</td>
                        <td className="px-8 py-4 text-right font-bold text-stone-900">{formatCurrency(p.price)}</td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { if (isReadOnly) return; handleStartEdit(p, 'produtos'); }}
                            className={"bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg py-1 px-2.5 border border-stone-250 transition cursor-pointer flex items-center gap-1 font-bold" + (isReadOnly ? " opacity-50" : "")}
                            title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => { if (isReadOnly) return; handleDeleteProduct(p.id); }}
                            className={"p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition cursor-pointer" + (isReadOnly ? " opacity-50" : "")}
                            title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          >
                            Excluir
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
        )}

        {/* CLIENTS LIST TAB */}
        {activeCatalog === 'clientes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-stone-400 font-bold uppercase tracking-widest text-[11px]">
                  <th className="px-8 py-4 font-sans">Nome do Cliente</th>
                  <th className="px-8 py-4 font-sans">Celular WhatsApp</th>
                  <th className="px-8 py-4 font-sans">Aniversário</th>
                  <th className="px-8 py-4 font-sans">E-mail</th>
                  <th className="px-8 py-4 text-center font-sans">Pontos Fidelidade</th>
                  <th className="px-8 py-4 text-right font-sans">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-stone-700">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 italic font-sans">Nenhum cliente cadastrado.</td>
                  </tr>
                ) : (
                  clients.map(c => (
                    <tr key={c.id} className="hover:bg-gold-50/15">
                      <td className="px-8 py-4 font-bold text-gray-950 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-[9px] uppercase font-bold font-sans">
                          {c.name.substring(0, 2)}
                        </div>
                        <span>{c.name}</span>
                      </td>
                      <td className="px-8 py-4 font-mono font-bold text-stone-700">{c.phone}</td>
                      <td className="px-8 py-4 text-stone-600 font-mono font-bold">{c.birthDayMonth || 'Não informado'}</td>
                      <td className="px-8 py-4 text-stone-400 font-mono text-[11px]">{c.email || 'N/A'}</td>
                      <td className="px-8 py-4 text-center font-mono">
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 font-bold px-2.5 py-1 rounded-full text-[10px]">
                          ⭐ {c.fidelityPoints} pts
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { if (isReadOnly) return; handleStartEdit(c, 'clientes'); }}
                            className={"bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg py-1 px-2.5 border border-stone-250 transition cursor-pointer flex items-center gap-1 font-bold" + (isReadOnly ? " opacity-50" : "")}
                            title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => { if (isReadOnly) return; handleDeleteClient(c.id); }}
                            className={"p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition border border-rose-200 cursor-pointer" + (isReadOnly ? " opacity-50" : "")}
                            title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CARDS LIST TAB */}
        {activeCatalog === 'cartoes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-stone-400 font-bold uppercase tracking-widest text-[11px]">
                  <th className="px-8 py-4">Credenciadora / Administradora</th>
                  <th className="px-8 py-4 text-center">Status</th>
                  <th className="px-8 py-4">Taxas Ativas (Débito)</th>
                  <th className="px-8 py-4">Taxas Ativas (Crédito)</th>
                  <th className="px-8 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cardAcquirers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-sm text-stone-400 font-mono">
                      Nenhuma administradora de cartão cadastrada. Clique em "Cadastrar Novo +" para inserir.
                    </td>
                  </tr>
                ) : (
                  cardAcquirers.map(acq => {
                    const debitRules = acq.rules.filter(r => r.operation === 'debito');
                    const creditRules = acq.rules.filter(r => r.operation === 'credito');
                    return (
                      <tr key={acq.id} className="hover:bg-slate-50">
                        <td className="px-8 py-4 font-bold text-stone-900 text-sm">
                          {acq.name}
                        </td>
                        <td className="px-8 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${acq.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {acq.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {debitRules.length === 0 ? <span className="text-stone-400">Sem taxas</span> : debitRules.map((r, idx) => (
                              <span key={idx} className="bg-blue-50 text-blue-800 border border-blue-150 px-2 py-0.5 rounded font-mono text-[10px]">
                                {r.brand}: {r.rate}%
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {creditRules.length === 0 ? <span className="text-stone-400">Sem taxas</span> : creditRules.map((r, idx) => (
                              <span key={idx} className="bg-purple-50 text-purple-800 border border-purple-150 px-2 py-0.5 rounded font-mono text-[10px]">
                                {r.brand} {r.installments}x: {r.rate}%
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { if (isReadOnly) return; handleStartEdit(acq, 'cartoes'); }}
                            className={"bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg py-1 px-2.5 border border-stone-250 transition cursor-pointer flex items-center gap-1 font-bold" + (isReadOnly ? " opacity-50" : "")}
                            title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => { if (isReadOnly) return; setDeleteConfirm({ id: acq.id, type: 'cartoes', name: acq.name }); }}
                            className={"p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition border border-rose-200 cursor-pointer" + (isReadOnly ? " opacity-50" : "")}
                            title={isReadOnly ? TOOLTIP_READONLY : undefined}
                          >
                            Remover
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
        )}

      </div>

      {/* FLOAT MODAL FOR ADDING/EDITING DIRECT ITEMS */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in animate-ease-in-out">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-gold-200 overflow-hidden animate-scale-up">
            
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-[#FCF9F2]">
              <h3 className="font-serif font-bold text-stone-800 text-sm uppercase tracking-wide">
                {editingItemId ? 'Atualizar' : 'Inserir'} {activeCatalog === 'profissionais' ? 'Colaborador' : activeCatalog === 'servicos' ? 'Serviço' : activeCatalog === 'produtos' ? 'Produto' : activeCatalog === 'clientes' ? 'Cliente' : 'Administradora de Cartões'}
              </h3>
              <button 
                onClick={resetForm}
                className="text-stone-400 hover:text-stone-880 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* PROFESSIONAL FORM */}
            {activeCatalog === 'profissionais' && (
              <form onSubmit={handleSaveProfessional} className="p-6 space-y-4 text-xs font-sans overflow-y-auto flex-1">
                
                {/* Visual Limit Indicator */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-2 text-stone-800">
                  <div className="flex justify-between items-center text-[11px] font-bold font-sans">
                    <span>Profissionais Ativos:</span>
                    <span className="font-bold font-mono text-xs">
                      {currentActiveProfsCount} / {limitProfs}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentActiveProfsCount >= limitProfs ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min((currentActiveProfsCount / limitProfs) * 100, 100)}%` }}
                    />
                  </div>
                  
                  {/* Administradores limit indicator */}
                  <div className="flex justify-between items-center text-[11px] font-bold font-sans pt-1">
                    <span>Administradores Ativos:</span>
                    <span className="font-bold font-mono text-xs">
                      {currentActiveAdminsCount} / {limitAdmins}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentActiveAdminsCount >= limitAdmins ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min((currentActiveAdminsCount / limitAdmins) * 100, 100)}%` }}
                    />
                  </div>

                  {/* Warn if limit is reached or exceeded and we are trying to add a new active one or save an active one */}
                  <div className="text-[10px] text-stone-550 leading-relaxed pt-1.5 border-t border-amber-200">
                    💡 <span className="font-bold">Regra de Plano:</span> Caso necessite de mais colaboradores ativos do que o limite permitido do seu plano (${limitProfs} profissionais e ${limitAdmins} administradores), por favor <span className="text-amber-800 font-bold underline">abra um ticket de suporte</span> para alteração de plano.
                  </div>

                  {profActive && ((profRole === 'administrador' && otherActiveAdminsCount >= limitAdmins) || (profRole !== 'administrador' && otherActiveProfsCount >= limitProfs)) && (
                    <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-rose-850 font-sans mt-2 text-[10px]">
                       <span className="font-bold text-[11px] text-rose-700 block mb-0.5">⚠️ Limite de {profRole === 'administrador' ? 'Administradores' : 'Profissionais'} Ativos Atingido!</span>
                       Não foi possível salvar este colaborador como <span className="font-bold">Ativo</span>. Mude o status para <span className="font-bold">Inativo</span> para salvar com sucesso, ou abra um ticket de suporte para obter mais vagas.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wide">Nome Completo do Colaborador</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none text-stone-850 font-bold"
                    placeholder="ex: Amanda Oliveira"
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wide">Celular / Whats (Login)</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none"
                      placeholder="ex: (11) 98888-7777"
                      value={profPhone}
                      onChange={(e) => setProfPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-stone-455 font-bold mb-1 uppercase tracking-wide">% de comissão padrão</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-bold"
                      placeholder="ex: 35"
                      value={profComm}
                      onChange={(e) => setProfComm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wide">Tipo / Cargo</label>
                    <select
                      value={profRole}
                      onChange={(e) => setProfRole(e.target.value as any)}
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-bold text-stone-850"
                    >
                      <option value="profissional">Profissional</option>
                      <option value="administrador">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wide">Status</label>
                    <select
                      value={profActive ? "Sim" : "Não"}
                      onChange={(e) => setProfActive(e.target.value === "Sim")}
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-bold"
                    >
                      <option value="Sim">Ativo</option>
                      <option value="Não">Inativo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wide">Senha de Login</label>
                    <input
                      type="password"
                      required
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-mono font-bold"
                      value={profPass}
                      onChange={(e) => setProfPass(e.target.value)}
                    />
                  </div>
                </div>

                {/* Multiple Specialties Checkbox selection */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                    <span className="font-bold text-stone-800 uppercase tracking-wide">Serviços que pode Realizar</span>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={handleSelectAllSpecialties}
                        className="text-[10px] text-zinc-900 border border-stone-300 bg-white px-2 py-0.5 rounded font-bold"
                      >
                        Todos
                      </button>
                      <button 
                        type="button" 
                        onClick={handleClearAllSpecialties}
                        className="text-[10px] text-rose-600 border border-stone-300 bg-white px-2 py-0.5 rounded font-bold"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {services.length === 0 ? (
                    <p className="text-stone-400 italic text-center py-2">Cadastre serviços antes de vinculá-los aos profissionais!</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto pr-1 space-y-2.5">
                      {Object.entries(
                        services.reduce((acc, s) => {
                          const cat = s.category ? s.category.trim() : 'Outros';
                          if (!acc[cat]) acc[cat] = [];
                          acc[cat].push(s);
                          return acc;
                        }, {} as Record<string, typeof services>)
                      ).map(([category, catServices]) => {
                        const isCollapsed = collapsedCategories[category] !== false;
                        const checkedInCat = catServices.filter(s => profSpecialties.includes(s.id));
                        const allSelected = checkedInCat.length === catServices.length;

                        const toggleCategorySpecialties = (e: React.MouseEvent) => {
                          e.stopPropagation(); // Avoid collapsing when clicking the toggle button
                          const serviceIds = catServices.map(s => s.id);
                          if (allSelected) {
                            // Deselect all services under this category
                            setProfSpecialties(prev => prev.filter(id => !serviceIds.includes(id)));
                          } else {
                            // Select all services under this category
                            setProfSpecialties(prev => {
                              const unique = new Set([...prev, ...serviceIds]);
                              return Array.from(unique);
                            });
                          }
                        };

                        const toggleCollapse = () => {
                          setCollapsedCategories(prev => ({
                            ...prev,
                            [category]: prev[category] === false ? true : false
                          }));
                        };

                        return (
                          <div key={category} className="border border-stone-200 rounded-lg overflow-hidden bg-white shadow-xs">
                            {/* Category Header */}
                            <div 
                              onClick={toggleCollapse}
                              className="flex items-center justify-between px-3 py-2 bg-stone-100 hover:bg-stone-150 cursor-pointer select-none border-b border-stone-200 transition-all"
                            >
                              <div className="flex items-center gap-1.5">
                                {isCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                                )}
                                <span className="font-sans font-extrabold text-[10px] text-stone-700 uppercase tracking-widest">
                                  📁 {category}
                                </span>
                                <span className="text-[9px] text-[#a0854c] bg-[#FCF9F2] border border-[#ecdcb9] px-2 py-0.5 rounded-full font-mono font-bold">
                                  {checkedInCat.length} / {catServices.length}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={toggleCategorySpecialties}
                                className={`text-[9px] px-2 py-1 rounded-md font-bold transition shadow-xs cursor-pointer border ${
                                  allSelected
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                                    : 'bg-[#FCF9F2] text-[#a0854c] hover:bg-[#F3EFE3] border-[#ecdcb9]'
                                }`}
                              >
                                {allSelected ? 'Remover Todos' : 'Selecionar Todos'}
                              </button>
                            </div>

                            {/* Accordion Content */}
                            {!isCollapsed && (
                              <div className="p-2 bg-stone-50 grid grid-cols-2 gap-1.5 transition-all">
                                {catServices.map(s => {
                                  const checked = profSpecialties.includes(s.id);
                                  return (
                                    <div 
                                      key={s.id} 
                                      onClick={() => toggleSpecialty(s.id)}
                                      className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition cursor-pointer select-none ${
                                        checked 
                                          ? 'bg-[#FCF9F2] border-[#a0854c] text-stone-900 shadow-3xs' 
                                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                                      }`}
                                    >
                                      {checked ? (
                                        <CheckSquare className="w-4 h-4 text-zinc-950 flex-shrink-0" />
                                      ) : (
                                        <Square className="w-4 h-4 text-stone-400 flex-shrink-0" />
                                      )}
                                      <span className="font-sans text-[11px] font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={s.name}>
                                        {s.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isReadOnly}
                  className={"w-full bg-black hover:bg-gold-500 text-white font-bold py-3.5 px-4 rounded-full transition cursor-pointer font-sans" + (isReadOnly ? " opacity-50" : "")}
                  title={isReadOnly ? TOOLTIP_READONLY : undefined}
                >
                  Salvar Cadastro do Profissional
                </button>
              </form>
            )}

            {/* SERVICES FORM */}
            {activeCatalog === 'servicos' && (
              <form onSubmit={handleSaveService} className="p-6 space-y-4 text-xs font-sans overflow-y-auto flex-1">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">Nome do Procedimento</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-bold"
                    placeholder="ex: Hidratação de Caviar"
                    value={servName}
                    onChange={(e) => setServName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-bold mb-1">Categoria</label>
                  <select
                    value={servCat}
                    onChange={(e) => setServCat(e.target.value)}
                    className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none"
                  >
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-400 font-bold mb-1">Preço de Tabela (R$)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none text-stone-900 font-bold"
                      placeholder="ex: 120.00"
                      value={servPrice}
                      onChange={(e) => setServPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 font-bold mb-1">Tempo Estimado (Minutos)</label>
                    <input
                      type="number"
                      required
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none"
                      placeholder="ex: 60"
                      value={servDuration}
                      onChange={(e) => setServDuration(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-400 font-bold mb-1">Procedimento Ativo no Salão?</label>
                  <select
                    value={servActive ? "Sim" : "Não"}
                    onChange={(e) => setServActive(e.target.value === "Sim")}
                    className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-bold"
                  >
                    <option value="Sim">Sim, disponível para novos lançamentos</option>
                    <option value="Não">Não, temporariamente indisponível (Inativo)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isReadOnly}
                  className={"w-full bg-black hover:bg-gold-500 text-white font-bold py-3.5 px-4 rounded-full transition cursor-pointer" + (isReadOnly ? " opacity-50" : "")}
                  title={isReadOnly ? TOOLTIP_READONLY : undefined}
                >
                  Salvar Serviço no Catálogo
                </button>
              </form>
            )}

            {/* PRODUCT FORM */}
            {activeCatalog === 'produtos' && (
              <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs font-sans overflow-y-auto flex-1">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-bold"
                    placeholder="ex: Shampoo Loreal Absolut Repair 300ml"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-stone-400 font-bold mb-1">Unidades Estoque</label>
                    <input
                      type="number"
                      required
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 font-bold mb-1">Custo de Compra</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-bold text-rose-500"
                      placeholder="custo"
                      value={prodCost}
                      onChange={(e) => setProdCost(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 font-bold mb-1">Preço de Venda</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-bold text-green-700"
                      placeholder="venda"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 font-bold mb-1">Comissão Venda (%)</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-bold text-amber-700"
                      placeholder="comissão"
                      value={prodCommissionRate}
                      onChange={(e) => setProdCommissionRate(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isReadOnly}
                  className={"w-full bg-black hover:bg-gold-500 text-white font-bold py-3.5 px-4 rounded-full transition cursor-pointer" + (isReadOnly ? " opacity-50" : "")}
                  title={isReadOnly ? TOOLTIP_READONLY : undefined}
                >
                  Confirmar e Salvar Produto
                </button>
              </form>
            )}

            {/* CLIENT FORM */}
            {activeCatalog === 'clientes' && (
              <form onSubmit={handleSaveClientObj} className="p-6 space-y-4 text-xs font-sans overflow-y-auto flex-1">
                {clientFormError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs leading-relaxed flex items-start gap-2 shadow-xs">
                    <span className="text-sm">⚠️</span>
                    <div className="space-y-0.5">
                      <p className="font-bold text-red-950">Atenção ao Cadastrar:</p>
                      <p className="text-[11px] text-red-900 leading-normal font-medium">{clientFormError}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wide">Nome Completo (Nome + Sobrenome) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-bold text-stone-900"
                    placeholder="ex: Mariana Costa (Digite nome e sobrenome)"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wide">WhatsApp / Celular <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-mono font-black"
                      placeholder="ex: (11) 98888-8888"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wide">E-mail (Opcional)</label>
                    <input
                      type="email"
                      className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-sans"
                      placeholder="ex: mariana@gmail.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Optional Birthday month/day selector */}
                <div className="bg-[#FCF9F2] p-4 rounded-xl border border-stone-200 space-y-2">
                  <p className="font-bold text-stone-800 uppercase tracking-wide">Data de Nascimento (Opcional)</p>
                  <p className="text-[10px] text-stone-500">Usado para programar envios automáticos e descontos comemorativos.</p>
                  
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-stone-400 font-bold mb-0.5">Dia (01-31)</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        className="w-full text-xs p-2 bg-white rounded border border-gray-200 focus:outline-none"
                        placeholder="ex: 15"
                        value={clientBirthDay}
                        onChange={(e) => setClientBirthDay(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-stone-400 font-bold mb-0.5">Mês (01-12)</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        className="w-full text-xs p-2 bg-white rounded border border-gray-200 focus:outline-none"
                        placeholder="ex: 08"
                        value={clientBirthMonth}
                        onChange={(e) => setClientBirthMonth(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isReadOnly}
                  className={"w-full bg-black hover:bg-gold-500 text-white font-bold py-3.5 px-4 rounded-full transition cursor-pointer font-sans" + (isReadOnly ? " opacity-50" : "")}
                  title={isReadOnly ? TOOLTIP_READONLY : undefined}
                >
                  Confirmar Cadastro da Cliente
                </button>
              </form>
            )}

            {/* CARD ACQUIRER FORM */}
            {activeCatalog === 'cartoes' && (
              <form onSubmit={handleSaveCardAcquirer} className="p-6 space-y-4 text-xs font-sans overflow-y-auto flex-1">
                <div>
                  <label className="block text-stone-450 font-bold mb-1 uppercase tracking-wide">Nome da Administradora / Credenciadora <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none font-bold text-stone-900"
                    placeholder="ex: Stone, Cielo, Rede, PagSeguro"
                    value={acqName}
                    onChange={(e) => setAcqName(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="acq_active"
                    checked={acqActive}
                    onChange={(e) => setAcqActive(e.target.checked)}
                    className="w-4 h-4 text-gold-500 border-gray-300 rounded focus:ring-gold-400"
                  />
                  <label htmlFor="acq_active" className="text-stone-700 font-bold select-none cursor-pointer">
                    Administradora Ativa para Pagamentos
                  </label>
                </div>

                <div className="border-t border-gray-150 pt-3">
                  <h4 className="font-serif font-black text-xs uppercase tracking-wider text-stone-800 mb-2">Grade de Taxas por Bandeira e Parcelas (%)</h4>
                  <p className="text-[10px] text-stone-500 mb-4 leading-normal">
                    Preencha as taxas cobradas pela administradora. Use o ponto (.) para decimais (ex: 1.5 para 1,5%). Se a bandeira/operação não for aceita por este leitor, você pode preencher com zero.
                  </p>

                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-200 uppercase text-[10px] text-stone-500">
                          <th className="px-3 py-2 font-black">Bandeira</th>
                          <th className="px-3 py-2 font-black text-center text-blue-700">Débito A V.</th>
                          <th className="px-3 py-2 font-black text-center text-purple-700">Crédito 1x</th>
                          <th className="px-3 py-2 font-black text-center text-purple-700">Crédito 2x</th>
                          <th className="px-3 py-2 font-black text-center text-purple-700">Crédito 3x</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outros'].map(brand => {
                          const getRateObj = (oper: 'debito' | 'credito', inst: number) => {
                            const found = acqRules.find(r => r.brand === brand && r.operation === oper && r.installments === inst);
                            return found || { brand, operation: oper, installments: inst, rate: 0 };
                          };

                          const updateRateVal = (oper: 'debito' | 'credito', inst: number, newVal: string) => {
                            const valNum = parseFloat(newVal) || 0;
                            const idx = acqRules.findIndex(r => r.brand === brand && r.operation === oper && r.installments === inst);
                            const updated = [...acqRules];
                            if (idx > -1) {
                              updated[idx] = { ...updated[idx], rate: valNum };
                              setAcqRules(updated);
                            } else {
                              updated.push({ brand, operation: oper, installments: inst, rate: valNum });
                              setAcqRules(updated);
                            }
                          };

                          return (
                            <tr key={brand} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-bold text-stone-700">{brand}</td>
                              <td className="px-2 py-1.5 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  className="w-16 p-1 text-center font-mono font-bold bg-[#FCF9F2] border border-gray-200 rounded focus:border-gold-500 focus:outline-none"
                                  value={getRateObj('debito', 1).rate || ''}
                                  placeholder="0.00"
                                  onChange={(e) => updateRateVal('debito', 1, e.target.value)}
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  className="w-16 p-1 text-center font-mono font-bold bg-[#FCF9F2] border border-gray-200 rounded focus:border-gold-500 focus:outline-none"
                                  value={getRateObj('credito', 1).rate || ''}
                                  placeholder="0.00"
                                  onChange={(e) => updateRateVal('credito', 1, e.target.value)}
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  className="w-16 p-1 text-center font-mono font-bold bg-[#FCF9F2] border border-gray-200 rounded focus:border-gold-500 focus:outline-none"
                                  value={getRateObj('credito', 2).rate || ''}
                                  placeholder="0.00"
                                  onChange={(e) => updateRateVal('credito', 2, e.target.value)}
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  className="w-16 p-1 text-center font-mono font-bold bg-[#FCF9F2] border border-gray-200 rounded focus:border-gold-500 focus:outline-none"
                                  value={getRateObj('credito', 3).rate || ''}
                                  placeholder="0.00"
                                  onChange={(e) => updateRateVal('credito', 3, e.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isReadOnly}
                  className={"w-full bg-black hover:bg-gold-500 text-white font-bold py-3.5 px-4 rounded-full transition cursor-pointer font-sans" + (isReadOnly ? " opacity-50" : "")}
                  title={isReadOnly ? TOOLTIP_READONLY : undefined}
                >
                  {editingItemId ? 'Atualizar Administradora' : 'Salvar Nova Administradora'}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-stone-200 overflow-hidden transform scale-100 transition animate-scale-up p-6 space-y-4 font-sans text-[#1c1917]">
            <div className="flex items-center gap-2.5 text-rose-600 border-b border-stone-100 pb-3">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-serif font-black text-xs uppercase tracking-wider text-stone-900">Confirmar Exclusão</h4>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-stone-600">
              <p>
                Deseja realmente remover permanentemente o registro de <strong className="text-stone-900 font-bold">"{deleteConfirm.name}"</strong>?
              </p>
              <p className="bg-rose-50/50 p-2.5 rounded-lg text-rose-800 border border-rose-100/60 font-sans text-[11px]">
                Atenção: Essa ação é irreversível e excluirá as credenciais e configurações associadas de forma permanente.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-705 py-2 px-4 rounded-lg text-[11px] font-bold transition cursor-pointer border border-stone-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDeleteConfirm}
                className="bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <span>Deletar Registro</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETION ALL SERVICES MODAL */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-stone-200 overflow-hidden transform scale-100 transition animate-scale-up p-6 space-y-4 font-sans text-[#1c1917]">
            <div className="flex items-center gap-2.5 text-rose-600 border-b border-stone-100 pb-3">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-serif font-black text-xs uppercase tracking-wider text-stone-900">Apagar Todos os Serviços</h4>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-stone-600">
              <p>
                Atenção! Você está prestes a remover <strong className="text-stone-900 font-bold">TODOS os {services.length} serviços</strong> cadastrados no seu salão.
              </p>
              <p className="bg-rose-50/50 p-2.5 rounded-lg text-rose-800 border border-rose-100/60 font-sans text-[11px]">
                Essa ação excluirá permanentemente todo o catálogo de procedimentos para que você possa importar novamente a nova planilha do zero. Os agendamentos e comandas existentes não serão afetados.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(false)}
                className="bg-stone-100 hover:bg-stone-200 text-[#1c1917]-700 py-2 px-4 rounded-lg text-[11px] font-bold transition cursor-pointer border border-stone-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isReadOnly) return;
                  onUpdateServices([]);
                  setShowClearAllConfirm(false);
                  setAlertState({message: "Todos os serviços foram removidos com sucesso! Você já pode prosseguir com a importação da sua nova planilha.", variant: 'success'});
                }}
                className={"bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-sm" + (isReadOnly ? " opacity-50" : "")}
                title={isReadOnly ? TOOLTIP_READONLY : undefined}
              >
                <span>Sim, Apagar Tudo</span>
              </button>
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
