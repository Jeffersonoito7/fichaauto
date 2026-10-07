-- ─────────────────────────────────────────────────────────────────────────────
-- 019_fornecedores_por_tenant.sql
--
-- Escolha de fornecedor de dados POR EMPRESA CLIENTE. Antes a escolha era
-- global do dono (config_financeiro); agora cada empresa pode ter a dela, para
-- a AutoVale consumir a Assertiva ate o credito ja pago acabar enquanto os
-- demais clientes vao para o fornecedor mais barato.
--
-- ATENCAO: esta coluna foi aplicada direto em producao em 06/10/2026 e o
-- arquivo so foi escrito depois, em 06/10/2026, quando percebi a divergencia.
-- Banco na frente do repo e armadilha conhecida: a proxima pessoa que montar o
-- ambiente do zero nao teria a coluna. Por isso o arquivo e IDEMPOTENTE e pode
-- rodar em banco que ja tem a coluna.
--
-- Formato: { "<modulo do catalogo>": "<fornecedor>" }, por exemplo
--   { "placa_leilao": "assertiva", "placa_bin_federal": "assertiva" }
-- Objeto vazio significa "usa a escolha global do dono", que por sua vez vazia
-- significa "decide automatico pelo mais barato com chave configurada".
-- Lido por lib/escolha-fornecedor.ts (lerEscolhasDoTenant).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.tenants
  add column if not exists fornecedores_modulo jsonb not null default '{}'::jsonb;

comment on column public.tenants.fornecedores_modulo is
  'Fornecedor de dados escolhido por modulo para esta empresa. Vence a escolha global do dono. Vazio = herda o global.';

-- Verificacao:
--   select nome, fornecedores_modulo from public.tenants;
