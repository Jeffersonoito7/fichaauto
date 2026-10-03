-- ─────────────────────────────────────────────────────────────────────────────
-- 015 — transacoes_pix: permitir cobranca sem usuario (visitante) e colunas
--       usadas pelo fluxo de consulta avulsa.
--
-- CONTEXTO (incidente 02/10/2026): um visitante pagou R$ 34,00 pela consulta
-- avulsa da placa RZF6D15 e nunca recebeu o relatorio. A rota
-- app/api/consulta/avulsa/gerar grava user_id = null, porque compra avulsa e de
-- visitante sem conta, mas a coluna nasceu NOT NULL em
-- 000_schema_completo_ficha_auto.sql. O insert falhava sempre e, como o codigo
-- nao conferia o erro, a rota entregava o QR code mesmo assim: dinheiro entrava
-- na Efi sem nenhuma linha no banco para honrar.
--
-- A recarga de empresa (produto 'recarga_tenant') sofre do mesmo problema: ela
-- nem envia user_id, porque quem compra e a EMPRESA (tenant_id), nao a pessoa.
--
-- Decisao: user_id passa a ser NULLABLE. No modelo de negocio existem tres
-- donos legitimos de uma cobranca: usuario (user_id), empresa (tenant_id) e
-- visitante (nenhum dos dois, identificado pelo pedido_id). Uma CHECK garante
-- que cobranca de visitante so existe para produto 'avulsa', para que nao se
-- grave por acidente uma recarga orfa, sem dono para creditar.
--
-- Migration idempotente: pode rodar mais de uma vez sem efeito colateral.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. user_id deixa de ser obrigatorio.
ALTER TABLE transacoes_pix ALTER COLUMN user_id DROP NOT NULL;

-- 2. Colunas que o fluxo avulso usa e que nenhuma migration havia criado.
--    pedido_id      identifica o pedido do visitante (sem conta) no retorno da rota.
--    descricao      guarda a placa consultada (o webhook le dela para consultar).
--    resultado_token token de 48h com que o visitante abre o relatorio pago.
ALTER TABLE transacoes_pix ADD COLUMN IF NOT EXISTS pedido_id       uuid;
ALTER TABLE transacoes_pix ADD COLUMN IF NOT EXISTS descricao       text;
ALTER TABLE transacoes_pix ADD COLUMN IF NOT EXISTS resultado_token text;

CREATE INDEX IF NOT EXISTS idx_transacoes_pix_pedido_id
  ON transacoes_pix(pedido_id) WHERE pedido_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_pix_resultado_token
  ON transacoes_pix(resultado_token) WHERE resultado_token IS NOT NULL;

-- 3. Toda cobranca precisa de um dono para honrar o pagamento.
--    Sem user_id e sem tenant_id, so e aceita a compra avulsa de visitante.
ALTER TABLE transacoes_pix DROP CONSTRAINT IF EXISTS transacoes_pix_dono_check;
ALTER TABLE transacoes_pix ADD CONSTRAINT transacoes_pix_dono_check CHECK (
  user_id   IS NOT NULL
  OR tenant_id IS NOT NULL
  OR produto = 'avulsa'
);
