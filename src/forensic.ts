import { APP_VERSION } from './version';

export const WATCH_TICKETS = [
  "CMD-000109",
  "CMD-424",
  "CMD-000350",
  "CMD-000113",
  "CMD-00064",
  "CMD-000261"
];

const TAB_ID: string = (() => {
  if (typeof sessionStorage !== 'undefined') {
    let id = sessionStorage.getItem('FORENSIC_TAB_ID');
    if (!id) {
      id = 'TAB-' + Math.random().toString(36).substr(2, 4).toUpperCase();
      sessionStorage.setItem('FORENSIC_TAB_ID', id);
    }
    return id;
  }
  return 'SERVER';
})();

export function TS(): string {
  const d = new Date();
  return d.toLocaleTimeString('pt-BR', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

export function TAB(): string {
  return TAB_ID;
}

export function shortStack(skip: number = 2): string {
  try {
    const e = new Error();
    const lines = e.stack?.split('\n') || [];
    const relevant = lines.slice(skip + 1, skip + 4).map(l => l.trim().replace(/^at /, ''));
    return relevant.join(' ← ');
  } catch {
    return '';
  }
}

export function checkWatchlist(comandas: { ticketNumber?: string; id?: string; status?: string; clientName?: string }[]): { ticket: string; id?: string; status?: string; clientName?: string }[] {
  const found: { ticket: string; id?: string; status?: string; clientName?: string }[] = [];
  for (const c of comandas) {
    if (c.ticketNumber && WATCH_TICKETS.includes(c.ticketNumber)) {
      found.push({ ticket: c.ticketNumber, id: c.id, status: c.status, clientName: c.clientName });
    }
  }
  return found;
}

export function watchReport(prefix: string, comandas: { ticketNumber?: string; id?: string; status?: string; clientName?: string }[]): void {
  const found = checkWatchlist(comandas);
  if (found.length > 0) {
    console.error(`%c[WATCH] ${prefix} COMANDAS MONITORADAS ENCONTRADAS: ${found.map(f => `${f.ticket}(${f.id})`).join(', ')}`, 'background:red;color:white;font-weight:bold');
    found.forEach(f => console.error(`[WATCH]   → ticket=${f.ticket} id=${f.id} status=${f.status} cliente=${f.clientName}`));
  } else {
    console.log(`[WATCH] ${prefix} Nenhuma comanda monitorada encontrada`);
  }
}

export function watchTicketsPresent(arr: { ticketNumber?: string }[]): string {
  return WATCH_TICKETS.map(t => {
    const found = arr.some(c => c.ticketNumber === t);
    return `${t} → ${found ? 'ENCONTRADA' : 'NÃO ENCONTRADA'}`;
  }).join(' | ');
}

export function ticketSummary(arr: { ticketNumber?: string; id?: string }[]): string {
  return arr.map(c => `${c.ticketNumber||'?'}(${c.id||'?'})`).join(',');
}

const DEVICE_ID_KEY = 'FORENSIC_DEVICE_ID';

export function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return 'SERVER';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'DEV-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export interface SyncMetadata {
  deviceId: string;
  tabId: string;
  userAgent: string;
  platform: string;
  screen: string;
  url: string;
  timestamp: string;
}

export function getSyncMetadata(): SyncMetadata {
  return {
    deviceId: getDeviceId(),
    tabId: TAB(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SERVER',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'SERVER',
    screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'SERVER',
    url: typeof window !== 'undefined' ? window.location.href : 'SERVER',
    timestamp: new Date().toISOString(),
  };
}

// ─── CAIXA PRETA FORENSE — TIPOS ────────────────────────────────────────────

export type ForensicEventType =
  | 'DELETE_REQUEST'
  | 'DELETE_CONFIRM'
  | 'DELETE_API_RECEIVED'
  | 'DELETE_DB_BEFORE'
  | 'DELETE_DB_AFTER'
  | 'SUPA_SYNC_BEFORE_UPSERT'
  | 'SUPA_SYNC_AFTER_UPSERT'
  | 'SUPA_PULL_RESPONSE'
  | 'ERROR';

export interface IForensicEvent {
  event_type:     ForensicEventType;
  request_id?:    string;
  device_id?:     string;
  tab_id?:        string;
  tenant_id?:     string;
  entity_type?:   string;
  entity_id?:     string;
  payload_json?:  unknown;
  response_json?: unknown;
  exists_before?: boolean;
  exists_after?:  boolean;
  duration_ms?:   number;
  logged_user?:   string;
  app_version?:   string;
  ip_address?:    string;
  metadata?:      Record<string, unknown>;
}

// ─── CAIXA PRETA FORENSE — CONFIGURAÇÃO ────────────────────────────────────

const FORENSIC_MODE_KEY = 'FORENSIC_MODE';

export function getForensicMode(): boolean {
  if (typeof process !== 'undefined' && process.env?.FORENSIC_MODE) {
    return process.env.FORENSIC_MODE === 'true';
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(FORENSIC_MODE_KEY) === 'true';
  }
  return false;
}

export function setForensicMode(enabled: boolean): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(FORENSIC_MODE_KEY, enabled ? 'true' : 'false');
  }
}

// ─── CAIXA PRETA FORENSE — REQUEST ID ───────────────────────────────────────

export function generateRequestId(): string {
  return 'req_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── CAIXA PRETA FORENSE — CONTEXTO ─────────────────────────────────────────

export interface IForensicContext {
  requestId:   string;
  deviceId:    string;
  tabId:       string;
  appVersion:  string;
  origin:      string;
  loggedUser?: string;
  tenantId?:   string;
  ipAddress?:  string;
}

export function createForensicContext(extra?: Partial<IForensicContext>): IForensicContext {
  return {
    requestId:   generateRequestId(),
    deviceId:    getDeviceId(),
    tabId:       TAB(),
    appVersion:  typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.0.0',
    origin:      typeof window !== 'undefined' ? 'browser' : 'server',
    ...extra,
  };
}

// ─── CAIXA PRETA FORENSE — INSERT ───────────────────────────────────────────

export async function insertForensicEvent(
  supabase: unknown | null,
  event: IForensicEvent,
  context?: IForensicContext,
): Promise<void> {
  if (!getForensicMode()) {
    console.log(`[FORENSIC] ${event.event_type} ${event.entity_type||''} ${event.entity_id||''} ${event.metadata?.watch_ticket ? '(WATCH)' : ''}`);
    return;
  }

  const row: Record<string, unknown> = {
    event_type:    event.event_type,
    request_id:    event.request_id || context?.requestId || null,
    device_id:     event.device_id || context?.deviceId || null,
    tab_id:        event.tab_id || context?.tabId || null,
    tenant_id:     event.tenant_id || context?.tenantId || null,
    entity_type:   event.entity_type || null,
    entity_id:     event.entity_id || null,
    payload_json:  event.payload_json ? JSON.parse(JSON.stringify(event.payload_json)) : null,
    response_json: event.response_json ? JSON.parse(JSON.stringify(event.response_json)) : null,
    exists_before: event.exists_before ?? null,
    exists_after:  event.exists_after ?? null,
    duration_ms:   event.duration_ms ?? null,
    logged_user:   event.logged_user || context?.loggedUser || null,
    app_version:   event.app_version || context?.appVersion || '0.0.0',
    ip_address:    event.ip_address || context?.ipAddress || null,
    metadata:      event.metadata ? JSON.parse(JSON.stringify(event.metadata)) : null,
  };

  // Se está no servidor (supabase client disponível), insere direto
  if (supabase) {
    try {
      const { error } = await (supabase as any).from('forensic_events').insert(row);
      if (error) {
        console.error('[FORENSIC] Erro ao inserir evento:', error.message);
      }
    } catch (err) {
      console.error('[FORENSIC] Erro ao inserir evento:', err);
    }
    return;
  }

  // Se está no navegador, envia via REST
  try {
    const res = await fetch('/api/forensic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      console.warn('[FORENSIC] Erro ao enviar evento via REST:', res.status);
    }
  } catch (err) {
    console.warn('[FORENSIC] Erro ao enviar evento via REST:', err);
  }
}


