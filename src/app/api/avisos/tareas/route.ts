import { NextResponse } from 'next/server'
import { validateToken, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const url = new URL(req.url)
    const scope = url.searchParams.get('scope') || 'mias'  // mias | todas (admin)
    const desde = url.searchParams.get('desde')
    const hasta = url.searchParams.get('hasta')

    let q = supabase.from('tareas').select('*').order('fecha', { ascending: true })
    if (scope === 'mias') q = q.or(`asignado_email.eq.${u.email},asignado_email.is.null,creador_email.eq.${u.email}`)
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ ok: true, tareas: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const body = await req.json()
    if (!body.titulo || !body.fecha) {
      return NextResponse.json({ ok: false, error: 'Título y fecha son requeridos' }, { status: 400 })
    }
    const { data, error } = await supabase.from('tareas').insert({
      titulo: body.titulo,
      descripcion: body.descripcion || null,
      fecha: body.fecha,
      hora: body.hora || null,
      asignado_email: body.asignado_email || u.email,
      creador_email: u.email,
      prioridad: body.prioridad || 'media',
      status: body.status || 'pendiente',
      modulo: body.modulo || 'portal',
      link: body.link || null,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ ok: true, tarea: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
