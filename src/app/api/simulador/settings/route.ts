import { NextResponse } from 'next/server'
import { validateToken, getToken, hasRol } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/simulador/settings           → todos los settings
 * GET /api/simulador/settings?key=foo   → un setting específico
 *
 * Cualquier usuario autenticado puede leer (necesario para que cargue el
 * simulador con su catálogo de productos y vehículos).
 */
export async function GET(req: Request) {
  try {
    await validateToken(getToken(req))
    const url = new URL(req.url)
    const key = url.searchParams.get('key')
    if (key) {
      const { data, error } = await supabase.from('simulator_settings').select('*').eq('key', key).maybeSingle()
      if (error) throw error
      return NextResponse.json({ ok: true, setting: data })
    }
    const { data, error } = await supabase.from('simulator_settings').select('*')
    if (error) throw error
    const map: Record<string, any> = {}
    for (const s of (data || [])) map[s.key] = s.value
    return NextResponse.json({ ok: true, settings: data || [], values: map })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

/**
 * POST /api/simulador/settings  body: { key, value }
 * Upsert de una key. Solo ADMIN puede escribir.
 */
export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    if (!hasRol(u.rol, u.rolesExtra, 'ADMIN')) {
      return NextResponse.json({ ok: false, error: 'Solo ADMIN puede modificar settings' }, { status: 403 })
    }
    const body = await req.json()
    if (!body.key) throw new Error('key requerido')
    const { error } = await supabase.from('simulator_settings').upsert({
      key: body.key,
      value: body.value ?? null,
      updated_by: u.email,
    }, { onConflict: 'key' })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}

/**
 * DELETE /api/simulador/settings?key=foo
 * Eliminar una key. Solo ADMIN.
 */
export async function DELETE(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    if (!hasRol(u.rol, u.rolesExtra, 'ADMIN')) {
      return NextResponse.json({ ok: false, error: 'Solo ADMIN' }, { status: 403 })
    }
    const url = new URL(req.url)
    const key = url.searchParams.get('key')
    if (!key) throw new Error('key requerido')
    await supabase.from('simulator_settings').delete().eq('key', key)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
