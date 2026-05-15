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
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()
    // Soporta { key, value } o { settings: [{key,value}, ...] }
    const pairs: { key: string; value: any }[] = Array.isArray(body.settings)
      ? body.settings
      : (body.key ? [{ key: body.key, value: body.value }] : [])
    if (!pairs.length) throw new Error('Sin settings para actualizar')
    const rows = pairs.map(p => ({ key: p.key, value: String(p.value ?? '') }))
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
    if (error) throw error
    return NextResponse.json({ ok: true, count: rows.length })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
