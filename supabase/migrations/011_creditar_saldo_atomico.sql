-- RPC para creditar saldo atomicamente, eliminando race condition de read+write
-- Uso: supabase.rpc('creditar_saldo', { p_user_id, p_campo, p_valor })
CREATE OR REPLACE FUNCTION creditar_saldo(
  p_user_id uuid,
  p_campo   text,
  p_valor   numeric
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_campo = 'saldo_veiculo' THEN
    UPDATE perfis SET saldo_veiculo     = saldo_veiculo     + p_valor, atualizado_em = now() WHERE user_id = p_user_id;
  ELSIF p_campo = 'saldo_cpf' THEN
    UPDATE perfis SET saldo_cpf         = saldo_cpf         + p_valor, atualizado_em = now() WHERE user_id = p_user_id;
  ELSIF p_campo = 'creditos_credito' THEN
    UPDATE perfis SET creditos_credito  = creditos_credito  + p_valor, atualizado_em = now() WHERE user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Campo invalido: %', p_campo;
  END IF;
END;
$$;
