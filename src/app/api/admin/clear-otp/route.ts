import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['ADMIN'])
    const { email } = await req.json()
    await supabase.from('otp_codes').delete().eq('email', email.toLowerCase().trim())
    await supabase.from('users').update({ otp_fail_count: 0 }).eq('email', email.toLowerCase().trim())
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
