/**
 * tenantPixConfig.ts
 * ----------------------------------------------------------------
 * Cliente HTTP para a fonte única de verdade de configuração de
 * PIX por tenant. Toda leitura/gravação de PIX passa por aqui.
 *
 * REGRAS:
 *  - PIX é buscado APENAS via GET /api/tenant-pix-config/:tenantId
 *  - PIX é gravado APENAS via POST /api/tenant-pix-config
 *  - Nenhum fallback para `tenants`
 *  - Nenhum uso de localStorage
 *  - Nenhum polling automático: o caller decide quando ler
 */

import type { TenantPixConfig, PixKeyType } from '../../types';

const BASE = '/api/tenant-pix-config';

/**
 * Busca a configuração de PIX de um tenant. Devolve `null` se
 * o tenant não tem config cadastrada (não é erro).
 */
export async function fetchTenantPixConfig(
  tenantId: string
): Promise<TenantPixConfig | null> {
  if (!tenantId) return null;
  const res = await fetch(`${BASE}/${encodeURIComponent(tenantId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw new Error(`[pix] GET falhou: HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    success: boolean;
    isMock?: boolean;
    config: TenantPixConfig | null;
  };
  if (!json.success) {
    throw new Error(`[pix] GET respondeu success=false`);
  }
  return json.config || null;
}

/**
 * Grava (UPSERT) a configuração de PIX de um tenant.
 * `pix_key_type` deve ser um dos: 'telefone' | 'cnpj' | 'email' | 'aleatoria'.
 */
export async function saveTenantPixConfig(input: {
  tenant_id: string;
  pix_key_type: PixKeyType;
  pix_key: string;
}): Promise<TenantPixConfig> {
  if (!input.tenant_id) throw new Error('[pix] tenant_id é obrigatório');
  if (!input.pix_key) throw new Error('[pix] pix_key é obrigatório');
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[pix] POST falhou: HTTP ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    success: boolean;
    config: TenantPixConfig;
  };
  if (!json.success || !json.config) {
    throw new Error(`[pix] POST respondeu success=false`);
  }
  return json.config;
}
