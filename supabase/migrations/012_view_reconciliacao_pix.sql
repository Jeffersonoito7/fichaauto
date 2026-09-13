-- View de reconciliacao: transacoes PIX pagas vs saldo atual do usuario
-- Uso: SELECT * FROM reconciliacao_pix ORDER BY pago_em DESC;
CREATE OR REPLACE VIEW reconciliacao_pix AS
SELECT
  t.txid,
  t.status,
  t.produto,
  t.valor::numeric                       AS valor_cobrado,
  t.saldo_creditado::numeric             AS saldo_creditado,
  t.creditos_creditados::numeric         AS creditos_creditados,
  t.pago_em,
  t.created_at                           AS criado_em,
  t.user_id,
  p.email                                AS usuario_email,
  p.saldo_veiculo::numeric               AS saldo_veiculo_atual,
  p.saldo_cpf::numeric                   AS saldo_cpf_atual,
  p.creditos_credito::numeric            AS creditos_credito_atual,
  t.tenant_id,
  te.nome                                AS tenant_nome,
  te.assinatura_ativa                    AS tenant_ativo,
  te.assinatura_vence_em                 AS tenant_vence_em
FROM transacoes_pix t
LEFT JOIN perfis   p  ON p.user_id   = t.user_id
LEFT JOIN tenants  te ON te.id       = t.tenant_id
WHERE t.status = 'pago';

COMMENT ON VIEW reconciliacao_pix IS
  'Reconciliacao PIX: transacoes pagas com saldo atual do usuario/tenant. '
  'Divergencia entre saldo_creditado e saldo atual indica duplo credito ou estorno manual.';
