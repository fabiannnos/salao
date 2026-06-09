import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

interface CacheEntry {
  isExpired: boolean;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidateTenantCache(tenantId: string): void {
  cache.delete(tenantId);
}

export function clearTenantCache(): void {
  cache.clear();
}

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
  "/api/supa-sync",
  "/api/admin",
  "/api/checkout",
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function extractTenantId(req: Request): string | null {
  if (req.headers["x-tenant-id"]) return req.headers["x-tenant-id"] as string;
  if (req.body?.salonId) return req.body.salonId;
  if (req.body?.tenant_id) return req.body.tenant_id;
  if (req.query?.salon_id) return req.query.salon_id as string;
  if (req.params?.tenantId) return req.params.tenantId;
  return null;
}

function getDaysOverdue(expirationDate: string): number {
  const exp = new Date(expirationDate + "T23:59:59");
  const now = new Date();
  return Math.max(0, Math.ceil((now.getTime() - exp.getTime()) / (1000 * 60 * 60 * 24)));
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function tenantAccessGuard(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const path = req.path;

  if (!path.startsWith("/api/")) return next();
  if (!WRITE_METHODS.has(req.method)) return next();
  if (isAllowedPath(path)) return next();

  const tenantId = extractTenantId(req);
  if (!tenantId) return next();

  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    if (cached.isExpired) {
      res.status(403).json({
        success: false,
        error: "Plano expirado. Conta em modo somente leitura.",
      });
      return;
    }
    return next();
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return next();
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  supabase
    .from("tenants")
    .select("expiration_date, is_active")
    .eq("id", tenantId)
    .single()
    .then(({ data }: { data: { expiration_date: string | null; is_active: boolean | null } | null }) => {
      if (!data) {
        cache.set(tenantId, { isExpired: false, cachedAt: Date.now() });
        return next();
      }

      const isActive = data.is_active !== false;
      const expirationDate = data.expiration_date;
      let expired = false;
      let daysOverdue = 0;

      if (!isActive) {
        expired = true;
        daysOverdue = 999;
      } else if (expirationDate) {
        daysOverdue = getDaysOverdue(expirationDate);
        expired = daysOverdue > 0;
      }

      cache.set(tenantId, { isExpired: expired, cachedAt: Date.now() });

      if (expired) {
        return res.status(403).json({
          success: false,
          error: "Plano expirado. Conta em modo somente leitura.",
          daysOverdue,
        });
      }

      next();
    })
    .catch((err: unknown) => {
      console.error("[tenantAccessGuard] Erro na consulta Supabase:", err);
      next();
    });
}
