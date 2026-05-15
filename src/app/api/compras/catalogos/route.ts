import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const KEYS = ['compras_empresas','compras_departamentos','compras_unidades','compras_categorias','compras_tipos','compras_estatus']

export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const { data, error } = await supabase.from('catalogs').select('key,value').in('key', KEYS)
    if (error) throw error
    const out: Record<string, any> = {}
    for (const k of KEYS) out[k] = []
    for (const row of data || []) out[row.key] = row.value
    return NextResponse.json({ ok: true, catalogos: out })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

// POST — actualizar un catálogo { key, value: [...] }
export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()
    if (!body.key || !KEYS.includes(body.key)) throw new Error('Catálogo inválido')
    if (!Array.isArray(body.value)) throw new Error('value debe ser array')
    const { data: ex } = await supabase.from('catalogs').select('id').eq('key', body.key).single()
    if (ex) await supabase.from('catalogs').update({ value: body.value }).eq('id', ex.id)
    else    await supabase.from('catalogs').insert({ key: body.key, value: body.value })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
