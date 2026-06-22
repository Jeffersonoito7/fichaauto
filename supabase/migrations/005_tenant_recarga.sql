-- Migration 005: suporte a recarga de saldo por tenant (B2B)
-- Adiciona tenant_id em transacoes_pix para que o webhook saiba
-- se deve creditar o perfil individual ou o saldo do tenant.

ALTER TABLE transacoes_pix
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

-- Índice para consultas por tenant
CREATE INDEX IF NOT EXISTS idx_transacoes_pix_tenant_id
  ON transacoes_pix(tenant_id)
  WHERE tenant_id IS NOT NULL;
