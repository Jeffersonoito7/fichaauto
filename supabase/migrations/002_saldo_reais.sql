-- ═══════════════════════════════════════════════════════════
-- MIGRATION 002 — Saldo em R$ (substituição de saldo_consultas)
-- Rodar no Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Adicionar coluna saldo (R$) na tabela perfis
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS saldo numeric(10,2) DEFAULT 0;

-- 2. Adicionar coluna saldo_creditado na tabela transacoes_pix
ALTER TABLE transacoes_pix ADD COLUMN IF NOT EXISTS saldo_creditado numeric(10,2);

-- 3. Atualizar saldo_creditado para transações pagas que tinham consultas
UPDATE transacoes_pix
SET saldo_creditado = consultas * 36.90
WHERE saldo_creditado IS NULL
  AND consultas IS NOT NULL
  AND consultas > 0;
