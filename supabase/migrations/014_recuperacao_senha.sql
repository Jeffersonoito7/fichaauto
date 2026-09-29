-- Recuperacao de senha por link enviado no e-mail.
-- Guardamos apenas o SHA-256 do token. O valor em claro existe somente
-- dentro do link que vai no e-mail, nunca no banco.
-- Escrita idempotente: a tabela foi criada em producao antes deste arquivo.

create table if not exists public.senha_tokens (
  id         uuid primary key default gen_random_uuid(),
  email      text        not null,
  token_hash text        not null unique,
  expira_em  timestamptz not null,
  usado_em   timestamptz,
  criado_em  timestamptz not null default now(),
  ip         text
);

create index if not exists idx_senha_tokens_hash  on public.senha_tokens (token_hash);
create index if not exists idx_senha_tokens_email on public.senha_tokens (email, criado_em desc);

-- RLS ligado e NENHUMA politica: so a service role (rotas de servidor) le e
-- escreve. Sem isto, a chave anonima conseguiria listar tokens validos.
alter table public.senha_tokens enable row level security;
