-- ============================================================================
-- 018_debitar_saldo_cpf_tenant.sql
--
-- O caixa e DA EMPRESA, nao do operador (regra de negocio do produto). Isso ja
-- valia para consulta veicular, via debitar_saldo_tenant sobre tenants.saldo_veiculo.
-- Para CPF/CNPJ nao existia funcao equivalente, e as rotas debitavam
-- perfis.saldo_cpf, ou seja a carteira individual do operador. As colunas
-- tenants.saldo_cpf e tenants.preco_cpf ja existiam (migration 004) e nao eram
-- usadas por codigo nenhum.
--
-- Esta migration cria a contraparte de debitar_saldo_tenant para saldo_cpf.
-- A forma e COPIADA da funcao existente (lida em producao com
-- pg_get_functiondef), para ter exatamente as mesmas garantias:
--   - UPDATE condicional com "AND saldo_cpf >= p_valor": a verificacao de saldo
--     e o debito acontecem na MESMA instrucao, sob o lock de linha do Postgres.
--     Dois operadores da mesma empresa consultando ao mesmo tempo nao conseguem
--     gastar o mesmo saldo duas vezes (era o furo de ler-depois-escrever).
--   - RETURNING ... INTO: v_novo fica NULL quando nenhuma linha casou, o que
--     cobre tanto "saldo insuficiente" quanto "tenant inexistente".
--   - Saldo insuficiente nao e excecao: retorna (false, saldo_atual) para a
--     aplicacao montar a mensagem de recarga sem perder a transacao.
--
-- SEGURANCA (ver migration 016): a funcao e SECURITY DEFINER, portanto IGNORA
-- RLS. A auditoria de 02/10 encontrou as RPCs de saldo antigas com EXECUTE
-- liberado para anon/authenticated, o que permitia a qualquer portador da chave
-- publishable (que e publica, vai no bundle do navegador) mexer em saldo pela
-- REST API. Aqui o EXECUTE e revogado de public/anon/authenticated e concedido
-- SO para service_role, que e o unico papel que a aplicacao usa para falar com
-- esta funcao (lib/saldo.ts, via createServiceRoleClient).
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- ============================================================================

begin;

create or replace function public.debitar_saldo_cpf_tenant(
  p_tenant_id uuid,
  p_valor     numeric
)
returns table(sucesso boolean, saldo_restante numeric)
language plpgsql
security definer
as $function$
DECLARE
  v_novo numeric;
BEGIN
  UPDATE tenants
     SET saldo_cpf     = saldo_cpf - p_valor,
         atualizado_em = now()
   WHERE id = p_tenant_id
     AND saldo_cpf >= p_valor
  RETURNING saldo_cpf INTO v_novo;

  IF v_novo IS NULL THEN
    SELECT t.saldo_cpf INTO v_novo FROM tenants t WHERE t.id = p_tenant_id;
    RETURN QUERY SELECT false, COALESCE(v_novo, 0::numeric);
  ELSE
    RETURN QUERY SELECT true, v_novo;
  END IF;
END;
$function$;

-- search_path fixo: a funcao e SECURITY DEFINER e nao pode resolver "tenants"
-- por um schema que o chamador controle.
alter function public.debitar_saldo_cpf_tenant(uuid, numeric)
  set search_path = public, pg_temp;

-- Fechar o EXECUTE. "create function" concede EXECUTE a PUBLIC por padrao,
-- entao o revoke abaixo nao e opcional.
revoke all on function public.debitar_saldo_cpf_tenant(uuid, numeric)
  from public, anon, authenticated;

grant execute on function public.debitar_saldo_cpf_tenant(uuid, numeric)
  to service_role;

commit;

-- ============================================================================
-- VERIFICACAO (rodar depois do commit)
--
--   -- Esperado: anon_exec = false, auth_exec = false, svc_exec = true
--   select has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_exec,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec,
--          has_function_privilege('service_role',  p.oid, 'EXECUTE') as svc_exec
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'debitar_saldo_cpf_tenant';
--
--   -- Teste negativo de saldo (nao altera nada quando falta saldo):
--   -- select * from public.debitar_saldo_cpf_tenant('<tenant>'::uuid, 999999);
--   -- Esperado: sucesso = false e saldo_restante = saldo atual, intacto.
-- ============================================================================
