import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { tenantAccessGuard, invalidateTenantCache } from "./middleware/tenantAccessGuard";

console.log('[Bootstrap] server.ts — todos os imports ESM resolvidos. Iniciando dotenv...');
dotenv.config();

const app = express();
const PORT = 3000;

// Lazy client helpers
let stripeClient: Stripe | null = null;
let supabaseClient: any = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn("[Stripe Warning] STRIPE_SECRET_KEY is not defined. Using Sandbox Mock Mode.");
      // Create a dummy Stripe client that won't throw immediately but will alert on usage
      stripeClient = new Stripe("sk_test_mock_key_only_for_startup_grace");
    } else {
      stripeClient = new Stripe(key);
    }
  }
  return stripeClient;
}

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || "https://placeholder-project.supabase.co";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key-for-load-safety";
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// Global Middleware for parsing
app.use((req, res, next) => {
  // Save raw body for stripe webhook signature checks
  if (req.path === "/api/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(tenantAccessGuard);

// API e Webhooks
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasSupabaseKey: !!process.env.SUPABASE_URL,
    stripeProductId: process.env.STRIPE_PRODUCT_ID || "prod_gestao_modello_mensal"
  });
});

// =========================================================================
// PIX — fonte única de verdade: tabela `tenant_pix_config` (Supabase)
// =========================================================================
// Estes endpoints são a única forma de ler e gravar a configuração de PIX
// de um salão. O objeto `Salon` em `tenants` NÃO contém e NÃO conterá
// campos de PIX. O sync global (`/api/supa-pull`) também não retorna PIX,
// evitando que o estado React seja sobrescrito a cada 45s.

const VALID_PIX_KEY_TYPES = new Set(["telefone", "cnpj", "email", "aleatoria"]);

/** GET /api/tenant-pix-config/:tenantId — retorna a config PIX do tenant. */
app.get("/api/tenant-pix-config/:tenantId", async (req, res) => {
  const tenantId = req.params.tenantId;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: "tenantId é obrigatório" });
  }
  const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasSupabase) {
    return res.json({ success: true, isMock: true, config: null });
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("tenant_pix_config")
      .select("tenant_id, pix_key_type, pix_key, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, isMock: false, config: data || null });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

/**
 * POST /api/tenant-pix-config — UPSERT (cria ou atualiza) a config PIX.
 * Body: { tenant_id, pix_key_type, pix_key }
 * Não há fallback para a tabela `tenants` — falha se a tabela dedicada
 * não estiver acessível.
 */
app.post("/api/tenant-pix-config", express.json(), async (req, res) => {
  const { tenant_id, pix_key_type, pix_key } = req.body || {};
  if (!tenant_id || typeof tenant_id !== "string") {
    return res.status(400).json({ success: false, error: "tenant_id é obrigatório" });
  }
  if (!pix_key_type || !VALID_PIX_KEY_TYPES.has(pix_key_type)) {
    return res.status(400).json({
      success: false,
      error: `pix_key_type inválido. Use um de: ${Array.from(VALID_PIX_KEY_TYPES).join(", ")}`
    });
  }
  if (!pix_key || typeof pix_key !== "string" || !pix_key.trim()) {
    return res.status(400).json({ success: false, error: "pix_key é obrigatório" });
  }
  const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasSupabase) {
    return res.status(503).json({
      success: false,
      isMock: true,
      error: "Banco PIX indisponível (Supabase não configurado)."
    });
  }
  try {
    const supabase = getSupabase();
    const payload = {
      tenant_id,
      pix_key_type,
      pix_key: pix_key.trim(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("tenant_pix_config")
      .upsert(payload, { onConflict: "tenant_id" })
      .select("tenant_id, pix_key_type, pix_key, created_at, updated_at")
      .single();
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, config: data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// Endpoint para simular webhook na sandbox de testes locais (offline-first sandbox fallback)
app.post("/api/simulate-webhook", express.json(), async (req, res) => {
  const { salonId, expirationDate, action } = req.body;
  console.log(`[Simulated Webhook] Requisitado para salão ${salonId} com vencimento ${expirationDate}`);
  res.json({
    success: true,
    message: `Webhook simulado com sucesso! Assinatura atualizada localmente para o dia ${expirationDate}.`,
    payload: {
      event: "customer.subscription.updated",
      status: "active",
      last_payment: new Date().toISOString(),
      salonId
    }
  });
});

// Endpoint de sincronização manual e automática local -> Supabase Cloud
app.post("/api/supa-sync", express.json({ limit: "50mb" }), async (req, res) => {
  const payload = req.body;
  
  const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasSupabase) {
    return res.json({
      success: true,
      message: "Sincronização simulada executada com sucesso na sua máquina de desenvolvimento. Para persistência real, conecte o Supabase em Configurações.",
      isMock: true,
      results: {
        tenants: (payload.tenants || []).length,
        professionals: (payload.professionals || []).length,
        services: (payload.services || []).length,
        products: (payload.products || []).length,
        financials: (payload.financials || []).length
      }
    });
  }

  try {
    const supabase = getSupabase();
    const results: any = {};
    const errors: any = {};

    // Mapper conversion functions to map camelCase fields and sanitise for Postgres snake_case schema columns
    const mapTenant = (t: any) => ({
      id: t.id,
      name: t.name,
      cnpj: t.cnpj || null,
      phone: t.phone || null,
      password: t.password || null,
      city: t.city || null,
      address: t.address || null,
      bairro: t.bairro || null,
      estado: t.estado || null,
      cep: t.cep || null,
      numero: t.numero || null,
      complemento: t.complemento || null,
      max_professionals: t.maxProfessionals || null,
      max_admins: t.maxAdmins || null,
      expiration_date: t.expirationDate || null,
      is_active: t.isActive !== undefined ? t.isActive : true,
      card_fee_percent_prof_deduct: t.cardFeePercentProfDeduct || null,
      logo_url: t.logoUrl || null,
      stripe_customer_id: t.stripe_customer_id || null,
      stripe_subscription_id: t.stripe_subscription_id || null,
      last_payment_date: t.last_payment_date || null,
      billing_status: t.billing_status || null
    });

    const mapProfessional = (p: any) => ({
      id: p.id,
      salon_id: p.salonId,
      name: p.name,
      phone: p.phone || null,
      password: p.password || null,
      commission_rate: p.commissionRate !== undefined ? p.commissionRate : 0,
      is_active: p.isActive !== undefined ? p.isActive : true,
      category: p.category || null,
      specialties: Array.isArray(p.specialties) ? p.specialties : null,
      role: p.role || 'profissional'
    });

    const mapService = (s: any) => ({
      id: s.id,
      salon_id: s.salonId,
      name: s.name,
      category: s.category || null,
      price: s.price !== undefined ? s.price : 0,
      duration_min: s.durationMin !== undefined ? s.durationMin : (s.duration || 0),
      is_active: s.isActive !== undefined ? s.isActive : true
    });

    const mapProduct = (p: any) => ({
      id: p.id,
      salon_id: p.salonId,
      name: p.name,
      price: p.price !== undefined ? p.price : 0,
      cost: p.cost !== undefined ? p.cost : 0,
      cost_price: p.costPrice !== undefined ? p.costPrice : null,
      stock: p.stock !== undefined ? p.stock : 0,
      commission_rate: p.commissionRate !== undefined ? p.commissionRate : null
    });

    const mapFinancial = (f: any) => ({
      id: f.id,
      salon_id: f.salonId,
      type: f.type || null,
      category: f.category || null,
      amount: f.amount !== undefined ? f.amount : 0,
      date: f.date || null,
      description: f.description || null,
      status: f.status || 'pago',
      related_comanda_id: f.relatedComandaId || null,
      due_date: f.dueDate || null,
      payment_date: f.paymentDate || null,
      reminder_date: f.reminderDate || null
    });

    // We MUST execute sequentially in a specific dependency hierarchy: 
    // 1. Tenants (parent)
    // 2. Others (dependents references)
    const tableMappers = [
      { key: "tenants", table: "tenants", mapper: mapTenant },
      { key: "professionals", table: "professionals", mapper: mapProfessional },
      { key: "services", table: "services", mapper: mapService },
      { key: "products", table: "products", mapper: mapProduct },
      // Comandas usam REST API própria — removidas do supa-sync para evitar recriação
      { key: "financials", table: "financials", mapper: mapFinancial },
      // Clients usam REST API própria — removidas do supa-sync para evitar recriação
      // Appointments usam REST API própria — removidas do supa-sync para evitar recriação
    ];

    for (const mapping of tableMappers) {
      const items = payload[mapping.key];
      if (Array.isArray(items) && items.length > 0) {
        let sanitized = items.map((x: any) => (mapping.mapper as any)(x));

        // Se for a tabela de inquilinos (tenants), buscamos primeiro os dados existentes no banco
        // para garantir que não sobrescreveremos campos críticos de assinatura/financeiros (como vencimento/ativo/stripe) com dados desatualizados do local do navegador
        if (mapping.table === "tenants") {
          try {
            const tenantIds = sanitized.map((t: any) => t.id).filter(Boolean);
            if (tenantIds.length > 0) {
              const { data: dbTenants, error: dbFetchErr } = await supabase
                .from("tenants")
                .select("id, expiration_date, is_active, stripe_customer_id, stripe_subscription_id, last_payment_date, billing_status, max_professionals, max_admins")
                .in("id", tenantIds);
              
              if (!dbFetchErr && dbTenants && dbTenants.length > 0) {
                const dbTenantsMap = new Map(dbTenants.map((dbT: any) => [dbT.id, dbT]));
                sanitized = sanitized.map((t: any) => {
                  const dbT: any = dbTenantsMap.get(t.id);
                  if (dbT) {
                    const isSaaSAdmin = payload.isSaaSAdmin === true || payload.isSaasAdmin === true || payload.userRole === "SAAS_ADMIN";

                    // Se a sincronização vier do painel SaaS Admin mestre, aceitamos as alterações do payload para licenças, expiração e status.
                    // Caso contrário, herda estritamente o que está definitivo no banco do Supabase para impedir que o browser do operador reverta limites contratuais.
                    const chosenExp = isSaaSAdmin ? (t.expiration_date || dbT.expiration_date) : (dbT.expiration_date || t.expiration_date);
                    const chosenIsActive = isSaaSAdmin ? (t.is_active !== undefined ? t.is_active : dbT.is_active) : (dbT.is_active !== undefined ? dbT.is_active : t.is_active);
                    const chosenMaxProfs = isSaaSAdmin ? (t.max_professionals !== null && t.max_professionals !== undefined ? t.max_professionals : dbT.max_professionals) : (dbT.max_professionals !== null && dbT.max_professionals !== undefined ? dbT.max_professionals : t.max_professionals);
                    const chosenMaxAdmins = isSaaSAdmin ? (t.max_admins !== null && t.max_admins !== undefined ? t.max_admins : dbT.max_admins) : (dbT.max_admins !== null && dbT.max_admins !== undefined ? dbT.max_admins : t.max_admins);

                    // Mescla preservando os campos de faturamento corporativo no banco de dados e aplicando novos campos comuns (endereco/contato/senha)
                    return {
                      ...t,
                      expiration_date: chosenExp,
                      is_active: chosenIsActive,
                      max_professionals: chosenMaxProfs,
                      max_admins: chosenMaxAdmins,
                      stripe_customer_id: dbT.stripe_customer_id || t.stripe_customer_id,
                      stripe_subscription_id: dbT.stripe_subscription_id || t.stripe_subscription_id,
                      last_payment_date: dbT.last_payment_date || t.last_payment_date,
                      billing_status: dbT.billing_status || t.billing_status
                    };
                  }
                  return t;
                });
              }
            }
          } catch (mErr) {
            console.warn("Erro ao tentar mesclar dados autoritativos do banco de dados antes do upsert:", mErr);
          }
        }

        const result = await supabase.from(mapping.table).upsert(sanitized);
        const { error } = result;

        console.log("RESULTADO", JSON.stringify(result, null, 2));

        if (error) {
          console.error(`Erro ao sincronizar tabela ${mapping.table}:`, error);
          errors[mapping.key] = error.message;
        } else {
          results[mapping.key] = sanitized.length;
        }
      } else {
        results[mapping.key] = 0;
      }
    }

    // Busca todos os inquilinos atualizados direto do Supabase para enviar de volta em camelCase para os browsers ativos
    let updatedTenants: any[] = [];
    try {
      const { data: dbAllTenants } = await supabase
        .from("tenants")
        .select("*");
      if (dbAllTenants && dbAllTenants.length > 0) {
        updatedTenants = dbAllTenants.map((t: any) => ({
          id: t.id,
          name: t.name,
          cnpj: t.cnpj || "",
          phone: t.phone || "",
          password: t.password || "",
          city: t.city || "",
          address: t.address || "",
          bairro: t.bairro || "",
          estado: t.estado || "",
          cep: t.cep || "",
          numero: t.numero || "",
          complemento: t.complemento || "",
          maxProfessionals: t.max_professionals || 20,
          maxAdmins: t.max_admins || 5,
          expirationDate: t.expiration_date,
          isActive: t.is_active !== undefined ? t.is_active : true,
          cardFeePercentProfDeduct: t.card_fee_percent_prof_deduct || 0,
          logoUrl: t.logo_url || ""
        }));
      }
    } catch (fetchErr) {
      console.error("Erro ao puxar lista atualizada de inquilinos:", fetchErr);
    }

    res.json({
      success: Object.keys(errors).length === 0,
      message: Object.keys(errors).length === 0 
        ? "Todos os seus dados locais do Salão foram sincronizados com sucesso com o banco de dados do Supabase!"
        : "Sincronização concluída com pendências. Certifique-se de atualizar o DDL das tabelas no console do Supabase.",
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      isMock: false,
      tenants: updatedTenants.length > 0 ? updatedTenants : undefined
    });
  } catch (err: any) {
    console.error("Erro no fluxo do supa-sync endpoint:", err);
    res.status(500).json({ error: err?.message || err?.toString() || "Erro inesperado", success: false });
  }
});

// Endpoint to fetch all authoritative records from Supabase
app.get("/api/supa-pull", async (req, res) => {
  const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasSupabase) {
    return res.json({
      success: true,
      isMock: true,
      message: "Modo sandbox offline. Nenhum banco de dados configurado para puxar."
    });
  }

  try {
    const supabase = getSupabase();

    // Fetch from all tables in parallel
    const [
      { data: dbTenants, error: errTenants },
      { data: dbProfessionals, error: errProfs },
      { data: dbServices, error: errServices },
      { data: dbProducts, error: errProducts },
      { data: dbClients, error: errClients },
      { data: dbComandas, error: errComandas },
      { data: dbFinancials, error: errFinancials },
      { data: dbAppointments, error: errAppointments }
    ] = await Promise.all([
      supabase.from("tenants").select("*"),
      supabase.from("professionals").select("*"),
      supabase.from("services").select("*"),
      supabase.from("products").select("*"),
      supabase.from("clients").select("*"),
      supabase.from("comandas").select("*"),
      supabase.from("financials").select("*"),
      supabase.from("appointments").select("*")
    ]);

    const errors: any = {};
    if (errTenants) errors.tenants = errTenants.message;
    if (errProfs) errors.professionals = errProfs.message;
    if (errServices) errors.services = errServices.message;
    if (errProducts) errors.products = errProducts.message;
    if (errClients) errors.clients = errClients.message;
    if (errComandas) errors.comandas = errComandas.message;
    if (errFinancials) errors.financials = errFinancials.message;
    if (errAppointments) errors.appointments = errAppointments.message;

    // Apenas a tabela de tenants (inquilinos) é 100% crítica para funcionamento básico
    if (errTenants) {
      return res.status(500).json({
        success: false,
        error: "Erro crítico ao carregar dados essenciais de inquilinos do Supabase",
        errors
      });
    }

    // Map snake_case database schema to camelCase client objects
    const tenants = (dbTenants || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      cnpj: t.cnpj || "",
      phone: t.phone || "",
      password: t.password || "",
      city: t.city || "",
      address: t.address || "",
      bairro: t.bairro || "",
      estado: t.estado || "",
      cep: t.cep || "",
      numero: t.numero || "",
      complemento: t.complemento || "",
      maxProfessionals: t.max_professionals || 25,
      maxAdmins: t.max_admins || 5,
      expirationDate: t.expiration_date,
      isActive: t.is_active !== undefined ? t.is_active : true,
      cardFeePercentProfDeduct: t.card_fee_percent_prof_deduct || 0,
      logoUrl: t.logo_url || ""
    }));

    const professionals = (dbProfessionals || []).map((p: any) => ({
      id: p.id,
      salonId: p.salon_id,
      name: p.name,
      phone: p.phone || "",
      password: p.password || "1234",
      commissionRate: p.commission_rate || 0,
      isActive: p.is_active !== undefined ? p.is_active : true,
      category: p.category || "",
      specialties: p.specialties || [],
      role: p.role || "profissional"
    }));

    const services = (dbServices || []).map((s: any) => ({
      id: s.id,
      salonId: s.salon_id,
      name: s.name,
      category: s.category || "",
      price: s.price || 0,
      durationMin: s.duration_min || 0,
      isActive: s.is_active !== undefined ? s.is_active : true
    }));

    const products = (dbProducts || []).map((p: any) => ({
      id: p.id,
      salonId: p.salon_id,
      name: p.name,
      price: p.price || 0,
      cost: p.cost || 0,
      costPrice: p.cost_price,
      stock: p.stock || 0,
      commissionRate: p.commission_rate
    }));

    const clients = (dbClients || []).map((c: any) => ({
      id: c.id,
      salonId: c.salon_id,
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      fidelityPoints: c.fidelity_points || 0,
      birthDayMonth: c.birthday_month
    }));

    const comandas = (dbComandas || []).map((com: any) => ({
      id: com.id,
      salonId: com.salon_id,
      ticketNumber: com.ticket_number,
      clientId: com.client_id,
      clientName: com.client_name,
      clientPhone: com.client_phone,
      services: com.services || [],
      products: com.products || [],
      totalValue: com.total_value || 0,
      status: com.status || "Aberto",
      dateCreated: com.date_created,
      paymentDate: com.payment_date,
      paymentMethod: com.payment_method,
      isFiado: com.is_fiado !== undefined ? com.is_fiado : false,
      obs: com.obs || "",
      cardAcquirerId: com.card_acquirer_id,
      cardAcquirerName: com.card_acquirer_name,
      cardBrand: com.card_brand,
      cardInstallments: com.card_installments,
      cardFeeAmount: com.card_fee_amount,
      cardFeeRateUsed: com.card_fee_rate_used,
      profDeductPercentage: com.prof_deduct_percentage,
      salonDeductPercentage: com.salon_deduct_percentage,
      profCardFeeDeduction: com.prof_card_fee_deduction,
      salonCardFeeDeduction: com.salon_card_fee_deduction
    }));

    const financials = (dbFinancials || []).map((f: any) => ({
      id: f.id,
      salonId: f.salon_id,
      type: f.type,
      category: f.category,
      amount: f.amount || 0,
      date: f.date,
      description: f.description || "",
      status: f.status || "pago",
      relatedComandaId: f.related_comanda_id,
      dueDate: f.due_date,
      paymentDate: f.payment_date,
      reminderDate: f.reminder_date
    }));

    const appointments = (dbAppointments || []).map((a: any) => ({
      id: a.id,
      salonId: a.salon_id,
      clientId: a.client_id,
      clientName: a.client_name,
      clientPhone: a.client_phone,
      professionalId: a.professional_id,
      professionalName: a.professional_name,
      serviceId: a.service_id,
      serviceName: a.service_name,
      date: a.date,
      time: a.time,
      status: a.status,
      price: a.price || 0,
      services: a.services || []
    }));

    res.json({
      success: true,
      isMock: false,
      tenants,
      professionals,
      services,
      products,
      clients,
      comandas,
      financials,
      appointments,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    });
  } catch (err: any) {
    console.error("Erro no fluxo do supa-pull endpoint:", err);
    res.status(500).json({ error: err?.message || err?.toString() || "Erro inesperado", success: false });
  }
});

// Endpoint para apagar completamente todas as informações de um inquilino e de seus dependentes de forma segura
app.post("/api/delete-tenant", express.json(), async (req, res) => {
  const { tenantId, password } = req.body;

  if (!tenantId || !password) {
    return res.status(400).json({ success: false, error: "Identificador do salão e senha são obrigatórios." });
  }

  // Validação da senha master de gerenciamento do SaaS (lida de variável de ambiente)
  const saasMasterPassword = process.env.SAAS_MASTER_PASSWORD;
  if (!saasMasterPassword) {
    return res.status(500).json({ success: false, error: "SAAS_MASTER_PASSWORD não configurada no servidor." });
  }
  if (password !== saasMasterPassword) {
    return res.status(403).json({ success: false, error: "Senha incorreta. Acesso negado." });
  }

  const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasSupabase) {
    return res.json({
      success: true,
      message: "Exclusão simulada da sandbox efetuada com sucesso (modo desenvolvimento offline)."
    });
  }

  try {
    const supabase = getSupabase();

    // Deleta os registros vinculados de forma sequencial para evitar violações de chave estrangeira (FK)
    // 1. appointments (agendamentos) -> salon_id
    const { error: errApp } = await supabase.from("appointments").delete().eq("salon_id", tenantId);
    if (errApp) console.warn("Erro ao apagar appointments no supabase:", errApp);

    // 2. financials (financeiro) -> salon_id
    const { error: errFin } = await supabase.from("financials").delete().eq("salon_id", tenantId);
    if (errFin) console.warn("Erro ao apagar financials no supabase:", errFin);

    // 3. comandas (vendas/comandas) -> salon_id
    const { error: errCom } = await supabase.from("comandas").delete().eq("salon_id", tenantId);
    if (errCom) console.warn("Erro ao apagar comandas no supabase:", errCom);

    // 4. clients (clientes) -> salon_id
    const { error: errCli } = await supabase.from("clients").delete().eq("salon_id", tenantId);
    if (errCli) console.warn("Erro ao apagar clients no supabase:", errCli);

    // 5. products (produtos) -> salon_id
    const { error: errProd } = await supabase.from("products").delete().eq("salon_id", tenantId);
    if (errProd) console.warn("Erro ao apagar products no supabase:", errProd);

    // 6. services (serviços) -> salon_id
    const { error: errServ } = await supabase.from("services").delete().eq("salon_id", tenantId);
    if (errServ) console.warn("Erro ao apagar services no supabase:", errServ);

    // 7. professionals (colaboradores e administradores) -> salon_id
    const { error: errProf } = await supabase.from("professionals").delete().eq("salon_id", tenantId);
    if (errProf) console.warn("Erro ao apagar professionals no supabase:", errProf);

    // 8. O próprio tenant (inquilino/salão) -> id
    const { error: errTen } = await supabase.from("tenants").delete().eq("id", tenantId);
    if (errTen) {
      console.error("Erro ao apagar tenant no supabase:", errTen);
      return res.status(500).json({ success: false, error: `Falha ao apagar salão: ${errTen.message}` });
    }

    // Invalida cache do tenant removido
    invalidateTenantCache(tenantId);

    return res.json({
      success: true,
      message: "Todos os dados da sandbox e do salão foram removidos permanentemente do Supabase com sucesso."
    });
  } catch (err: any) {
    console.error("Erro excepcional na rota de apagar tenant:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint seguro para validar senha master do SaaS (sem expô-la no frontend)
app.post("/api/admin/validate-master-password", express.json(), async (req, res) => {
  const { password } = req.body || {};
  if (!password || typeof password !== "string") {
    return res.status(400).json({ success: false, error: "Senha é obrigatória." });
  }
  const masterPassword = process.env.SAAS_MASTER_PASSWORD;
  if (!masterPassword) {
    return res.status(500).json({ success: false, error: "SAAS_MASTER_PASSWORD não configurada no servidor." });
  }
  if (password === masterPassword) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: "Senha master inválida." });
});

// Endpoint seguro para validar e-mail + senha master do SaaS (sem expô-los no frontend)
app.post("/api/admin/validate-master-credentials", express.json(), async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return res.status(400).json({ success: false, error: "E-mail e senha são obrigatórios." });
  }
  const masterEmail = process.env.SAAS_MASTER_EMAIL;
  const masterPassword = process.env.SAAS_MASTER_PASSWORD;
  if (!masterEmail || !masterPassword) {
    return res.status(500).json({ success: false, error: "Credenciais master não configuradas no servidor." });
  }
  if (email.toLowerCase() === masterEmail.toLowerCase() && password === masterPassword) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: "Credenciais master inválidas." });
});

// Endpoint para iniciar Checkout Session no Stripe
app.post("/api/checkout", async (req, res) => {
  const { salonId, customerEmail, successUrl, cancelUrl } = req.body;

  if (!salonId) {
    return res.status(400).json({ error: "salonId é obrigatório." });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    // Se o desenvolvedor não configurou Stripe real no .env, devolve link de checkout simulado elegante!
    console.log("[Simulation] Usando link de checkout simulado porque STRIPE_SECRET_KEY está vazia.");
    
    // Calcula nova data de vencimento (se adiantado, soma +1 mês ao vencimento, senão data atual + 1 mês)
    return res.json({
      id: "cs_mock_" + Math.random().toString(36).substring(2, 9),
      url: `/index.html?mock_checkout_success=true&salon_id=${salonId}`,
      isMock: true
    });
  }

  try {
    const stripe = getStripe();
    const productId = process.env.STRIPE_PRODUCT_ID;

    const priceData: any = {
      currency: "brl",
      recurring: { interval: "month" },
      unit_amount: 12000, // R$ 120,00
    };

    if (productId) {
      priceData.product = productId;
    } else {
      priceData.product_data = {
        name: "Assinatura Mensal - Plano Modello Enterprise",
        description: "Assinatura do sistema integrado de gestão de salão de beleza",
      };
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
      metadata: {
        salonId: salonId,
      },
      success_url: successUrl || `${req.headers.origin}/?stripe_session_id={CHECKOUT_SESSION_ID}&salon_id=${salonId}`,
      cancel_url: cancelUrl || `${req.headers.origin}/`,
    });

    res.json({ id: session.id, url: session.url, isMock: false });
  } catch (error: any) {
    console.error("Erro ao iniciar Checkout Session:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para verificar checkout session diretamente do Stripe (sem depender unicamente do webhook)
app.post("/api/verify-checkout-session", async (req, res) => {
  const { sessionId, salonId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId é obrigatório." });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(400).json({ error: "Stripe não configurado no servidor." });
  }

  try {
    const stripe = getStripe();
    // Recupera a sessão de checkout do Stripe diretamente no backend
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid" || session.status === "complete") {
      const actualSalonId = (session.metadata?.salonId || salonId) as string;
      
      if (!actualSalonId) {
        return res.status(400).json({ error: "salonId não pôde ser identificado." });
      }

      console.log(`[Stripe Verification] Sessão paga identificada via API. ID: ${sessionId} para Salão ID: ${actualSalonId}`);

      let formattedExpDate = "";
      const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (hasSupabase) {
        // Atualiza no banco Supabase
        const supabase = getSupabase();
        
        // Coleta o prazo atual do salão no banco
        const { data: currentSalon, error: getError } = await supabase
          .from("tenants")
          .select("expiration_date")
          .eq("id", actualSalonId)
          .single();

        let newExpirationDate = new Date();

        if (!getError && currentSalon && currentSalon.expiration_date) {
          const dateOnlyStr = String(currentSalon.expiration_date).substring(0, 10);
          const currentExp = new Date(dateOnlyStr + "T20:00:00");
          const today = new Date();
          if (!isNaN(currentExp.getTime()) && currentExp > today) {
            newExpirationDate = currentExp;
          }
        }
        newExpirationDate.setDate(newExpirationDate.getDate() + 30);

        formattedExpDate = newExpirationDate.toISOString().substring(0, 10);

        const updatePayload: any = {
          expiration_date: formattedExpDate,
          is_active: true
        };

        console.log(`[Stripe Verification] Tentando salvar nova data expiracao: ${formattedExpDate} para o salao: ${actualSalonId}`);

        // Tenta atualizar incluindo todas as colunas de faturamento adicionais
        const { error: updateError } = await supabase
          .from("tenants")
          .update({
            ...updatePayload,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            last_payment_date: new Date().toISOString(),
            billing_status: "active"
          })
          .eq("id", actualSalonId);

        if (updateError) {
          console.warn("[Stripe Verification] Falha ao persistir colunas extras (provavelmente ausentes no DDL), tentando apenas colunas básicas garantidas (expiration_date, is_active). Erro original:", updateError.message);
          
          // Fallback robusto de segunda fase (SÓ as colunas que sabemos que existem na DDL padrão)
          const { error: fallbackError } = await supabase
            .from("tenants")
            .update(updatePayload)
            .eq("id", actualSalonId);

          if (fallbackError) {
            console.error("[Stripe Verification] Erro total e irrecuperável de atualização da database:", fallbackError);
            return res.status(500).json({ error: "Erro crítico ao de gravação do expiration_date no Supabase: " + fallbackError.message });
          } else {
            console.log(`[Stripe Verification Fallback] Sucesso ao atualizar com as colunas básicas de backup! Data: ${formattedExpDate}`);
          }
        } else {
          console.log(`[Stripe Verification] Licença atualizada perfeitamente com todas as colunas Stripe persistidas! Data: ${formattedExpDate}`);
        }
      } else {
        // Modo fallback sem banco
        let newExpirationDate = new Date();
        newExpirationDate.setMonth(newExpirationDate.getMonth() + 1);
        formattedExpDate = newExpirationDate.toISOString().substring(0, 10);
      }

      // Invalida cache do tenantAccessGuard para refletir nova data
      invalidateTenantCache(actualSalonId);

      return res.json({
        success: true,
        salonId: actualSalonId,
        expirationDate: formattedExpDate,
        isActive: true,
        message: "Assinatura ativada e estendida com sucesso."
      });
    } else {
      return res.status(400).json({ error: "Sessão do Stripe pendente ou não compensada. Status do pagamento: " + session.payment_status });
    }
  } catch (error: any) {
    console.error("[Stripe Verification] Erro ao verificar sessão do Stripe:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint do Webhook do Stripe
app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (!sig || !webhookSecret) {
    console.warn("Informando Webhook sem assinatura Stripe real ou sem chave privada.");
    return res.status(400).send("Webhook Secret ausente ou assinatura inválida.");
  }

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Falha na verificação de assinatura do Webhook Stripe: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Processa eventos críticos de Assinatura
  if (
    event.type === "checkout.session.completed" ||
    event.type === "invoice.payment_succeeded" ||
    event.type === "customer.subscription.updated"
  ) {
    const sessionOrSubscription = event.data.object as any;
    
    let salonId = sessionOrSubscription.metadata?.salonId;
    let stripeCustomerId = sessionOrSubscription.customer as string;
    let stripeSubId = (sessionOrSubscription.subscription || sessionOrSubscription.id) as string;

    // Se veio do checkout, extrai metadados
    if (event.type === "checkout.session.completed") {
      salonId = sessionOrSubscription.metadata?.salonId;
    }

    if (salonId) {
      console.log(`[Stripe Webhook] Pagamento ou alteração na assinatura detectada para o Salão ID: ${salonId}`);
      
      try {
        const supabase = getSupabase();
        
        // 1. Coleta o estado atual do salão no banco
        const { data: currentSalon, error: getError } = await supabase
          .from("tenants")
          .select("expiration_date")
          .eq("id", salonId)
          .single();

        let newExpirationDate = new Date();

        if (!getError && currentSalon && currentSalon.expiration_date) {
          const dateOnlyStr = String(currentSalon.expiration_date).substring(0, 10);
          const currentExp = new Date(dateOnlyStr + "T20:00:00");
          const today = new Date();
          if (!isNaN(currentExp.getTime()) && currentExp > today) {
            newExpirationDate = currentExp;
          }
        }
        newExpirationDate.setDate(newExpirationDate.getDate() + 30);

        const formattedExpDate = newExpirationDate.toISOString().substring(0, 10);

        const updatePayload: any = {
          expiration_date: formattedExpDate,
          is_active: true
        };

        console.log(`[Stripe Webhook] Tentando salvar nova data expiracao: ${formattedExpDate} para o salao: ${salonId}`);

        // 2. Salva e atualiza o tenant no banco com tratamento robusto de colunas extras
        const { error: updateError } = await supabase
          .from("tenants")
          .update({
            ...updatePayload,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubId,
            last_payment_date: new Date().toISOString(),
            billing_status: "active"
          })
          .eq("id", salonId);

        if (updateError) {
          console.warn("[Stripe Webhook] Falha ao persistir colunas extras (provavelmente ausentes no DDL), tentando apenas colunas básicas garantidas (expiration_date, is_active). Erro original:", updateError.message);
          
          // Fallback robusto de segunda fase para webhook
          const { error: fallbackError } = await supabase
            .from("tenants")
            .update(updatePayload)
            .eq("id", salonId);

          if (fallbackError) {
            console.error("[Stripe Webhook] Erro total de atualização do banco no webhook:", fallbackError);
          } else {
            console.log(`[Stripe Webhook Fallback] Banco atualizado via webhook com sucesso com as colunas básicas de backup! Expira em: ${formattedExpDate}`);
          }
        } else {
          console.log(`[Stripe Webhook] Banco de dados atualizado via webhook de forma impecável com todas as colunas Stripe persistidas! Expira em: ${formattedExpDate}`);
        }

      } catch (dbErr) {
        console.error("Falha ao integrar com banco PostgreSQL Supabase:", dbErr);
      }

      // Invalida cache do tenantAccessGuard após atualização via webhook
      invalidateTenantCache(salonId);
    }
  }

  res.json({ received: true });
});

// ---------------------------------------------------------------------------
// Mapeamento de comandas: camelCase (frontend) ↔ snake_case (Supabase)
// ---------------------------------------------------------------------------

function comandaToDb(com: any) {
  return {
    id: com.id,
    salon_id: com.salonId,
    ticket_number: com.ticketNumber || null,
    client_id: com.clientId || null,
    client_name: com.clientName || null,
    client_phone: com.clientPhone || null,
    services: Array.isArray(com.services) ? com.services : null,
    products: Array.isArray(com.products) ? com.products : null,
    total_value: com.totalValue !== undefined ? com.totalValue : 0,
    status: com.status || 'Aberto',
    date_created: com.dateCreated || null,
    payment_date: com.paymentDate || null,
    payment_method: com.paymentMethod || null,
    is_fiado: com.isFiado !== undefined ? com.isFiado : false,
    obs: com.obs || null,
    card_acquirer_id: com.cardAcquirerId || null,
    card_acquirer_name: com.cardAcquirerName || null,
    card_brand: com.cardBrand || null,
    card_installments: com.cardInstallments || null,
    card_fee_amount: com.cardFeeAmount || null,
    card_fee_rate_used: com.cardFeeRateUsed || null,
    prof_deduct_percentage: com.profDeductPercentage || null,
    salon_deduct_percentage: com.salonDeductPercentage || null,
    prof_card_fee_deduction: com.profCardFeeDeduction || null,
    salon_card_fee_deduction: com.salonCardFeeDeduction || null,
  };
}

function comandaFromDb(db: any) {
  return {
    id: db.id,
    salonId: db.salon_id,
    ticketNumber: db.ticket_number,
    clientId: db.client_id,
    clientName: db.client_name,
    clientPhone: db.client_phone,
    services: db.services || [],
    products: db.products || [],
    totalValue: db.total_value || 0,
    status: db.status || 'Aberto',
    dateCreated: db.date_created,
    paymentDate: db.payment_date,
    paymentMethod: db.payment_method,
    isFiado: db.is_fiado !== undefined ? db.is_fiado : false,
    obs: db.obs || '',
    cardAcquirerId: db.card_acquirer_id,
    cardAcquirerName: db.card_acquirer_name,
    cardBrand: db.card_brand,
    cardInstallments: db.card_installments,
    cardFeeAmount: db.card_fee_amount,
    cardFeeRateUsed: db.card_fee_rate_used,
    profDeductPercentage: db.prof_deduct_percentage,
    salonDeductPercentage: db.salon_deduct_percentage,
    profCardFeeDeduction: db.prof_card_fee_deduction,
    salonCardFeeDeduction: db.salon_card_fee_deduction,
  };
}

// ---------------------------------------------------------------------------
// REST API — Comandas (fonte de verdade: Supabase)
// ---------------------------------------------------------------------------

app.get("/api/comandas", async (req, res) => {
  try {
    const supabase = getSupabase();
    const salonId = req.query.salon_id as string;
    let query = supabase.from("comandas").select("*");
    if (salonId) {
      query = query.eq("salon_id", salonId);
    }
    const { data, error } = await query;
    if (error) throw error;
    const comandas = (data || []).map(comandaFromDb);
    res.json({ success: true, comandas });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/comandas", express.json(), async (req, res) => {
  try {
    const supabase = getSupabase();
    const dbComanda = comandaToDb(req.body);
    const { data, error } = await supabase.from("comandas").insert(dbComanda).select();
    if (error) throw error;
    const comanda = data?.[0] ? comandaFromDb(data[0]) : null;
    res.json({ success: true, comanda });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/comandas/:id", express.json(), async (req, res) => {
  try {
    const supabase = getSupabase();
    const dbComanda = comandaToDb(req.body);
    const { data, error } = await supabase.from("comandas").update(dbComanda).eq("id", req.params.id).select();
    if (error) throw error;
    const comanda = data?.[0] ? comandaFromDb(data[0]) : null;
    res.json({ success: true, comanda });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/comandas/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("comandas").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Mapeamento de clientes: camelCase (frontend) ↔ snake_case (Supabase)
// ---------------------------------------------------------------------------

function clientToDb(c: any) {
  return {
    id: c.id,
    salon_id: c.salonId,
    name: c.name,
    phone: c.phone || null,
    email: c.email || null,
    fidelity_points: c.fidelityPoints !== undefined ? c.fidelityPoints : 0,
    birthday_month: c.birthDayMonth || null
  };
}

function clientFromDb(db: any) {
  return {
    id: db.id,
    salonId: db.salon_id,
    name: db.name,
    phone: db.phone || '',
    email: db.email || '',
    fidelityPoints: db.fidelity_points !== undefined ? db.fidelity_points : 0,
    birthDayMonth: db.birthday_month || undefined
  };
}

// ---------------------------------------------------------------------------
// Mapeamento de agendamentos: camelCase (frontend) ↔ snake_case (Supabase)
// ---------------------------------------------------------------------------

function appointmentToDb(a: any) {
  return {
    id: a.id,
    salon_id: a.salonId,
    client_id: a.clientId || null,
    client_name: a.clientName || null,
    client_phone: a.clientPhone || null,
    professional_id: a.professionalId || null,
    professional_name: a.professionalName || null,
    service_id: a.serviceId || null,
    service_name: a.serviceName || null,
    date: a.date || null,
    time: a.time || null,
    status: a.status || null,
    price: a.price !== undefined ? a.price : 0,
    services: Array.isArray(a.services) ? a.services : null
  };
}

function appointmentFromDb(db: any) {
  return {
    id: db.id,
    salonId: db.salon_id,
    clientId: db.client_id,
    clientName: db.client_name,
    clientPhone: db.client_phone,
    professionalId: db.professional_id,
    professionalName: db.professional_name,
    serviceId: db.service_id,
    serviceName: db.service_name,
    date: db.date,
    time: db.time,
    status: db.status || 'Confirmado',
    price: db.price !== undefined ? db.price : 0,
    services: Array.isArray(db.services) ? db.services : null
  };
}

// ---------------------------------------------------------------------------
// REST API — Clients (fonte de verdade: Supabase)
// ---------------------------------------------------------------------------

app.get("/api/clients", async (req, res) => {
  try {
    const supabase = getSupabase();
    const salonId = req.query.salon_id as string;
    let query = supabase.from("clients").select("*");
    if (salonId) {
      query = query.eq("salon_id", salonId);
    }
    const { data, error } = await query;
    if (error) throw error;
    const clients = (data || []).map(clientFromDb);
    res.json({ success: true, clients });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/clients", express.json(), async (req, res) => {
  try {
    const supabase = getSupabase();
    const dbClient = clientToDb(req.body);
    const { data, error } = await supabase.from("clients").insert(dbClient).select();
    if (error) throw error;
    const client = data?.[0] ? clientFromDb(data[0]) : null;
    res.json({ success: true, client });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/clients/:id", express.json(), async (req, res) => {
  try {
    const supabase = getSupabase();
    const dbClient = clientToDb(req.body);
    const { data, error } = await supabase.from("clients").update(dbClient).eq("id", req.params.id).select();
    if (error) throw error;
    const client = data?.[0] ? clientFromDb(data[0]) : null;
    res.json({ success: true, client });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/clients/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("clients").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// REST API — Appointments (fonte de verdade: Supabase)
// ---------------------------------------------------------------------------

app.get("/api/appointments", async (req, res) => {
  try {
    const supabase = getSupabase();
    const salonId = req.query.salon_id as string;
    let query = supabase.from("appointments").select("*");
    if (salonId) {
      query = query.eq("salon_id", salonId);
    }
    const { data, error } = await query;
    if (error) throw error;
    const appointments = (data || []).map(appointmentFromDb);
    res.json({ success: true, appointments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/appointments", express.json(), async (req, res) => {
  try {
    const supabase = getSupabase();
    const dbAppointment = appointmentToDb(req.body);
    const { data, error } = await supabase.from("appointments").insert(dbAppointment).select();
    if (error) throw error;
    const appointment = data?.[0] ? appointmentFromDb(data[0]) : null;
    res.json({ success: true, appointment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/appointments/:id", express.json(), async (req, res) => {
  try {
    const supabase = getSupabase();
    const dbAppointment = appointmentToDb(req.body);
    const { data, error } = await supabase.from("appointments").update(dbAppointment).eq("id", req.params.id).select();
    if (error) throw error;
    const appointment = data?.[0] ? appointmentFromDb(data[0]) : null;
    res.json({ success: true, appointment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/appointments/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("appointments").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vite middleware em dev / static em produção. Vercel usa CDN + rewrites.
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== '1') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Cache-control: SW nunca deve ser cacheado pelo navegador
    app.use((req, res, next) => {
      if (req.path === "/service-worker.js") {
        res.setHeader("Cache-Control", "no-store, max-age=0");
      } else if (req.path === "/manifest.webmanifest") {
        res.setHeader("Cache-Control", "public, max-age=300");
      } else if (req.path === "/" || req.path === "/index.html") {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
      next();
    });

    app.use(express.static(distPath, {
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
        if (filePath.endsWith("service-worker.js")) {
          res.setHeader("Cache-Control", "no-store, max-age=0");
        }
      }
    }));

    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

console.log('[Bootstrap] server.ts — app configurado. VERCEL=' + process.env.VERCEL + ', NODE_ENV=' + process.env.NODE_ENV);
export default app;

if (process.env.VERCEL !== '1') {
  setupViteOrStatic().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Server] Gestão Modello rodando perfeitamente na porta ${PORT}`);
    });
  });
}
