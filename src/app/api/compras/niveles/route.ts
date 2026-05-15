import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const { data, error } = await supabase.from('niveles_autorizacion')
      .select('*').order('nivel', { ascending: true })
    if (error) throw error
    return NextResponse.json({ ok: true, niveles: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()

    if (!body.nivel)  throw new Error('Nivel requerido')
    if (!body.nombre) throw new Error('Nombre requerido')

    const payload = {
      nivel:       parseInt(body.nivel, 10),
      nombre:      body.nombre,
      monto_hasta: Number(body.monto_hasta || 0),
      email:       body.email || '',
      puesto:      body.puesto || '',
      obligatorio: body.obligatorio !== false,
      activo:      body.activo !== false,
    }

    const { data: existing } = await supabase.from('niveles_autorizacion').select('id').eq('nivel', payload.nivel).single()
    if (existing) {
      const { error } = await supabase.from('niveles_autorizacion').update(payload).eq('id', existing.id)
      if (error) throw error
      return NextResponse.json({ ok: true, modo: 'update' })
    }
    const { error } = await supabase.from('niveles_autorizacion').insert(payload)
    if (error) throw error
    return NextResponse.json({ ok: true, modo: 'create' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const url = new URL(req.url)
    const nivel = parseInt(url.searchParams.get('nivel') || '0', 10)
    if (!nivel) throw new Error('Nivel requerido')
    const { error } = await supabase.from('niveles_autorizacion').delete().eq('nivel', nivel)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
