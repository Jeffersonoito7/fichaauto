-- ============================================================================
-- 022_valor_pago_no_pix.sql
--
-- Guarda QUANTO foi efetivamente pago em cada PIX.
--
-- Achado na auditoria de 09/10/2026: o webhook marcava a transacao como paga e
-- creditava o valor da COBRANCA gravada aqui, sem nunca olhar o valor que a
-- pessoa realmente pagou (campo `valor` do payload da Efi). Cobranca de
-- R$ 1.000 paga com R$ 1,00 creditava R$ 1.000, sem nada parecer errado.
--
-- Sem esta coluna nao havia nem como auditar depois: o valor pago simplesmente
-- nao era registrado em lugar nenhum. Agora toda notificacao grava o que
-- entrou, mesmo quando o valor confere, para conciliacao futura.
--
-- O status 'divergente' nao precisa de migration: a coluna `status` e texto
-- livre, sem CHECK. Transacao nesse estado NAO credita saldo e fica aguardando
-- conferencia humana, porque decidir o que fazer com pagamento a menor e regra
-- de negocio do dono, nao do codigo.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- ============================================================================

alter table public.transacoes_pix
  add column if not exists valor_pago numeric(10,2) null;

comment on column public.transacoes_pix.valor_pago is
  'Valor efetivamente pago, vindo do payload da Efi. Nulo em transacao anterior a 10/10/2026, quando o dado nao era registrado. Divergencia com `valor` marca status=divergente e NAO credita.';

-- Para achar rapido o que ficou parado esperando conferencia humana.
create index if not exists transacoes_pix_divergente
  on public.transacoes_pix (status, created_at)
  where status = 'divergente';

-- Verificacao:
--   select txid, valor, valor_pago, status, pago_em
--     from public.transacoes_pix
--    where status = 'divergente' or valor_pago is distinct from valor
--    order by created_at desc;
