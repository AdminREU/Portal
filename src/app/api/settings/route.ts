import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    await validateToken(getToken(req))
    const { data } = await supabase.from('settings').select('key,value')
    const flags = Object.fromEntries((data ?? []).map((f: any) => [f.key, f.value]))
    return NextResponse.json({ ok: true, flags })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}

export async function PATCH(req: Request) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['ADMIN'])
    const { key, value } = await req.json()
    await supabase.from('settings').update({ value: String(value) }).eq('key', key)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
