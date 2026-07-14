import { Salon, Professional, Service, Product, Client, Comanda, FinancialRecord, Appointment, ChartAccountGroup, ServiceCategory } from './types';

export const initialSalons: Salon[] = [
  {
    id: "salon_eclat",
    name: "Modello Salon",
    cnpj: "19.426.534/0001-02",
    phone: "(11) 99999-9999",
    email: "financeiro@modellosalon.com.br",
    password: "1234",
    city: "São Paulo",
    maxProfessionals: 5,
    maxAdmins: 2,
    expirationDate: "2026-12-31",
    isActive: true,
    planValue: 120,
    commissionAccrualRule: 'caixa'
  }
];

export const initialProfessionals: Professional[] = [
  // L'Éclat Salon
  {
    id: "prof_juliana",
    salonId: "salon_eclat",
    name: "Julianna Ricci (Sênior)",
    phone: "(11) 98111-1111",
    password: "1234",
    commissionRate: 40,
    isActive: true,
    category: "Cabelo",
    specialties: ["serv_corte_fem", "serv_escova_hidra", "serv_coloracao_raiz", "serv_mechas"],
    role: "profissional"
  },
  {
    id: "prof_marcos",
    salonId: "salon_eclat",
    name: "Marcos Viana (Master)",
    phone: "(11) 98222-2222",
    password: "1234",
    commissionRate: 50,
    isActive: true,
    category: "Cabelo",
    specialties: ["serv_corte_fem", "serv_escova_hidra", "serv_coloracao_raiz", "serv_mechas"],
    role: "profissional"
  },
  {
    id: "prof_anapaula",
    salonId: "salon_eclat",
    name: "Ana Paula (Esteticista)",
    phone: "(11) 98333-3333",
    password: "1234",
    commissionRate: 40,
    isActive: true,
    category: "Estética",
    specialties: ["serv_design_sob"],
    role: "profissional"
  },
  {
    id: "prof_alessandra",
    salonId: "salon_eclat",
    name: "Alessandra Barros",
    phone: "(11) 98444-4444",
    password: "1234",
    commissionRate: 50,
    isActive: true,
    category: "Unhas",
    specialties: ["serv_manicure_fran"],
    role: "profissional"
  },
  {
    id: "prof_paula",
    salonId: "salon_eclat",
    name: "Paula Lima (Admin)",
    phone: "(11) 98888-7777",
    password: "1234",
    commissionRate: 50,
    isActive: true,
    category: "Cabelo",
    specialties: ["serv_corte_fem", "serv_escova_hidra"],
    role: "administrador"
  },

  // Recife/PE — Colaboradores restaurados (Migração 2026)
  {
    id: "prof_sandrinha",
    salonId: "salon_eclat",
    name: "Sandrinha",
    phone: "81997149793",
    password: "1234",
    commissionRate: 40,
    isActive: true,
    category: "Cabelo",
    role: "profissional"
  },
  {
    id: "prof_alcilene",
    salonId: "salon_eclat",
    name: "Alcilene",
    phone: "81984353655",
    password: "1234",
    commissionRate: 50,
    isActive: true,
    category: "Cabelo",
    role: "profissional"
  },
  {
    id: "prof_ana_holanda",
    salonId: "salon_eclat",
    name: "Ana Holanda",
    phone: "81986495706",
    password: "1234",
    commissionRate: 55,
    isActive: true,
    category: "Cabelo",
    role: "profissional"
  },
  {
    id: "prof_loura",
    salonId: "salon_eclat",
    name: "Loura",
    phone: "81987387274",
    password: "1234",
    commissionRate: 0,
    isActive: true,
    category: "Cabelo",
    role: "profissional"
  },
  {
    id: "prof_maria_eduarda",
    salonId: "salon_eclat",
    name: "Maria Eduarda",
    phone: "81981180975",
    password: "1234",
    commissionRate: 50,
    isActive: true,
    category: "Cabelo",
    role: "profissional"
  },
  {
    id: "prof_maria_luiza",
    salonId: "salon_eclat",
    name: "Maria Luiza",
    phone: "81997875738",
    password: "1234",
    commissionRate: 50,
    isActive: true,
    category: "Cabelo",
    role: "profissional"
  },
  {
    id: "prof_elza_salviano",
    salonId: "salon_eclat",
    name: "Elza Salviano",
    phone: "81987387343",
    password: "1234",
    commissionRate: 50,
    isActive: true,
    category: "Cabelo",
    role: "profissional"
  },
  {
    id: "prof_deda",
    salonId: "salon_eclat",
    name: "Deda",
    phone: "81987969423",
    password: "1234",
    commissionRate: 50,
    isActive: true,
    category: "Cabelo",
    role: "profissional"
  },

  // Maison de Beauté
  {
    id: "prof_anasilva",
    salonId: "salon_maison",
    name: "Ana Silva",
    phone: "(21) 97111-1111",
    password: "1234",
    commissionRate: 40,
    isActive: true,
    category: "Cabelo",
    specialties: ["serv_corte_premium", "serv_coloracao_global", "serv_escova_caviar"],
    role: "profissional"
  },
  {
    id: "prof_clara",
    salonId: "salon_maison",
    name: "Clara Guedes (Admin)",
    phone: "(21) 97222-2222",
    password: "1234",
    commissionRate: 40,
    isActive: true,
    category: "Unhas",
    specialties: ["serv_manicure_simples"],
    role: "administrador"
  }
];

export const initialServices: Service[] = [
  // L'Éclat Salon
  {
    id: "serv_corte_fem",
    salonId: "salon_eclat",
    name: "Corte Moderno Feminino",
    category: "Cabelo",
    price: 180.00,
    durationMin: 45
  },
  {
    id: "serv_escova_hidra",
    salonId: "salon_eclat",
    name: "Escova & Hidratação Modello",
    category: "Cabelo",
    price: 240.00,
    durationMin: 60
  },
  {
    id: "serv_coloracao_raiz",
    salonId: "salon_eclat",
    name: "Coloração Raiz",
    category: "Cabelo",
    price: 210.00,
    durationMin: 90
  },
  {
    id: "serv_manicure_fran",
    salonId: "salon_eclat",
    name: "Manicure Francesa",
    category: "Unhas",
    price: 85.00,
    durationMin: 30
  },
  {
    id: "serv_design_sob",
    salonId: "salon_eclat",
    name: "Design de Sobrancelha",
    category: "Estética",
    price: 65.00,
    durationMin: 20
  },
  {
    id: "serv_mechas",
    salonId: "salon_eclat",
    name: "Mechas Premium",
    category: "Cabelo",
    price: 850.00,
    durationMin: 180
  },

  // Maison de Beauté
  {
    id: "serv_corte_premium",
    salonId: "salon_maison",
    name: "Corte Feminino Premium",
    category: "Cabelo",
    price: 280.00,
    durationMin: 50
  },
  {
    id: "serv_coloracao_global",
    salonId: "salon_maison",
    name: "Coloração Global",
    category: "Cabelo",
    price: 450.00,
    durationMin: 120
  },
  {
    id: "serv_escova_caviar",
    salonId: "salon_maison",
    name: "Escova & Hidratação Caviar",
    category: "Cabelo",
    price: 320.00,
    durationMin: 70
  },
  {
    id: "serv_design_m",
    salonId: "salon_maison",
    name: "Design de Sobrancelhas",
    category: "Estética",
    price: 120.00,
    durationMin: 30
  },
  {
    id: "serv_manicure_russa",
    salonId: "salon_maison",
    name: "Manicure Russa",
    category: "Unhas",
    price: 180.00,
    durationMin: 40
  },
  {
    id: "serv_spa_capilar",
    salonId: "salon_maison",
    name: "Protocolo SPA Capilar",
    category: "Estética",
    price: 450.00,
    durationMin: 60
  }
];

export const initialProducts: Product[] = [
  // L'Éclat Salon
  {
    id: "prod_shampoo",
    salonId: "salon_eclat",
    name: "Shampoo Caviar Reconstruct",
    price: 120.00,
    cost: 55.00,
    stock: 24
  },
  {
    id: "prod_oleo",
    salonId: "salon_eclat",
    name: "Óleo Elixir Professional",
    price: 160.00,
    cost: 70.00,
    stock: 12
  },

  // Maison de Beauté
  {
    id: "prod_mascara",
    salonId: "salon_maison",
    name: "Mascara Luxury Nutrition",
    price: 220.00,
    cost: 95.00,
    stock: 15
  }
];

export const initialClients: Client[] = [
  // L'Éclat Salon
  {
    id: "client_isadora",
    salonId: "salon_eclat",
    name: "Isadora Mendonça",
    phone: "(11) 98872-4431",
    email: "isadora.m@email.com",
    fidelityPoints: 450
  },
  {
    id: "client_mariana",
    salonId: "salon_eclat",
    name: "Mariana Costa",
    phone: "(11) 97722-1144",
    email: "mariana.c@email.com",
    fidelityPoints: 120
  },
  {
    id: "client_ricardo",
    salonId: "salon_eclat",
    name: "Ricardo Rocha",
    phone: "(11) 99883-2211",
    email: "ricardo.r@email.com",
    fidelityPoints: 80
  },
  {
    id: "client_alice",
    salonId: "salon_eclat",
    name: "Alice Souza",
    phone: "(11) 96554-3322",
    email: "alice.s@email.com",
    fidelityPoints: 200
  },
  {
    id: "client_beatriz",
    salonId: "salon_eclat",
    name: "Beatriz Paiva",
    phone: "(11) 94332-6677",
    email: "beatriz.p@email.com",
    fidelityPoints: 340
  },

  // Maison de Beauté
  {
    id: "client_mariana_silva",
    salonId: "salon_maison",
    name: "Mariana Silva",
    phone: "(21) 97711-2233",
    email: "mariana@email.com",
    fidelityPoints: 150
  },
  {
    id: "client_clara_m",
    salonId: "salon_maison",
    name: "Clara Mendonça",
    phone: "(21) 97733-4455",
    email: "clara.m@email.com",
    fidelityPoints: 90
  },
  {
    id: "client_beatriz_f",
    salonId: "salon_maison",
    name: "Beatriz Fontes",
    phone: "(21) 97112-9900",
    email: "b.fontes@email.com",
    fidelityPoints: 310
  },
  {
    id: "client_julia_a",
    salonId: "salon_maison",
    name: "Julia Albuquerque",
    phone: "(21) 92233-8899",
    email: "julia.al@email.com",
    fidelityPoints: 180
  }
];

export const initialComandas: Comanda[] = [];

export const initialFinancials: FinancialRecord[] = [];

export const initialAppointments: Appointment[] = [];

export const initialChartAccounts: ChartAccountGroup[] = [
  { id: "ca_1", salonId: "salon_eclat", name: "Serviço Balcão", type: "receita" },
  { id: "ca_2", salonId: "salon_eclat", name: "Venda Varejo", type: "receita" },
  { id: "ca_3", salonId: "salon_eclat", name: "Fidelidade Parcerias", type: "receita" },
  { id: "ca_4", salonId: "salon_eclat", name: "Aluguel/Infraestrutura", type: "despesa" },
  { id: "ca_5", salonId: "salon_eclat", name: "Produtos e Tinturas", type: "despesa" },
  { id: "ca_6", salonId: "salon_eclat", name: "Marketing e Divulgação", type: "despesa" },
  { id: "ca_7", salonId: "salon_eclat", name: "Comissão de Colaboradores", type: "despesa" },
  { id: "ca_8", salonId: "salon_eclat", name: "Limpeza e Descartáveis", type: "despesa" },

  { id: "ca_m1", salonId: "salon_maison", name: "Serviço Estética", type: "receita" },
  { id: "ca_m2", salonId: "salon_maison", name: "Venda Cosméticos", type: "receita" },
  { id: "ca_m3", salonId: "salon_maison", name: "Instalações", type: "despesa" }
];

export const initialServiceCategories: ServiceCategory[] = [
  { id: "sc_1", salonId: "salon_eclat", name: "Cabelo" },
  { id: "sc_2", salonId: "salon_eclat", name: "Estética" },
  { id: "sc_3", salonId: "salon_eclat", name: "Unhas" },
  { id: "sc_4", salonId: "salon_eclat", name: "Outros" },

  { id: "sc_m1", salonId: "salon_maison", name: "Estética" },
  { id: "sc_m2", salonId: "salon_maison", name: "Unhas" },
  { id: "sc_m3", salonId: "salon_maison", name: "Outros" }
];
