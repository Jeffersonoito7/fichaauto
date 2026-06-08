-- ═══════════════════════════════════════════════════════════
-- MIGRATION 003 — Produto 3: Análise de Crédito
-- Rodar no Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Coluna de créditos do Produto 3 (contagem de consultas)
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS creditos_credito integer NOT NULL DEFAULT 0;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS pode_credito boolean NOT NULL DEFAULT false;

-- Coluna para rastrear créditos creditados em transações do Produto 3
ALTER TABLE transacoes_pix ADD COLUMN IF NOT EXISTS creditos_creditados integer;
