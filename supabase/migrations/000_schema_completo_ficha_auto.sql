-- ═══════════════════════════════════════════════════════════════════════
-- FICHA AUTO — SCHEMA COMPLETO
-- Rodar UMA VEZ no Supabase: Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1. PERFIS DE USUÁRIOS
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfis (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome              text,
  email             text UNIQUE,
  cpf_cnpj          text,
  saldo             numeric(10,2) NOT NULL DEFAULT 0,
  role              text NOT NULL DEFAULT 'user',
  ativo             boolean NOT NULL DEFAULT true,
  pode_placa        boolean NOT NULL DEFAULT false,
  pode_cpf          boolean NOT NULL DEFAULT false,
  pode_cnpj         boolean NOT NULL DEFAULT false,
  pode_lote         boolean NOT NULL DEFAULT false,
  plano             text,
  modulos_liberados text[] NOT NULL DEFAULT '{}',
  obs_admin         text,
  atualizado_em     timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perfis_email ON perfis(email);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_perfis" ON perfis;
CREATE POLICY "service_role_perfis"
  ON perfis FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────
-- 2. TRANSAÇÕES PIX
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transacoes_pix (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txid            text UNIQUE NOT NULL,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor           numeric(10,2) NOT NULL,
  saldo_creditado numeric(10,2),
  status          text NOT NULL DEFAULT 'pendente',
  pago_em         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transacoes_txid   ON transacoes_pix(txid);
CREATE INDEX IF NOT EXISTS idx_transacoes_user   ON transacoes_pix(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON transacoes_pix(status);

ALTER TABLE transacoes_pix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_transacoes" ON transacoes_pix;
CREATE POLICY "service_role_transacoes"
  ON transacoes_pix FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────
-- 3. HISTÓRICO DE CONSULTAS
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text,
  tipo        text NOT NULL,
  documento   text NOT NULL,
  descricao   text,
  status      text NOT NULL DEFAULT 'realizada',
  token       text UNIQUE,
  resultado   jsonb,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultas_email   ON consultas(email);
CREATE INDEX IF NOT EXISTS idx_consultas_token   ON consultas(token);
CREATE INDEX IF NOT EXISTS idx_consultas_created ON consultas(created_at DESC);

ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_consultas" ON consultas;
CREATE POLICY "service_role_consultas"
  ON consultas FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────
-- 4. MONITORAMENTOS
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monitoramentos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  tipo         text NOT NULL DEFAULT 'veiculo',
  documento    text NOT NULL,
  descricao    text,
  ativo        boolean NOT NULL DEFAULT true,
  ultimo_hash  text,
  ultimo_check timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoramentos_email ON monitoramentos(email);
CREATE INDEX IF NOT EXISTS idx_monitoramentos_ativo ON monitoramentos(ativo);

ALTER TABLE monitoramentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_monitoramentos" ON monitoramentos;
CREATE POLICY "service_role_monitoramentos"
  ON monitoramentos FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────
-- 5. CHAVES DE API
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL,
  nome             text NOT NULL,
  chave            text UNIQUE NOT NULL,
  ativa            boolean NOT NULL DEFAULT true,
  consultas_usadas integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_chave ON api_keys(chave);
CREATE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys(email);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_api_keys" ON api_keys;
CREATE POLICY "service_role_api_keys"
  ON api_keys FOR ALL USING (true) WITH CHECK (true);
