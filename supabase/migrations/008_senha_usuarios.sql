-- Adiciona campo de senha para login de usuarios comuns
-- e campos tenant_id / tenant_role caso nao existam

ALTER TABLE perfis ADD COLUMN IF NOT EXISTS senha_hash text;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS tenant_id  uuid REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS tenant_role text DEFAULT 'user' CHECK (tenant_role IN ('user', 'admin'));

CREATE INDEX IF NOT EXISTS idx_perfis_tenant_id ON perfis(tenant_id);
