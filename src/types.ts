export interface Salon {
  id: string;
  name: string;
  cnpj: string;
  phone: string;
  email?: string;
  asaasCustomerId?: string;
  password?: string;
  city: string;
  address?: string;
  bairro?: string;
  estado?: string;
  cep?: string;
  numero?: string;
  complemento?: string;
  maxProfessionals?: number;
  maxAdmins?: number;
  expirationDate?: string;
  isActive?: boolean;
  cardFeePercentProfDeduct?: number;
  logoUrl?: string;
  planValue?: number;
}

// Configuração de PIX por tenant — vive EXCLUSIVAMENTE na tabela
// `tenant_pix_config` do Supabase e é acessada via
// /api/tenant-pix-config. Nunca duplicar dentro do objeto Salon.
export type PixKeyType = 'telefone' | 'cnpj' | 'email' | 'aleatoria';

export interface TenantPixConfig {
  tenant_id: string;
  pix_key_type: PixKeyType;
  pix_key: string;
  created_at?: string;
  updated_at?: string;
}

export interface Professional {
  id: string;
  salonId: string;
  name: string;
  phone: string;
  password?: string;
  commissionRate: number; // e.g., 40 for 40%
  isActive: boolean;
  category: string;
  specialties?: string[]; // IDs of services they can execute
  role?: 'profissional' | 'administrador'; // distinguish role types
}

export interface Service {
  id: string;
  salonId: string;
  name: string;
  category: string;
  price: number;
  durationMin: number;
  isActive?: boolean; // active status flag for launch eligibility
}

export interface ServiceCategory {
  id: string;
  salonId: string;
  name: string;
}

export interface Product {
  id: string;
  salonId: string;
  name: string;
  price: number;
  cost: number;
  costPrice?: number;
  stock: number;
  commissionRate?: number; // e.g., 10 for 10%
}

export interface Client {
  id: string;
  salonId: string;
  name: string;
  phone: string;
  email?: string;
  fidelityPoints: number;
  birthDayMonth?: string; // Format: "DD/MM" (optional)
}

export type ComandaStatus = 'Aberto' | 'Em Atendimento' | 'Concluido' | 'Outros';

export interface CardFeeRule {
  brand: string; // e.g. "Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outros"
  operation: 'credito' | 'debito';
  installments: number; // 1 for debit or Credit 1x, 2 for Credit 2x, etc.
  rate: number; // e.g. 2.5 for 2.5%
}

export interface CardAcquirer {
  id: string;
  salonId: string;
  name: string; // e.g. "Stone", "Cielo", "Rede"
  isActive: boolean;
  rules: CardFeeRule[];
}

export interface Comanda {
  id: string;
  salonId: string;
  ticketNumber: string; // e.g. CMD-00001
  clientId: string;
  clientName: string;
  clientPhone: string;
  services: {
    id: string;
    name: string;
    price: number;
    professionalId: string;
    professionalName: string;
    commissionRate: number;
    commissionValue: number;
    originalCommissionValue?: number;
    commissionPaid?: boolean;
    commissionPaymentDate?: string;
  }[];
  products: {
    id: string;
    name: string;
    price: number;
    professionalId?: string;
    professionalName?: string;
    commissionRate?: number;
    commissionValue?: number;
    originalCommissionValue?: number;
    commissionPaid?: boolean;
    commissionPaymentDate?: string;
  }[];
  totalValue: number;
  status: ComandaStatus;
  dateCreated: string; // YYYY-MM-DDTHH:MM
  paymentDate?: string; // YYYY-MM-DD
  paymentMethod?: 'Dinheiro' | 'Cartão Credito' | 'Cartão Debito' | 'Pix' | 'Caderno'; // "Caderno" corresponds to Duplicata (Accounts Receivable)
  isFiado: boolean; // True matches Duplicata accounts receivable
  obs?: string;
  
  // Card payment metadata
  cardAcquirerId?: string;
  cardAcquirerName?: string;
  cardBrand?: string;
  cardInstallments?: number;
  cardFeeAmount?: number;
  cardFeeRateUsed?: number;
  profDeductPercentage?: number;
  salonDeductPercentage?: number;
  profCardFeeDeduction?: number;
  salonCardFeeDeduction?: number;

  // Pix static payload (BR Code EMV) generated at checkout when paymentMethod === 'Pix'
  pixPayload?: string;
}

export interface FinancialRecord {
  id: string;
  salonId: string;
  type: 'receita' | 'despesa';
  category: string; // e.g. 'Serviço', 'Produto', 'Aluguel', 'Fornecedores', 'Comissão', 'Marketing'
  amount: number;
  date: string; // YYYY-MM-DD (matches either emission/due or transaction date)
  description: string;
  status: 'pago' | 'pendente';
  relatedComandaId?: string;
  dueDate?: string; // for accounts payable/receivable
  paymentDate?: string; // YYYY-MM-DD (actual cash in/out date)
  reminderDate?: string; // YYYY-MM-DD (for WhatsApp reminder dispatch)
}

export interface ChartAccountGroup {
  id: string;
  salonId: string;
  name: string;
  type: 'receita' | 'despesa';
}

export interface Appointment {
  id: string;
  salonId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  professionalId: string;
  professionalName: string;
  serviceId: string; // single service fallback
  serviceName: string; // single service fallback
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: 'Confirmado' | 'Pendente' | 'Cancelado';
  price: number;
  services?: {
    id: string;
    name: string;
    price: number;
  }[]; // Supports multiple services chosen in scheduling
}
