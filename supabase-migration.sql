-- ================================================================
-- MIGRATION: Planos de recarga + permissões de usuários
-- Rodar no Supabase: Dashboard → SQL Editor → New query → Run
-- ================================================================

-- 1. Tabela de pacotes/planos de recarga
CREATE TABLE IF NOT EXISTS planos_recarga (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  nome          text    NOT NULL,
  consultas     int     NOT NULL,
  preco         numeric(10,2) NOT NULL,
  descricao     text,
  destaque      boolean DEFAULT false,
  economia_texto text,
  ativo         boolean DEFAULT true,
  ordem         int     DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- Pacotes padrão (mesmos preços atuais)
INSERT INTO planos_recarga (nome, consultas, preco, descricao, destaque, economia_texto, ordem)
VALUES
  ('Pacote Básico',        5,  129.90, '5 consultas Ficha Auto',  false, null,                 1),
  ('Pacote Popular',      10,  197.00, '10 consultas Ficha Auto', true,  'Economize R$ 62,90', 2),
  ('Pacote Profissional', 20,  347.00, '20 consultas Ficha Auto', false, 'Economize R$ 151,00',3)
ON CONFLICT DO NOTHING;

-- 2. Adicionar colunas de permissões à tabela perfis (seguras mesmo se já existirem)
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS nome           text;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS email          text;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS ativo          boolean DEFAULT true;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS pode_placa     boolean DEFAULT true;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS pode_cpf       boolean DEFAULT false;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS pode_cnpj      boolean DEFAULT false;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS pode_lote      boolean DEFAULT false;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS obs_admin         text;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS plano             text;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS modulos_liberados text[] DEFAULT '{}'::text[];
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS cpf_cnpj          text;

-- 3. RLS: permitir service_role acessar planos_recarga
ALTER TABLE planos_recarga ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública dos planos ativos"
  ON planos_recarga FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin gerencia planos"
  ON planos_recarga FOR ALL
  USING (true)
  WITH CHECK (true);
