-- Separar saldos por produto:
--   saldo_veiculo → Produto 1 (consulta veicular por placa)
--   saldo_cpf     → Produto 2 (consulta CPF e CNPJ)
-- O campo saldo genérico fica preservado para não quebrar nada durante a transição.

ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS saldo_veiculo numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_cpf     numeric(10,2) NOT NULL DEFAULT 0;

-- Opcional: migrar saldo existente para saldo_veiculo (descomentar se quiser)
-- UPDATE perfis SET saldo_veiculo = COALESCE(saldo, 0) WHERE saldo > 0;

-- Adicionar campo produto em transacoes_pix para o webhook saber qual coluna creditar
ALTER TABLE transacoes_pix
  ADD COLUMN IF NOT EXISTS produto text; -- 'veiculo' | 'cpf' | 'credito'
