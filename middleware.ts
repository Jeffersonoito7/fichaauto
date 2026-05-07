import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const publicPaths = ['/', '/login', '/cadastro', '/esqueci-senha']
  const isPublic = publicPaths.some(p => path === p || path.startsWith('/api/') || path.startsWith('/_next') || path.startsWith('/favicon'))

  // TODO: adicionar verificação de sessão Supabase quando configurado
  // Por ora libera tudo para desenvolvimento
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
