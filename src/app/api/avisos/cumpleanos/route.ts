import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    await validateToken(getToken(req))
    const { data, error } = await supabase.from('cumpleanos').select('*').order('mes').order('dia')
    if (error) throw error
    return NextResponse.json({ ok: true, cumpleanos: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()
    if (!body.nombre || !body.dia || !body.mes) {
      return NextResponse.json({ ok: false, error: 'Nombre, día y mes son requeridos' }, { status: 400 })
    }
    const { data, error } = await supabase.from('cumpleanos').insert({
      email: body.email || null,
      nombre: body.nombre,
      departamento: body.departamento || null,
      tipo: body.tipo || 'cumple',
      dia: Number(body.dia),
      mes: Number(body.mes),
      anio: body.anio ? Number(body.anio) : null,
      foto_url: body.foto_url || null,
      mostrar: body.mostrar !== false,
      notas: body.notas || null,
      mensaje: body.mensaje || null,
      imagen_url: body.imagen_url || null,
      link: body.link || null,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ ok: true, cumpleanos: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
