import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['ADMIN'])
    const { data } = await supabase.from('sessions').select('*').gt('expires_at', new Date().toISOString()).order('last_active', { ascending: false })
    return NextResponse.json({ ok: true, sessions: data ?? [] })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}

export async function DELETE(req: Request) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['ADMIN'])
    const { token } = await req.json()
    await supabase.from('sessions').delete().eq('token', token)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
