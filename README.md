# Ficha Auto

SaaS de consulta veicular B2B e B2C. Concorre com o MTix.

## O que faz

- Consulta de placa com relatório completo (identificação, restrições, roubo/furto, gravame, FIPE, leilão, sinistro)
- Consulta de CPF e CNPJ (crédito, negativações, processos)
- Modelo B2B multi-tenant: empresas compram créditos e consultam via painel próprio
- Consulta avulsa sem cadastro (pagamento via PIX)
- Monitoramento de placas com alertas

## Stack

- **Frontend/Backend:** Next.js 15 App Router + TypeScript + Tailwind CSS
- **Banco:** Supabase (PostgreSQL) — projeto `riofyddjhizynxdokxyl`
- **Auth:** JWT próprio via `lib/jwt.ts` + bcrypt
- **Dados veiculares:** Assertiva v3 (CLIENT_ID + SECRET via env)
- **Dados FIPE:** BrasilAPI / Parallelum (gratuito)
- **Pagamentos PIX:** Efí (Gerencianet)
- **PDF:** Puppeteer Core

## Estrutura de pastas

```
app/
  (auth)/          login, cadastro
  (public)/        fipe, consulta avulsa, landing
  api/             rotas de API
  dashboard/       painel autenticado (B2B)
components/        componentes React compartilhados
lib/
  providers/       integrações externas (assertiva, fipe, etc.)
  nfse/            emissão de NFS-e
supabase/
  migrations/      migrations numeradas (006_audit_log, 006b_tenant_assinatura, ...)
```

## Como subir localmente

1. Instalar dependências:
   ```bash
   npm install
   ```

2. Criar `.env.local` com as variáveis (ver seção abaixo)

3. Rodar em desenvolvimento:
   ```bash
   npm run dev
   ```
   Acessa em http://localhost:3000

## Variáveis de ambiente necessárias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
JWT_SECRET=            # obrigatório, mínimo 32 caracteres. A aplicação não sobe sem.
                       # gerar: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
ADMIN_EMAIL=
ADMIN_SENHA=           # hash bcrypt: node -e "require('bcryptjs').hash('senha',12).then(console.log)"
ADMIN_NOME=

# Assertiva (login e senha, não ClientID/Secret)
ASSERTIVA_LOGIN=
ASSERTIVA_PASSWORD=

# Efí (PIX)
EFI_CLIENT_ID=
EFI_CLIENT_SECRET=
EFI_PIX_KEY=
EFI_SANDBOX=false
EFI_CERT_BASE64=
PIX_WEBHOOK_SECRET=

# Infocar (leilão, R$ 5,56 contra R$ 13,79 da Assertiva)
INFOCAR_API_KEY=       # sem ela o leilão cai na Assertiva automaticamente
INFOCAR_IA_DANOS=false

# Cron
CRON_SECRET=

# PDF
CHROMIUM_PATH=

# App
NEXT_PUBLIC_APP_URL=https://fichaauto.com.br
PORT=4000
```

Trocar o `JWT_SECRET` invalida todas as sessões ativas: os usuários precisam
entrar de novo.

## Deploy

Servidor: Hostgator `76.13.229.154`, PM2 processo `ficha-auto`, pasta `/var/www/ficha-auto`.

O GitHub Actions (`.github/workflows/deploy.yml`) faz deploy automático no push para `main`:
1. SSH no servidor
2. `git pull`
3. `npm ci --omit=dev`
4. `npm run build`
5. `pm2 restart ficha-auto`

Para deploy manual:
```bash
ssh -i ~/.ssh/id_ed25519_hostinger root@76.13.229.154
cd /var/www/ficha-auto
git pull && npm ci --omit=dev && npm run build && pm2 restart ficha-auto
```

## Multi-tenant B2B

Cada empresa (tenant) tem:
- Subdomínio próprio (ex: `autovale.fichaauto.com.br`)
- Logo e cores configuráveis
- Saldo separado de créditos (`saldo_veiculo`, `saldo_cpf`)
- Recarga via PIX

O `middleware.ts` detecta o subdomínio e injeta `x-tenant-id` em todas as requisições.

## Banco de dados

Migrations em `supabase/migrations/`, numeradas sequencialmente. Para aplicar uma migration nova no Supabase, cole o SQL no SQL Editor do painel Supabase ou use o MCP do Supabase no Claude Code.

As migrations não são gerenciadas pelo CLI do Supabase (sem `supabase db push`); são aplicadas manualmente.
