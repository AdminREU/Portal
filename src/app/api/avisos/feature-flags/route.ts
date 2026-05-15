import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    await validateToken(getToken(req))
    const url = new URL(req.url)
    const categoria = url.searchParams.get('categoria')

    let q = supabase.from('feature_flags').select('*').order('clave')
    if (categoria) q = q.eq('categoria', categoria)
    const { data, error } = await q
    if (error) throw error

    const obj: Record<string, boolean> = {}
    for (const f of (data || [])) obj[f.clave] = f.valor
    return NextResponse.json({ ok: true, flags: data || [], values: obj })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

/**
 * POST — Crear/actualizar uno o varios flags
 * body: { flags: [{ clave, valor, descripcion?, categoria? }, ...] }
 *   o:  { clave, valor }
 */
export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()

    const flags = Array.isArray(body.flags) ? body.flags : (body.clave ? [{ clave: body.clave, valor: body.valor, descripcion: body.descripcion, categoria: body.categoria }] : [])
    if (!flags.length) throw new Error('Sin flags para actualizar')

    const rows = flags.map((f: any) => ({
      clave: f.clave,
      valor: !!f.valor,
      descripcion: f.descripcion ?? null,
      categoria: f.categoria ?? 'global',
      updated_by: u.email,
    }))

    const { error } = await supabase.from('feature_flags').upsert(rows, { onConflict: 'clave' })
    if (error) throw error
    return NextResponse.json({ ok: true, count: rows.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
