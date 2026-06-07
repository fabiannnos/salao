import React, { useState } from 'react';
import { Appointment, Client, Professional, Service } from '../types';
import { formatCurrency, formatPhone } from '../utils';
import { Calendar, Clock, Scissors, User, Video, Plus, Bell, Check, Trash2, CalendarDays, Search, X, Edit } from 'lucide-react';
import AlertModal from './AlertModal';

interface AgendamentosListProps {
  salonId: string;
  appointments: Appointment[];
  clients: Client[];
  professionals: Professional[];
  services: Service[];
  onAddAppointment: (appointment: Appointment) => void;
  onUpdateAppointment: (appointment: Appointment) => void;
  onConvertAppointmentToComanda: (app: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onUpdateClients?: (list: Client[]) => void;
}

export default function AgendamentosList({
  salonId,
  appointments,
  clients,
  professionals,
  services,
  onAddAppointment,
  onUpdateAppointment,
  onConvertAppointmentToComanda,
  onDeleteAppointment,
  onUpdateClients
}: AgendamentosListProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  // Search client state
  const [clientSearchText, setClientSearchText] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Quick Client Registration state
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [clientFormError, setClientFormError] = useState<string | null>(null);

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

    if (onUpdateClients) {
      onUpdateClients([...clients, newClientObj]);
    } else {
      clients.push(newClientObj);
    }

    setSelectedClient(newClientObj);
    setClientSearchText(newClientObj.name);
    setNewClientName('');
    setNewClientPhone('');
    setClientFormError(null);
    setShowNewClientForm(false);
  };

  // Service search autocomplete state
  const [serviceSearchText, setServiceSearchText] = useState('');
  const [showServiceSearchResults, setShowServiceSearchResults] = useState(false);

  // Professional state
  const [selectedProfessional, setSelectedProfessional] = useState('');
  
  // Multi-service booking state
  const [servicesToBook, setServicesToBook] = useState<Service[]>([]);
  const [currentServiceChoice, setCurrentServiceChoice] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState<number>(0);
  const [priceFocused, setPriceFocused] = useState(false);
  const [alertState, setAlertState] = useState<{message: string; variant?: 'info' | 'success' | 'error'} | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Date/Time
  const [apptDate, setApptDate] = useState(new Date().toISOString().split('T')[0]);
  const [apptTime, setApptTime] = useState('10:00');

  // Load appointment into edit mode
  const handleOpenEdit = (app: Appointment) => {
    setEditingAppt(app);
    // Find client
    const targetClient = clients.find(c => c.id === app.clientId);
    setSelectedClient(targetClient || {
      id: app.clientId,
      salonId,
      name: app.clientName,
      phone: app.clientPhone,
      fidelityPoints: 0
    });
    setClientSearchText(app.clientName);
    setApptDate(app.date);
    setApptTime(app.time);

    // Populate service list with linked professionals
    if (app.services && app.services.length > 0) {
      const matchServices = app.services.map(s => {
        const orig = services.find(o => o.id === s.id);
        const linkedProfId = (s as any).professionalId || app.professionalId;
        const linkedProfObj = professionals.find(p => p.id === linkedProfId);
        return {
          id: s.id,
          name: s.name,
          price: s.price,
          category: orig?.category || 'Outros',
          durationMin: orig?.durationMin || 30,
          isActive: orig?.isActive !== false,
          salonId: salonId,
          professionalId: linkedProfId,
          professionalName: linkedProfObj?.name || app.professionalName
        };
      });
      setServicesToBook(matchServices as any);
    } else {
      const single = services.find(orig => orig.id === app.serviceId);
      if (single) {
        setServicesToBook([{
          ...single,
          professionalId: app.professionalId,
          professionalName: app.professionalName
        } as any]);
      } else {
        setServicesToBook([]);
      }
    }
    
    setSelectedProfessional('');
    setCurrentServiceChoice('');
    setServiceSearchText('');
    setShowServiceSearchResults(false);
    setShowAddModal(true);
  };

  const handleOpenCreate = () => {
    setEditingAppt(null);
    setSelectedClient(null);
    setClientSearchText('');
    setSelectedProfessional('');
    setServicesToBook([]);
    setCurrentServiceChoice('');
    setCustomServicePrice(0);
    setServiceSearchText('');
    setShowServiceSearchResults(false);
    setApptDate(new Date().toISOString().split('T')[0]);
    setApptTime('10:00');
    setShowAddModal(true);
  };

  const handleAppendServiceChoice = () => {
    if (!currentServiceChoice) {
      setAlertState({message: "Por favor, selecione primeiro um serviço."});
      return;
    }
    if (!selectedProfessional) {
      setAlertState({message: "Por favor, selecione o profissional que executará o serviço."});
      return;
    }
    const servObj = services.find(s => s.id === currentServiceChoice);
    const profObj = professionals.find(p => p.id === selectedProfessional);
    
    if (servObj && profObj) {
      const duplicate = servicesToBook.some(s => s.id === servObj.id && (s as any).professionalId === profObj.id);
      if (duplicate) {
        setAlertState({message: "Este par (Serviço + Profissional) já foi adicionado."});
        return;
      }
      setServicesToBook([
        ...servicesToBook,
        {
          ...servObj,
          price: customServicePrice,
          professionalId: profObj.id,
          professionalName: profObj.name
        } as any
      ]);
      
      // Reset inputs to clean selections as explicitly requested
      setCurrentServiceChoice('');
      setServiceSearchText('');
      setSelectedProfessional('');
      setCustomServicePrice(0);
    }
  };

  const handleRemoveAppendedService = (idx: number) => {
    const next = [...servicesToBook];
    next.splice(idx, 1);
    setServicesToBook(next);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      setAlertState({message: "Por favor, pesquise e selecione uma cliente."});
      return;
    }

    // PD-16: serviço só entra no agendamento após clique explícito em "Adicionar".
    // Nenhuma auto-inclusão silenciosa é feita a partir de currentServiceChoice/selectedProfessional.
    const finalServices = [...servicesToBook];

    if (finalServices.length === 0) {
      setAlertState({message: "Por favor, adicione pelo menos um serviço (e seu profissional executor) clicando em 'Adicionar'."});
      return;
    }

    // Default primary professionalId / professionalName to the first item added
    const firstItem = finalServices[0] as any;
    const rootProfId = firstItem.professionalId;
    const rootProfName = firstItem.professionalName;

    const totalPrice = finalServices.reduce((sum, s) => sum + s.price, 0);

    const agendaServices = finalServices.map(s => ({
      id: s.id,
      name: s.name,
      price: s.price,
      professionalId: (s as any).professionalId,
      professionalName: (s as any).professionalName
    }));

    // PD-17: validar conflito de agenda para cada profissional envolvido
    for (const item of agendaServices) {
      if (!item.professionalId) continue;
      const conflict = appointments.find(a =>
        a.id !== editingAppt?.id &&
        a.date === apptDate &&
        a.time === apptTime &&
        a.status !== 'Cancelado' &&
        (a.professionalId === item.professionalId ||
          (a.services || []).some(s => (s as any).professionalId === item.professionalId))
      );
      if (conflict) {
        setAlertState({
          message: `Conflito de agenda: o profissional ${item.professionalName || ''} já possui agendamento em ${apptDate} às ${apptTime} (cliente: ${conflict.clientName}). Escolha outro horário ou outro profissional.`,
          variant: 'error'
        });
        return;
      }
    }

    if (editingAppt) {
      // Perform Update
      const updated: Appointment = {
        ...editingAppt,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        professionalId: rootProfId,
        professionalName: rootProfName,
        serviceId: finalServices[0].id,
        serviceName: finalServices[0].name,
        services: agendaServices,
        price: totalPrice,
        date: apptDate,
        time: apptTime
      };
      onUpdateAppointment(updated);
      setAlertState({message: "Agendamento atualizado com sucesso!", variant: 'success'});
    } else {
      // Perform Create
      const newApp: Appointment = {
        id: 'app_' + Math.random().toString(36).substr(2, 9),
        salonId,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        professionalId: rootProfId,
        professionalName: rootProfName,
        serviceId: finalServices[0].id,
        serviceName: finalServices[0].name,
        services: agendaServices,
        date: apptDate,
        time: apptTime,
        status: 'Confirmado',
        price: totalPrice
      };
      onAddAppointment(newApp);
      setAlertState({message: "Novo agendamento confirmado!", variant: 'success'});
    }

    setShowAddModal(false);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearchText.toLowerCase()) ||
    c.phone.includes(clientSearchText)
  );

  // Filter professionals that allow executing chosen services OR general filtering.
  // "No profissional criar algo em que eu possa selecionar os serviços aos quais o mesmo pode executar..."
  const activeProfOptions = professionals.filter(p => {
    if (p.isActive === false) {
      return false;
    }
    if (!p.specialties || p.specialties.length === 0) {
      // If none selected, they cannot perform any as requested: "caso ele não tenha nenhum selecionado ele nem aparece"
      return false;
    }
    // If a service is currently selected under "item 2", filter professionals who are qualified
    if (currentServiceChoice) {
      return p.specialties.includes(currentServiceChoice);
    }
    // General fallback for services already in the pending booking
    if (servicesToBook.length > 0) {
      return servicesToBook.every(bookedServ => p.specialties?.includes(bookedServ.id));
    }
    return true;
  });

  // Filter services that can be executed by the selected professional if some professional is chosen first
  const activeServiceOptions = services.filter(s => {
    if (selectedProfessional) {
      const prof = professionals.find(p => p.id === selectedProfessional);
      return prof?.specialties?.includes(s.id) ?? false;
    }
    return true;
  });

  const isSearchValid = serviceSearchText.trim().length >= 2;
  const filteredServices = isSearchValid
    ? activeServiceOptions.filter(s =>
        s.name.toLowerCase().includes(serviceSearchText.toLowerCase())
      )
    : [];

  const groupedFilteredServices = filteredServices.reduce((acc, s) => {
    const cat = s.category ? s.category.trim() : 'Outros';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, typeof services>);

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedFilteredServices).sort((a, b) => a.localeCompare(b));
  // Sort services within each category alphabetically
  sortedCategories.forEach(cat => {
    groupedFilteredServices[cat].sort((a, b) => a.name.localeCompare(b.name));
  });

  return (
    <div className="space-y-6">
      
      {/* Upper header action block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gold-200/40">
        <div>
          <h2 className="text-xl font-serif font-bold text-gray-950">Agendas e Horários</h2>
          <p className="text-xs text-stone-500 mt-1">Gerencie a fila de agendamentos e converta reservas para comandas instantaneamente.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-black hover:bg-gold-500 text-white font-sans font-bold text-xs py-3 px-5 rounded-full shadow transition-all cursor-pointer"
        >
          <CalendarDays className="w-4 h-4 text-gold-300" />
          <span>Agendar Horário</span>
        </button>
      </div>

      {/* Grid containing list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {appointments.length === 0 ? (
          <div className="md:col-span-3 text-center py-16 bg-white rounded-xl border border-gray-150 p-6 flex flex-col items-center justify-center">
            <Calendar className="w-12 h-12 text-stone-300 mb-2" />
            <p className="text-sm font-bold text-stone-700">A agenda está vazia para hoje.</p>
            <p className="text-xs text-stone-400 mt-1">Clique para agendar sua primeira cliente.</p>
          </div>
        ) : (
          appointments.map(app => {
            const dateFormatted = app.date.split('-').reverse().join('/');
            const displayServices = app.services && app.services.length > 0 ? app.services : [{ name: app.serviceName, price: app.price }];

            return (
              <div key={app.id} className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-stone-50 text-stone-800 border border-stone-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                      <span>{app.time} • {dateFormatted}</span>
                    </span>
                    <span className="text-xs font-black text-slate-800 font-sans">{formatCurrency(app.price)}</span>
                  </div>

                  <h3 className="font-sans font-bold text-[#1c1c18] text-sm mb-1">{app.clientName}</h3>
                  <p className="text-[11px] text-stone-450 mb-4">{app.clientPhone}</p>

                  <div className="space-y-2 pt-3 border-t border-dashed border-stone-150">
                    <div className="space-y-1">
                      {displayServices.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-stone-600">
                          <Scissors className="w-3.5 h-3.5 text-gold-500" />
                          <span className="font-semibold text-stone-700">{s.name} ({formatCurrency(s.price)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2.5">
                  <button
                    onClick={() => {
                      onConvertAppointmentToComanda(app);
                      setAlertState({message: `Agendamento de ${app.clientName} convertido em Comanda Ativa!`, variant: 'success'});
                    }}
                    className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xs py-2 rounded-lg border border-green-200 transition text-center cursor-pointer font-sans text-[11px]"
                  >
                    Gerar Comanda
                  </button>
                  
                  <button
                    onClick={() => handleOpenEdit(app)}
                    className="p-2 border border-stone-200 hover:bg-stone-50 text-stone-500 hover:text-stone-700 rounded-lg transition"
                    title="Editar agendamento"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setConfirmDeleteId(app.id);
                    }}
                    className="p-2 border border-rose-100 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: ADD / EDIT APPOINTMENT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gold-200 overflow-hidden animate-scale-up">
            
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-[#FCF9F2]">
              <h3 className="font-serif font-bold text-stone-800 text-sm uppercase tracking-wide">
                {editingAppt ? "Editar Agendamento" : "Pesquisar e Agendar Horário"}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-850 p-1 text-sm font-sans font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs font-sans">
              
              {/* Client Autocomplete Search Panel */}
              <div className="relative">
                <label className="block text-stone-500 font-bold mb-1 uppercase tracking-wide">1. Buscar Cliente (Nome ou Telefone)</label>
                {showNewClientForm ? (
                  <div className="space-y-3 bg-[#FCF9F2] p-4 rounded-lg border border-gold-200">
                    {clientFormError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-lg text-[11px] leading-relaxed flex items-start gap-1.5 font-sans">
                        <span className="text-sm">⚠️</span>
                        <div>{clientFormError}</div>
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[11px] font-bold text-stone-850">Cadastro de Cliente Rápido (Nome + Sobrenome)</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewClientForm(false);
                          setClientFormError(null);
                        }}
                        className="text-[10px] text-rose-500 underline font-bold"
                      >
                        Cancelar
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          required
                          className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded focus:outline-none text-stone-900"
                          placeholder="ex: Mariana Costa"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded focus:outline-none text-stone-900"
                          placeholder="WhatsApp Celular"
                          value={newClientPhone}
                          onChange={(e) => setNewClientPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateNewClient}
                      className="w-full bg-black text-white py-2 rounded font-bold hover:bg-gold-800 transition text-[11px]"
                    >
                      Cadastrar Cliente
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
                      <input
                        type="text"
                        className="w-full pl-9 pr-4 py-2.5 bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg focus:border-gold-500 focus:outline-none"
                        placeholder="Digite para buscar..."
                        value={clientSearchText}
                        onChange={(e) => {
                          setClientSearchText(e.target.value);
                          setShowSearchResults(true);
                        }}
                        onFocus={() => setShowSearchResults(true)}
                      />
                      {selectedClient && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClient(null);
                            setClientSearchText('');
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 font-bold p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown Suggestions */}
                    {showSearchResults && clientSearchText && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                        {filteredClients.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedClient(c);
                              setClientSearchText(c.name);
                              setShowSearchResults(false);
                            }}
                            className="p-2.5 font-sans border-b border-stone-50 text-xs hover:bg-[#FCF9F2] cursor-pointer flex justify-between items-center"
                          >
                            <span className="font-bold text-stone-850 text-left">{c.name}</span>
                            <span className="text-stone-400 font-mono text-[10px]">{c.phone}</span>
                          </div>
                        ))}
                        <div
                          onClick={() => {
                            setShowNewClientForm(true);
                            setNewClientName(clientSearchText);
                            setShowSearchResults(false);
                          }}
                          className="p-2.5 font-sans text-xs text-blue-600 hover:bg-[#FCF9F2] cursor-pointer font-bold border-t border-stone-100 flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Não encontrou? Cadastrar novo cliente "{clientSearchText}"</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedClient && !showNewClientForm && (
                  <div className="mt-2 text-[11px] bg-stone-50 border border-stone-200 rounded p-2 text-stone-700">
                    Sendo agendada: <strong>{selectedClient.name}</strong> ({selectedClient.phone})
                  </div>
                )}
              </div>

              {/* Multi-service selection step 2 */}
              <div className="bg-[#FCF9F2] p-4 rounded-xl border border-gold-100 space-y-3">
                <div className="relative">
                  <label className="block text-stone-600 font-bold mb-1 uppercase tracking-wide">
                    2. Escolher o Serviço (Pesquise por Nome ou Categoria)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-9 py-2.5 bg-white text-xs border border-gray-200 rounded-lg focus:border-gold-500 focus:outline-none placeholder-stone-400 font-sans"
                      placeholder="Busque por 'unha', 'cabelo' ou min. 2 letras"
                      value={serviceSearchText}
                      onChange={(e) => {
                        setServiceSearchText(e.target.value);
                        setShowServiceSearchResults(true);
                      }}
                      onFocus={() => setShowServiceSearchResults(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                    />
                    {(currentServiceChoice || serviceSearchText) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentServiceChoice('');
                          setServiceSearchText('');
                          setShowServiceSearchResults(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 font-bold p-1 hover:bg-stone-100 rounded transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Suggestions */}
                  {showServiceSearchResults && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 divide-y divide-stone-100">
                      {!isSearchValid ? (
                        <div className="p-3 text-stone-400 text-center italic text-[11px] font-sans">
                          Digite pelo menos 2 caracteres para carregar os serviços...
                        </div>
                      ) : filteredServices.length === 0 ? (
                        <div className="p-3 text-stone-550 text-center italic text-[11px]">
                          Nenhum serviço correspondente para "{serviceSearchText}"
                        </div>
                      ) : (
                        sortedCategories.map(cat => (
                          <div key={cat} className="p-1 bg-stone-50/40">
                            {/* Category block title */}
                            <div className="px-2 py-1 font-sans font-extrabold text-[9px] text-[#a0854c] uppercase tracking-wider bg-stone-100/90 rounded border border-stone-200/45 text-left">
                              📁 {cat}
                            </div>
                            <div className="mt-1 space-y-0.5">
                              {groupedFilteredServices[cat].map(s => (
                                <div
                                  key={s.id}
                                  onClick={() => {
                                    setCurrentServiceChoice(s.id);
                                    setServiceSearchText(s.name);
                                    setCustomServicePrice(s.price);
                                    setShowServiceSearchResults(false);
                                  }}
                                  className="p-2 font-sans rounded hover:bg-[#FCF9F2] cursor-pointer flex justify-between items-center transition"
                                >
                                  <span className="font-bold text-stone-850 text-xs text-left truncate max-w-[70%]">{s.name}</span>
                                  <span className="text-stone-500 font-mono text-[10.5px] font-bold shrink-0">{formatCurrency(s.price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {currentServiceChoice && (
                    <div className="mt-2 text-[10.5px] bg-[#FCF9F2] border border-[#ecdcb9] rounded p-2 text-stone-850 space-y-1.5">
                      <div className="text-left">
                        Serviço selecionado: <strong className="text-stone-900">{services.find(s => s.id === currentServiceChoice)?.name}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[9px] text-stone-500 font-bold uppercase tracking-wide">Valor:</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={priceFocused ? customServicePrice : customServicePrice.toFixed(2).replace('.', ',')}
                          onChange={(e) => setCustomServicePrice(parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')) || 0)}
                          onFocus={() => setPriceFocused(true)}
                          onBlur={() => {
                            setPriceFocused(false);
                            setCustomServicePrice(Math.round(customServicePrice * 100) / 100);
                          }}
                          className="w-24 bg-white border border-[#ecdcb9] px-2 py-0.5 rounded font-mono font-bold text-xs text-stone-900 text-right focus:outline-none focus:border-[#a0854c]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Professional options step 3 */}
                <div>
                  <label className="block text-stone-600 font-bold mb-1 uppercase tracking-wide">
                    3. Escolher o Profissional
                  </label>
                  <select
                    value={selectedProfessional}
                    onChange={(e) => setSelectedProfessional(e.target.value)}
                    className="w-full bg-white text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none"
                  >
                    <option value="">-- Selecione --</option>
                    {activeProfOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                    ))}
                  </select>
                  {activeProfOptions.length === 0 && currentServiceChoice && (
                    <p className="mt-1 text-[10px] text-rose-500 italic">
                      Nenhum colaborador possui as especialidades para realizar este procedimento!
                    </p>
                  )}
                </div>

                {/* Confirm/Add button Below Item 3 */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAppendServiceChoice}
                    className="w-full h-10 flex items-center justify-center gap-1.5 bg-black hover:bg-gold-500 text-white font-sans font-bold text-xs rounded-lg shadow-xs transition-all focus:outline-none cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-gold-300" />
                    <span>Adicionar Serviço & Colaborador</span>
                  </button>
                </div>

                {/* List of currently booked services is BELOW Item 3 now */}
                {servicesToBook.length > 0 && (
                  <div className="space-y-1.5 bg-white p-3 rounded-lg border border-stone-200 mt-2 text-xs">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      Serviços adicionados neste horário:
                    </p>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {servicesToBook.map((s, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-stone-50 last:border-none">
                          <div>
                            <span className="font-semibold text-stone-800">{s.name}</span>
                            <span className="text-[9px] text-stone-400 block font-sans">Colaborador: {(s as any).professionalName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-stone-700">{formatCurrency(s.price)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAppendedService(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-1.5 flex justify-between font-bold text-stone-900 text-xs border-t border-stone-100 mt-2">
                      <span>Total Acumulado:</span>
                      <span className="font-mono text-gold-600">{formatCurrency(servicesToBook.reduce((sum, s) => sum + s.price, 0))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Date/Time Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#a0854c] font-bold mb-1 font-sans">Data</label>
                  <input
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0854c] font-bold mb-1 font-sans">Horário</label>
                  <input
                    type="time"
                    required
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full bg-[#FCF9F2] text-xs border border-gray-200 rounded-lg p-2.5 focus:border-gold-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-black hover:bg-gold-500 text-white font-bold py-3.5 px-4 rounded-full transition cursor-pointer text-xs uppercase scroll-py-2 hover:shadow"
              >
                {editingAppt ? "Salvar Alterações do Agendamento" : "Confirmar e agendar"}
              </button>
            </form>

          </div>
        </div>
      )}

      <AlertModal
        open={!!alertState}
        message={alertState?.message || ''}
        variant={alertState?.variant || 'info'}
        onClose={() => setAlertState(null)}
      />

      {/* PD-18: modal de confirmação para exclusão de agendamento */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-rose-200 overflow-hidden animate-scale-up p-6 space-y-4 font-sans text-[#1c1917]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-serif font-black text-xs uppercase tracking-wider text-stone-900">
                  Confirmar Exclusão
                </h4>
                <p className="text-xs leading-relaxed text-stone-600 mt-2">
                  Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 py-2 px-4 rounded-lg text-[11px] font-bold cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteId) {
                    onDeleteAppointment(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 rounded-lg text-[11px] font-bold cursor-pointer transition"
              >
                Excluir Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
