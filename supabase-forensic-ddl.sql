-- ============================================================
-- CAIXA PRETA FORENSE — Gestão Modello
-- Criado em: 22/07/2026
-- Descrição: Tabela de auditoria técnica para rastrear eventos
--            críticos no ciclo de vida das comandas.
-- Uso: Executar no SQL Editor do Supabase (uma única vez)
-- ============================================================

-- 1. CRIAR TABELA
CREATE TABLE IF NOT EXISTS forensic_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),

  event_type    text        NOT NULL,

  request_id    uuid,

  device_id     text,
  tab_id        text,

  tenant_id     text,

  entity_type   text,
  entity_id     text,

  payload_json  jsonb,
  response_json jsonb,

  exists_before boolean,
  exists_after  boolean,

  duration_ms   integer,

  logged_user   text,
  app_version   text,
  ip_address    text,

  metadata      jsonb
);

-- 2. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_forensic_events_created_at  ON forensic_events (created_at);
CREATE INDEX IF NOT EXISTS idx_forensic_events_event_type  ON forensic_events (event_type);
CREATE INDEX IF NOT EXISTS idx_forensic_events_request_id  ON forensic_events (request_id);
CREATE INDEX IF NOT EXISTS idx_forensic_events_entity_id   ON forensic_events (entity_id);
CREATE INDEX IF NOT EXISTS idx_forensic_events_tenant_id   ON forensic_events (tenant_id);

-- 3. PERMISSÕES (permitir insert anônimo via service_role key)
ALTER TABLE forensic_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_insert" ON forensic_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY "service_role_select" ON forensic_events
  FOR SELECT
  TO service_role
  USING (true);

-- 4. COMENTÁRIOS
COMMENT ON TABLE  forensic_events IS 'Caixa Preta Forense — auditoria técnica de eventos do sistema';
COMMENT ON COLUMN forensic_events.event_type    IS 'DELETE_REQUEST | DELETE_CONFIRM | DELETE_API_RECEIVED | DELETE_DB_BEFORE | DELETE_DB_AFTER | SUPA_SYNC_BEFORE_UPSERT | SUPA_SYNC_AFTER_UPSERT | SUPA_PULL_RESPONSE | ERROR';
COMMENT ON COLUMN forensic_events.request_id    IS 'UUID que rastreia o fluxo completo (ex: DELETE → supa-sync)';
COMMENT ON COLUMN forensic_events.entity_type   IS 'comanda | financial | tenant | professional';
COMMENT ON COLUMN forensic_events.entity_id     IS 'ID da entidade afetada';
COMMENT ON COLUMN forensic_events.exists_before IS 'Existia no banco antes da operação?';
COMMENT ON COLUMN forensic_events.exists_after  IS 'Existe no banco depois da operação?';
COMMENT ON COLUMN forensic_events.duration_ms   IS 'Tempo total da operação em milissegundos';
COMMENT ON COLUMN forensic_events.metadata      IS 'metadados adicionais (stack, origem, watch_ticket, etc.)';
