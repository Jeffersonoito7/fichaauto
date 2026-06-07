import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isProtected  = path.startsWith('/dashboard')
  const isLoginPage  = path === '/login'
  const isRoot       = path === '/'

  const auth = request.cookies.get('ficha-auth')?.value

  // Raiz sempre redireciona: logado → dashboard, não logado → login
  if (isRoot) {
    const url = request.nextUrl.clone()
    url.pathname = auth ? '/dashboard/consultar' : '/login'
    return NextResponse.redirect(url)
  }

  if (isProtected && !auth) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isLoginPage && auth) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/consultar'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
