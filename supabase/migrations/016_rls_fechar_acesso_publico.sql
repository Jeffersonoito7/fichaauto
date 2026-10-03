-- ============================================================================
-- 016_rls_fechar_acesso_publico.sql
--
-- CORRECAO DE FALHA CRITICA DE SEGURANCA (banco aberto / RLS inefetiva).
--
-- Achado (medido em producao, projeto riofyddjhizynxdokxyl, 02/10):
--   As 5 politicas existentes tem nome enganoso ("service_role_*") mas foram
--   criadas SEM a clausula "TO service_role". Em PostgreSQL, politica sem TO
--   vale para o papel PUBLIC, ou seja para anon e authenticated tambem. Com
--   "USING (true)" elas liberam TODA linha para qualquer portador da chave
--   publishable/anon, que e publica por natureza (vai no bundle do navegador).
--   Resultado comprovado: GET na API REST com a chave publishable retornou
--   dados reais de perfis (nome, e-mail, saldo, papel), consultas (e-mail do
--   consultante + placa), cache_placas (chassi, renavam) e tenants.
--   Alem disso, tenants e cache_placas estavam com relrowsecurity = false.
--
-- Estrategia escolhida: REMOVER as politicas permissivas, em vez de reescreve-las
-- com "TO service_role".
--   Por que: o papel service_role tem o atributo BYPASSRLS. Politica para
--   service_role e codigo morto, nunca avaliada, e so serve para confundir o
--   proximo leitor (foi exatamente essa confusao que abriu o furo). Com RLS
--   LIGADA e ZERO politicas o resultado e deny-all para anon e authenticated,
--   enquanto a service role continua lendo e escrevendo tudo. Esse e exatamente
--   o comportamento desejado aqui, com a menor quantidade de SQL possivel.
--
-- Impacto na aplicacao: NENHUM. Auditoria do codigo confirmou que 47 arquivos
--   usam service role (createServiceRoleClient() ou createClient(url,
--   SUPABASE_SERVICE_ROLE_KEY)) e que NENHUMA tela le o banco pelo navegador:
--   lib/supabase-client.ts (createBrowserClient) existe mas nao e importado em
--   lugar nenhum, e o unico uso do cliente anonimo no servidor
--   (app/api/pix/gerar/route.ts) chama apenas supabase.auth.getUser(), que fala
--   com o GoTrue e nao depende de RLS nestas tabelas.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Ligar RLS nas duas tabelas que estavam sem protecao alguma
-- ----------------------------------------------------------------------------
alter table public.tenants       enable row level security;
alter table public.cache_placas  enable row level security;

-- Nao usamos FORCE ROW LEVEL SECURITY: ele afetaria tambem o dono da tabela em
-- operacoes administrativas/migrations. A service role passa por BYPASSRLS, que
-- e um caminho separado e nao e impactado por FORCE.

-- ----------------------------------------------------------------------------
-- 2. Remover as politicas permissivas de nome enganoso
--    (todas eram roles={public}, cmd=ALL, qual=true, with_check=true)
-- ----------------------------------------------------------------------------
drop policy if exists "service_role_perfis"          on public.perfis;
drop policy if exists "service_role_consultas"       on public.consultas;
drop policy if exists "service_role_transacoes"      on public.transacoes_pix;
drop policy if exists "service_role_monitoramentos"  on public.monitoramentos;
drop policy if exists "service_role_api_keys"        on public.api_keys;

-- Residuo historico: a migration 0002_tenants_e_modulos.sql criou politicas
-- chamadas "service_role_all" com o mesmo defeito. Elas nao aparecem no banco
-- de producao hoje (0002 nao foi aplicada integralmente), mas os DROPs abaixo
-- garantem que nenhum ambiente fique com elas.
drop policy if exists "service_role_all" on public.tenants;
drop policy if exists "service_role_all" on public.consultas;

-- ----------------------------------------------------------------------------
-- 3. Garantir RLS ligada em TODAS as tabelas de public
--    (senha_tokens, audit_logs, config_financeiro, alertas_monitoramento e
--     cobrancas ja estao com RLS e zero politicas: ficam exatamente assim,
--     ou seja fechadas para anon/authenticated e abertas so para a service
--     role. Os comandos abaixo sao no-op para elas, e servem de rede para
--     qualquer tabela futura.)
-- ----------------------------------------------------------------------------
alter table public.perfis                enable row level security;
alter table public.consultas             enable row level security;
alter table public.transacoes_pix        enable row level security;
alter table public.monitoramentos        enable row level security;
alter table public.api_keys              enable row level security;
alter table public.senha_tokens          enable row level security;
alter table public.audit_logs            enable row level security;
alter table public.config_financeiro     enable row level security;
alter table public.alertas_monitoramento enable row level security;
alter table public.cobrancas             enable row level security;

-- ----------------------------------------------------------------------------
-- 4. Segundo furo encontrado na mesma auditoria: RPCs SECURITY DEFINER com
--    EXECUTE liberado para anon.
--
--    creditar_saldo, creditar_saldo_tenant e debitar_saldo_tenant sao SECURITY
--    DEFINER (rodam como o dono da tabela, portanto IGNORAM RLS) e hoje podem
--    ser chamadas com a chave publishable via POST /rest/v1/rpc/<nome>.
--    Isso permite a qualquer pessoa na internet se creditar saldo arbitrario,
--    independentemente das politicas acima. Fechar a RLS sem revogar isso
--    deixaria o prejuizo financeiro de pe.
--
--    Seguro para a aplicacao: as tres sao chamadas apenas com a service role
--    (app/api/pix/webhook/route.ts e lib/saldo.ts), que nao e afetada por
--    REVOKE de anon/authenticated.
-- ----------------------------------------------------------------------------
-- Assinaturas explicitas para nao depender de resolucao por nome.
revoke all on function public.creditar_saldo(uuid, text, numeric)
  from anon, authenticated;
revoke all on function public.creditar_saldo_tenant(uuid, numeric)
  from anon, authenticated;
revoke all on function public.debitar_saldo_tenant(uuid, numeric)
  from anon, authenticated;

commit;

-- ============================================================================
-- VERIFICACAO (rodar depois do commit; nao faz parte da transacao)
--
--   -- Esperado: 12 linhas, todas com rls = true e politicas = 0
--   select c.relname, c.relrowsecurity as rls, coalesce(p.cnt, 0) as politicas
--     from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--     left join (select polrelid, count(*) cnt from pg_policy group by 1) p
--            on p.polrelid = c.oid
--    where n.nspname = 'public' and c.relkind = 'r'
--    order by 1;
--
--   -- Esperado: zero linhas
--   select * from pg_policies where schemaname = 'public';
--
--   -- Esperado: anon_exec = false nas tres funcoes de saldo
--   select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname like '%saldo%';
--
-- E, do lado de fora, o teste negativo end-to-end:
--   node scripts/testar-rls.mjs
-- ============================================================================
