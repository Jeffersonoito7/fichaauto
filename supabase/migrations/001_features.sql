-- ═══════════════════════════════════════════════════════════
-- FICHA AUTO — MIGRATIONS
-- Rodar no Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Tabela de histórico de consultas
CREATE TABLE IF NOT EXISTS consultas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text,
  tipo        text NOT NULL,  -- 'veiculo' | 'cpf' | 'cnpj'
  documento   text NOT NULL,
  descricao   text,
  status      text DEFAULT 'realizada',
  plano       text DEFAULT 'completa',
  token       text UNIQUE,                -- link compartilhável
  resultado   jsonb,                      -- dados da consulta para o link
  expires_at  timestamptz,                -- expiração do link (48h)
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultas_email    ON consultas(email);
CREATE INDEX IF NOT EXISTS idx_consultas_token    ON consultas(token);
CREATE INDEX IF NOT EXISTS idx_consultas_created  ON consultas(created_at DESC);

-- 2. Tabela de monitoramentos
CREATE TABLE IF NOT EXISTS monitoramentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL,
  tipo            text NOT NULL DEFAULT 'veiculo',
  documento       text NOT NULL,
  descricao       text,
  ativo           boolean DEFAULT true,
  ultimo_hash     text,          -- hash do último resultado para detectar mudança
  ultimo_check    timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoramentos_email  ON monitoramentos(email);
CREATE INDEX IF NOT EXISTS idx_monitoramentos_ativo  ON monitoramentos(ativo);

-- 3. Tabela de chaves de API
CREATE TABLE IF NOT EXISTS api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  nome        text NOT NULL,
  chave       text UNIQUE NOT NULL,
  ativa       boolean DEFAULT true,
  consultas_usadas integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_chave ON api_keys(chave);
CREATE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys(email);
