import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const domain = new URL(req.url).searchParams.get('domain')
  if (!domain || !/^[a-z0-9.-]+$/.test(domain)) {
    return new NextResponse(null, { status: 400 })
  }
  try {
    const res = await fetch(`https://logo.clearbit.com/${domain}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return new NextResponse(null, { status: 404 })
    const buf = await res.arrayBuffer()
    return new NextResponse(buf, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
