import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    await validateToken(getToken(req))
    const url = new URL(req.url)
    const desde = url.searchParams.get('desde') || new Date().toISOString().slice(0, 10)
    const hasta = url.searchParams.get('hasta')

    let q = supabase.from('eventos').select('*').eq('activo', true).gte('fecha', desde).order('fecha', { ascending: true })
    if (hasta) q = q.lte('fecha', hasta)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ ok: true, eventos: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()
    if (!body.titulo || !body.fecha) {
      return NextResponse.json({ ok: false, error: 'Título y fecha son requeridos' }, { status: 400 })
    }
    const { data, error } = await supabase.from('eventos').insert({
      titulo: body.titulo,
      descripcion: body.descripcion || null,
      tipo: body.tipo || 'evento',
      fecha: body.fecha,
      hora_inicio: body.hora_inicio || null,
      hora_fin: body.hora_fin || null,
      lugar: body.lugar || null,
      icono: body.icono || '🎉',
      color: body.color || '#a78bfa',
      link: body.link || null,
      imagen_url: body.imagen_url || null,
      activo: body.activo !== false,
      autor_email: u.email,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ ok: true, evento: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
