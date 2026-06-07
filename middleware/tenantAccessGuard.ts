import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheEntry {
  isExpired: boolean;
  cachedAt: number;
}

// ---------------------------------------------------------------------------
// In-memory cache por tenantId — TTL 5 min
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/** Invalida o cache de um tenant (chamado após renovação/pagamento). */
export function invalidateTenantCache(tenantId: string): void {
  cache.delete(tenantId);
}

/** Limpa todo o cache (útil em testes ou recarga administrativa). */
export function clearTenantCache(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Prefixos de rota liberados SEMPRE (mesmo para tenant expirado)
// ---------------------------------------------------------------------------

const ALLOWED_PREFIXES = [
  "/api/health",
  "/api/checkout",
  "/api/verify-checkout-session",
  "/api/webhook",
  "/api/simulate-webhook",
  "/api/tenant",
  "/api/auth",
  "/api/billing",
  "/api/supa-pull",
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Lógica de expiração
// ---------------------------------------------------------------------------

function isTenantExpired(
  expirationDate: string | null,
  isActive: boolean | null
): boolean {
  if (isActive === false) return true;
  if (!expirationDate) return false;
  const exp = new Date(expirationDate + "T23:59:59");
  return new Date() > exp;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function tenantAccessGuard(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const path = req.path;

  // 1. Só avalia rotas /api/*
  if (!path.startsWith("/api/")) {
    return next();
  }

  // 2. Rotas do allowlist passam sem verificação
  if (isAllowedPath(path)) {
    return next();
  }

  // 3. Identifica tenant
  const tenantId = req.headers["x-tenant-id"] as string | undefined;
  if (!tenantId) {
    return next();
  }

  // 4. Cache hit
  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    if (cached.isExpired) {
      res.status(403).json({
        error: "TENANT_EXPIRED",
        message:
          "Assinatura expirada. Renove para continuar usando o sistema.",
      });
      return;
    }
    return next();
  }

  // 5. Sem Supabase configurado → desenvolvimento local, libera
  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return next();
  }

  // 6. Busca no banco
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  supabase
    .from("tenants")
    .select("expiration_date, is_active")
    .eq("id", tenantId)
    .single()
    .then(
      ({ data, error }: { data: { expiration_date: string | null; is_active: boolean | null } | null; error: any }) => {
        if (error || !data) {
          cache.set(tenantId, { isExpired: false, cachedAt: Date.now() });
          next();
          return;
        }

        const expired = isTenantExpired(data.expiration_date, data.is_active);
        cache.set(tenantId, { isExpired: expired, cachedAt: Date.now() });

        if (expired) {
          res.status(403).json({
            error: "TENANT_EXPIRED",
            message:
              "Assinatura expirada. Renove para continuar usando o sistema.",
          });
          return;
        }

        next();
      },
      (err: unknown) => {
        console.error("[tenantAccessGuard] Erro na consulta Supabase:", err);
        next();
      }
    );
}
