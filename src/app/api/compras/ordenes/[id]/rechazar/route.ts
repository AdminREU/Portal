import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { logOrdenHistory } from '@/lib/compras'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['APROBADOR','COMPRAS','ADMIN'], u.rolesExtra)

    const body = await req.json().catch(() => ({}))
    if (!body.motivo) throw new Error('Motivo de rechazo requerido')

    const { data: orden } = await supabase.from('ordenes').select('*').eq('id', id).single()
    if (!orden) throw new Error('OC no encontrada')

    const nivelActual = orden.nivel_aprobacion_actual || 1
    await supabase.from('orden_aprobaciones').upsert({
      orden_id: id,
      nivel: nivelActual,
      email: u.email,
      nombre: u.nombre || u.email,
      decision: 'rechazada',
      comentario: body.motivo,
      fecha: new Date().toISOString(),
    }, { onConflict: 'orden_id,nivel' })

    await supabase.from('ordenes').update({
      estatus: 'rechazada',
      motivo_rechazo: body.motivo,
    }).eq('id', id)

    await logOrdenHistory(id, 'rejected', { email: u.email, rol: u.rol }, {
      estatus_prev: orden.estatus, estatus_new: 'rechazada', note: body.motivo,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
