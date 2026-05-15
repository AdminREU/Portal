import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || ''
  const portalInternal = process.env.PORTAL_URL || portalUrl
  const fallback = portalUrl || new URL('/login', req.url).toString()

  if (!token) return NextResponse.redirect(fallback)

  try {
    const resp = await fetch(`${portalInternal}/api/sso/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, app: 'helpdesk' }),
    })
    const result = await resp.json()
    if (!result.ok) return NextResponse.redirect(fallback)

    const session = await createSession(result.email)
    const page = session.rol === 'USUARIO' ? '/portal' : '/helpdesk'
    const dest = new URL(`${appUrl}${page}`)
    dest.searchParams.set('_sso', session.token)
    const response = NextResponse.redirect(dest)
    response.cookies.set('auth_token', session.token, {
      httpOnly: false, path: '/', maxAge: 8 * 3600, sameSite: 'lax',
    })
    return response
  } catch {
    return NextResponse.redirect(new URL('/login', req.url))
  }
}
