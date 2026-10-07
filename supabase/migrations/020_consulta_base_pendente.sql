-- ============================================================================
-- 020_consulta_base_pendente.sql
--
-- Confirmacao do veiculo ANTES de rodar os modulos caros.
--
-- Motivo: a AutoVale consultou a placa TNM2H51 em 06/10/2026 trocando M por N
-- e pagou R$ 57,38 por um veiculo que nao era o dela. A identificacao veicular
-- custa R$ 3,22 e ja traz marca, modelo e ano, o suficiente para a pessoa
-- confirmar que digitou certo antes do resto.
--
-- O problema que esta tabela resolve: a consulta-base da Assertiva e sempre a
-- primeira chamada e dela sai o PROTOCOLO que os outros modulos exigem. Se a
-- etapa de confirmacao e a consulta completa fossem duas chamadas independentes,
-- a base seria paga DUAS vezes e a consulta subiria de R$ 57,38 para R$ 60,60.
-- Guardando aqui a resposta da base e o protocolo, a etapa completa reaproveita
-- o que ja foi pago e o total nao muda.
--
-- Janela curta de proposito: o protocolo da Assertiva nao tem validade
-- documentada, entao a aplicacao so reaproveita o registro recente (ver
-- JANELA_MINUTOS em lib/consulta-base-pendente.ts). Passado o prazo, a base e
-- consultada de novo e cobrada de novo, o que e o comportamento seguro: pior
-- que pagar R$ 3,22 outra vez e montar relatorio com protocolo invalido e
-- entregar modulo vazio como se fosse "nada consta".
--
-- RLS: ligada e SEM politica, igual ao resto do banco depois da 016. Deny-all
-- para anon e authenticated; a service role passa por BYPASSRLS. A tabela
-- guarda payload cru da Assertiva, com chassi e renavam, entao nao pode ser
-- legivel pela chave publicavel.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- ============================================================================

begin;

create table if not exists public.consulta_base_pendente (
  id          uuid primary key default gen_random_uuid(),
  -- Placa normalizada, sem hifen e em maiusculas.
  placa       text        not null,
  -- Dono do registro. O email identifica quem pagou a identificacao; o tenant
  -- permite que outro operador da mesma empresa confirme a mesma consulta.
  email       text        not null,
  tenant_id   uuid        null references public.tenants(id) on delete cascade,
  -- Resposta crua da consulta-base, incluindo cabecalho.protocolo.
  payload     jsonb       not null,
  protocolo   text        null,
  -- Quanto foi cobrado nesta etapa, para a etapa completa nao cobrar de novo.
  custo_pago  numeric(10,2) not null default 0,
  criado_em   timestamptz not null default now()
);

-- Uma pendencia por placa e por dono. Confirmar duas vezes a mesma placa
-- substitui o registro em vez de empilhar lixo.
create unique index if not exists consulta_base_pendente_chave
  on public.consulta_base_pendente (placa, email);

-- Busca pelo par placa + empresa, que e como a etapa completa procura.
create index if not exists consulta_base_pendente_tenant
  on public.consulta_base_pendente (tenant_id, placa);

-- Para a limpeza por idade.
create index if not exists consulta_base_pendente_criado_em
  on public.consulta_base_pendente (criado_em);

alter table public.consulta_base_pendente enable row level security;

comment on table public.consulta_base_pendente is
  'Consulta-base ja paga, aguardando a pessoa confirmar o veiculo. Evita pagar a base duas vezes. Registro velho nao e reaproveitado, ver lib/consulta-base-pendente.ts.';

commit;

-- Verificacao:
--   select placa, email, protocolo is not null as tem_protocolo, custo_pago, criado_em
--     from public.consulta_base_pendente order by criado_em desc;
--   select relrowsecurity from pg_class where relname = 'consulta_base_pendente';
--   -- deve ser true, e a proxima deve devolver zero politicas:
--   select count(*) from pg_policies where tablename = 'consulta_base_pendente';
