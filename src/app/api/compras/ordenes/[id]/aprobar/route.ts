import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles, hasRol } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { logOrdenHistory } from '@/lib/compras'

// POST — aprobar OC (avanza al siguiente nivel o pasa a aprobada)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['APROBADOR','COMPRAS','ADMIN'], u.rolesExtra)

    const body = await req.json().catch(() => ({}))
    const { data: orden } = await supabase.from('ordenes').select('*').eq('id', id).single()
    if (!orden) throw new Error('OC no encontrada')
    if (!['pendiente_aprob','borrador'].includes(orden.estatus)) {
      throw new Error(`No se puede aprobar OC en estatus "${orden.estatus}"`)
    }

    // Registrar aprobación en nivel actual
    const nivelActual = orden.nivel_aprobacion_actual || 1
    await supabase.from('orden_aprobaciones').upsert({
      orden_id: id,
      nivel: nivelActual,
      email: u.email,
      nombre: u.nombre || u.email,
      decision: 'aprobada',
      comentario: body.comentario || '',
      fecha: new Date().toISOString(),
    }, { onConflict: 'orden_id,nivel' })

    // ¿Hay nivel superior pendiente?
    const { data: niveles } = await supabase.from('niveles_autorizacion')
      .select('*').eq('activo', true).order('nivel', { ascending: true })
    const next = niveles?.find(n => n.nivel > nivelActual && (Number(n.monto_hasta) === 0 || orden.total > (niveles.find(x => x.nivel === nivelActual)?.monto_hasta || 0)))

    let nuevoEstatus = orden.estatus
    let nuevoNivel = nivelActual
    if (next && orden.total > Number(niveles?.find(n => n.nivel === nivelActual)?.monto_hasta || 0)) {
      // Subir al siguiente nivel
      nuevoNivel = next.nivel
      nuevoEstatus = 'pendiente_aprob'
      // Crear registro pendiente del siguiente nivel si no existe
      await supabase.from('orden_aprobaciones').upsert({
        orden_id: id,
        nivel: next.nivel,
        email: next.email,
        nombre: next.nombre,
        decision: 'pendiente',
      }, { onConflict: 'orden_id,nivel' })
    } else {
      // Aprobada final
      nuevoEstatus = 'aprobada'
    }

    await supabase.from('ordenes').update({
      estatus: nuevoEstatus,
      nivel_aprobacion_actual: nuevoNivel,
      aprobador_email: u.email,
      aprobador_nombre: u.nombre || u.email,
      fecha_aprobacion: nuevoEstatus === 'aprobada' ? new Date().toISOString() : orden.fecha_aprobacion,
    }).eq('id', id)

    await logOrdenHistory(id, 'approved', { email: u.email, rol: u.rol }, {
      estatus_prev: orden.estatus, estatus_new: nuevoEstatus,
      note: `Nivel ${nivelActual} aprobado. ${body.comentario || ''}`.trim(),
    })

    return NextResponse.json({ ok: true, estatus: nuevoEstatus, nivel: nuevoNivel })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
