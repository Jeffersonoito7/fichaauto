-- ═══════════════════════════════════════════════════════════════
-- Tenants (clientes da plataforma white-label)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tenants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  slug          text NOT NULL UNIQUE,         -- ex: "ficha-auto", "autoville", "avp"
  plano         text NOT NULL DEFAULT 'b2c',  -- b2c | whitelabel | protecao
  logo_url      text,
  cor_primaria  text NOT NULL DEFAULT '#00A651',
  cor_escura    text NOT NULL DEFAULT '#007A3D',
  site          text,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- Tenant padrão (Ficha Auto)
INSERT INTO tenants (id, nome, slug, plano, cor_primaria, cor_escura, site)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Ficha Auto',
  'ficha-auto',
  'b2c',
  '#00A651',
  '#007A3D',
  'fichaauto.com.br'
) ON CONFLICT (slug) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- Módulos disponíveis por tenant
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tenant_modulos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  modulo_id   text NOT NULL,   -- corresponde ao ModuloId do TypeScript
  habilitado  boolean NOT NULL DEFAULT false,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, modulo_id)
);

-- Habilitar todos os módulos de veículos para o tenant padrão (Ficha Auto)
INSERT INTO tenant_modulos (tenant_id, modulo_id, habilitado)
SELECT
  '00000000-0000-0000-0000-000000000001',
  m.modulo_id,
  m.habilitado
FROM (VALUES
  ('placa',               true),
  ('binFederal',          true),
  ('sinistro',            true),
  ('gravame',             true),
  ('leilao',              true),
  ('chassi',              true),
  ('historicoVeiculosCpf',false),
  ('cpfBasico',           false),
  ('cpfScore',            false),
  ('cpfProcessos',        false),
  ('cpfProtestos',        false),
  ('cpfEnderecos',        false),
  ('cpfTelefones',        false),
  ('cpfRenda',            false),
  ('cpfPep',              false),
  ('cpfSocietario',       false),
  ('cpfRelacionamentos',  false),
  ('cnpjBasico',          false),
  ('cnpjQsa',             false),
  ('cnpjScore',           false),
  ('cnpjProcessos',       false),
  ('cnpjProtestos',       false),
  ('cnpjRelacionadas',    false)
) AS m(modulo_id, habilitado)
ON CONFLICT (tenant_id, modulo_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- Usuários vinculados a tenants
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tenant_usuarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,   -- auth.users.id do Supabase
  role        text NOT NULL DEFAULT 'user',  -- user | admin | super_admin
  creditos    integer NOT NULL DEFAULT 0,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);


-- ═══════════════════════════════════════════════════════════════
-- Histórico de consultas
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS consultas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  user_id      uuid,
  tipo         text NOT NULL,    -- placa | cpf | cnpj
  input        text NOT NULL,    -- placa/cpf/cnpj consultado
  modulos      text[] NOT NULL,  -- módulos executados
  resultado    jsonb,
  custo        integer NOT NULL DEFAULT 0,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultas_tenant_idx ON consultas(tenant_id);
CREATE INDEX IF NOT EXISTS consultas_user_idx   ON consultas(user_id);
CREATE INDEX IF NOT EXISTS consultas_input_idx  ON consultas(input);


-- ═══════════════════════════════════════════════════════════════
-- RLS — super admin vê tudo, admin vê só seu tenant
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE tenants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas      ENABLE ROW LEVEL SECURITY;

-- Service role bypassa RLS (usado pelo backend)
CREATE POLICY "service_role_all" ON tenants
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON tenant_modulos
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON tenant_usuarios
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON consultas
  USING (auth.role() = 'service_role');
