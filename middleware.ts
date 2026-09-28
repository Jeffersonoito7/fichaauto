import { NextResponse, type NextRequest } from 'next/server'
import { isDominioProprio, getTenantByDominio } from '@/lib/tenant'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const host = request.headers.get('host') ?? ''

  const isProtected = path.startsWith('/dashboard')
  const isLoginPage = path === '/login'
  const isRoot      = path === '/'
  const auth        = request.cookies.get('ficha-auth')?.value

  // ── Deteccao de tenant por dominio ────────────────────────────────────────
  let tenantHeaders: Record<string, string> = {}
  let ehDominioDeCliente = false

  if (!isDominioProprio(host) && !path.startsWith('/api/') && !path.startsWith('/_next/')) {
    try {
      const tenant = await getTenantByDominio(host.split(':')[0].toLowerCase())
      if (tenant) {
        ehDominioDeCliente = true
        tenantHeaders = {
          'x-tenant-id':             tenant.id,
          'x-tenant-slug':           tenant.slug,
          'x-tenant-nome':           tenant.nome_fantasia ?? tenant.nome,
          'x-tenant-logo':           tenant.logo_url ?? '',
          'x-tenant-cor-primaria':   tenant.cor_primaria,
          'x-tenant-cor-secundaria': tenant.cor_secundaria,
          'x-tenant-cor-texto':      tenant.cor_texto,
        }
      }
    } catch {
      // nao bloqueia a requisicao se o banco estiver indisponivel
    }
  }

  function withHeaders(res: NextResponse) {
    Object.entries(tenantHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // ── Redirecionamentos de autenticacao ─────────────────────────────────────
  if (isRoot) {
    if (auth) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return withHeaders(NextResponse.redirect(url))
    }
    // No subdominio de um cliente quem chega e funcionario dele, nao
    // consumidor: vai direto para o login com a marca da empresa. A landing
    // de venda B2C so faz sentido no dominio principal.
    if (ehDominioDeCliente) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return withHeaders(NextResponse.redirect(url))
    }
    return withHeaders(NextResponse.next())
  }

  // O funil de venda ao consumidor final e do Ficha Auto, nao do cliente.
  // No endereco da empresa ele nao pode existir: o funcionario cairia num
  // pagamento avulso por PIX mesmo com a empresa tendo saldo, e a associacao
  // veria o fornecedor vendendo direto ao consumidor na propria casa.
  const ROTAS_B2C = ['/fipe', '/planos', '/lojista', '/consulta', '/cadastro']
  if (ehDominioDeCliente && ROTAS_B2C.some(r => path === r || path.startsWith(r + '/'))) {
    const url = request.nextUrl.clone()
    url.pathname = auth ? '/dashboard' : '/login'
    url.search = ''
    return withHeaders(NextResponse.redirect(url))
  }

  if (isProtected && !auth) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return withHeaders(NextResponse.redirect(url))
  }

  if (isLoginPage && auth) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/consultar'
    return withHeaders(NextResponse.redirect(url))
  }

  return withHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
