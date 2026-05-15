import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const { data } = await supabase.from('sessions').select('*').gt('expires_at', new Date().toISOString()).order('last_active', { ascending: false })
    return NextResponse.json({ ok: true, sessions: data ?? [] })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}

export async function DELETE(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()
    if (body.email) {
      // Cerrar TODAS las sesiones de un usuario
      const { error, count } = await supabase.from('sessions').delete({ count: 'exact' }).eq('email', body.email.toLowerCase().trim())
      if (error) throw error
      return NextResponse.json({ ok: true, count: count ?? 0 })
    }
    if (body.token) {
      await supabase.from('sessions').delete().eq('token', body.token)
      return NextResponse.json({ ok: true })
    }
    throw new Error('Especifica token o email')
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
