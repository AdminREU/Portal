import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const { email } = await req.json()
    if (!email) throw new Error('email requerido')
    const normalized = email.toLowerCase().trim()
    await supabase.from('otp_codes').delete().eq('email', normalized)
    await supabase.from('users').update({ otp_fail_count: 0 }).eq('email', normalized)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
