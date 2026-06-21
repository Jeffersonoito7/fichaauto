-- Tabela de cache de placas
-- Alimentada automaticamente por consultas pagas.
-- Serve a consulta gratuita sem custo de API.

CREATE TABLE IF NOT EXISTS cache_placas (
  placa        TEXT PRIMARY KEY,
  marca        TEXT,
  modelo       TEXT,
  ano_fab      TEXT,
  ano_mod      TEXT,
  cor          TEXT,
  combustivel  TEXT,
  renavam      TEXT,
  chassi       TEXT,
  codigo_fipe  TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para busca por data (filtragem de TTL)
CREATE INDEX IF NOT EXISTS idx_cache_placas_atualizado ON cache_placas (atualizado_em);

-- Sem RLS: acesso apenas via service_role (backend)
ALTER TABLE cache_placas DISABLE ROW LEVEL SECURITY;
