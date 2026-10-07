-- ============================================================================
-- 021_planos_recarga.sql
--
-- A tabela que o CRUD de pacotes de recarga já esperava e que nunca existiu.
--
-- Achado em 07/10/2026 numa varredura que conferiu, contra o banco, toda coluna
-- usada em `order()` no código. As quatro rotas (GET, POST, PUT, DELETE) e a
-- tela /dashboard/admin/pacotes estavam escritas e funcionando entre si, mas a
-- tabela nunca foi criada: a rota devolvia 500 e a tela fazia
-- `Array.isArray(data) ? data : []`, então mostrava lista VAZIA sem erro
-- nenhum. Resultado: nunca foi possível cadastrar pacote de recarga, e a tela
-- parecia apenas "sem pacotes ainda". Mesmo padrão de falha silenciosa do
-- histórico de consultas e do PDF.
--
-- Colunas espelham exatamente o que as rotas escrevem e leem, sem inventar
-- campo que o código não usa.
--
-- RLS: ligada e SEM política, como o resto do banco depois da 016. Deny-all
-- para anon e authenticated; a service role passa por BYPASSRLS. A tabela
-- define PREÇO de venda, então não pode ser escrita por quem vem do navegador.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- ============================================================================

begin;

create table if not exists public.planos_recarga (
  id              uuid primary key default gen_random_uuid(),
  nome            text        not null,
  -- Quantidade de consultas do pacote. A rota recusa zero e negativo.
  consultas       integer     not null check (consultas > 0),
  -- Preço de venda do pacote. A rota recusa zero e negativo.
  preco           numeric(10,2) not null check (preco > 0),
  descricao       text        null,
  -- Marca o pacote que a tela destaca como recomendado.
  destaque        boolean     not null default false,
  -- Texto livre do tipo "economize 20%", escrito pelo dono.
  economia_texto  text        null,
  ativo           boolean     not null default true,
  -- Ordem de exibição na vitrine. A rota ordena por ela, crescente.
  ordem           integer     not null default 0,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- A listagem ordena por `ordem` e filtra os ativos.
create index if not exists planos_recarga_ordem on public.planos_recarga (ativo, ordem);

alter table public.planos_recarga enable row level security;

comment on table public.planos_recarga is
  'Pacotes de recarga vendidos no painel. Define preco de venda, por isso so a service role escreve.';

commit;

-- Verificacao:
--   select nome, consultas, preco, ativo, ordem from public.planos_recarga order by ordem;
--   select relrowsecurity from pg_class where relname = 'planos_recarga';  -- true
--   select count(*) from pg_policies where tablename = 'planos_recarga';   -- 0
