-- White-label: tabela de tenants (revendas, seguradoras, despachantes)
-- Cada tenant tem sua propria identidade visual e dominio

CREATE TABLE IF NOT EXISTS tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,           -- ex: revendaabc (usado em subdominio padrao)
  nome            TEXT NOT NULL,                  -- ex: Revenda ABC Veiculos
  dominio         TEXT UNIQUE,                    -- ex: consulta.revendaabc.com.br
  logo_url        TEXT,                           -- URL da logo (upload ou link externo)
  cor_primaria    TEXT NOT NULL DEFAULT '#00A651',
  cor_secundaria  TEXT NOT NULL DEFAULT '#0055A4',
  cor_texto       TEXT NOT NULL DEFAULT '#FFFFFF', -- cor do texto sobre cor_primaria
  nome_fantasia   TEXT,                           -- nome exibido no sistema (pode diferir do nome juridico)
  telefone        TEXT,
  email_contato   TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  -- Saldo proprio do tenant (debitado a cada consulta dos usuarios do tenant)
  saldo_veiculo   NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_cpf       NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Preco que o tenant cobra dos seus proprios usuarios (opcional, para repassar)
  preco_veiculo   NUMERIC(10,2),
  preco_cpf       NUMERIC(10,2),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vincular usuarios a tenants
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS tenant_role TEXT DEFAULT 'user'; -- 'admin' = admin da revenda

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug    ON tenants (slug);
CREATE INDEX IF NOT EXISTS idx_tenants_dominio ON tenants (dominio);
CREATE INDEX IF NOT EXISTS idx_perfis_tenant   ON perfis  (tenant_id);

-- Sem RLS: acesso apenas via service_role
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
