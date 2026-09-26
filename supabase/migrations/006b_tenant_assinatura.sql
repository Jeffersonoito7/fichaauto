-- Migration 006: modelo de assinatura B2B unica por tenant
-- R$ 1.500/mes, todos os modulos liberados, consumo ilimitado

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS assinatura_ativa   boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assinatura_vence_em timestamptz;

-- Indice para checagem rapida de assinatura ativa
CREATE INDEX IF NOT EXISTS idx_tenants_assinatura
  ON tenants(assinatura_ativa, assinatura_vence_em);
