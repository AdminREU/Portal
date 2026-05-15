import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles, hasRol } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { logOrdenHistory } from '@/lib/compras'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    const { data: orden, error } = await supabase.from('ordenes').select('*').eq('id', id).single()
    if (error || !orden) return NextResponse.json({ ok: false, error: 'OC no encontrada' }, { status: 404 })

    const puedeVer = orden.solicitante_email === u.email ||
                     hasRol(u.rol, u.rolesExtra, 'COMPRAS') ||
                     hasRol(u.rol, u.rolesExtra, 'APROBADOR') ||
                     hasRol(u.rol, u.rolesExtra, 'ADMIN')
    if (!puedeVer) return NextResponse.json({ ok: false, error: 'Sin permiso' }, { status: 403 })

    const [{ data: items }, { data: history }, { data: aprobs }] = await Promise.all([
      supabase.from('orden_items').select('*').eq('orden_id', id).order('posicion', { ascending: true }),
      supabase.from('orden_history').select('*').eq('orden_id', id).order('created_at', { ascending: false }),
      supabase.from('orden_aprobaciones').select('*').eq('orden_id', id).order('nivel', { ascending: true }),
    ])

    return NextResponse.json({ ok: true, orden, items: items || [], history: history || [], aprobaciones: aprobs || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    const body = await req.json()
    const { data: orden } = await supabase.from('ordenes').select('*').eq('id', id).single()
    if (!orden) throw new Error('OC no encontrada')

    requireRoles(u.rol, ['COMPRAS','ADMIN'], u.rolesExtra)

    const allow = [
      'estatus','observaciones','proveedor_id','proveedor_rfc','proveedor_razon',
      'oc_proveedor_url','fecha_envio_prov','fecha_estimada_entrega',
      'fecha_recepcion','recibido_por','observaciones_recep',
      'factura_folio','factura_uuid','factura_url','fecha_factura','fecha_limite_factura','factura_tardia',
      'fecha_pago','forma_pago','referencia_pago','motivo_rechazo',
    ]
    const update: any = {}
    for (const k of allow) if (body[k] !== undefined) update[k] = body[k]

    const { error } = await supabase.from('ordenes').update(update).eq('id', id)
    if (error) throw error

    if (update.estatus && update.estatus !== orden.estatus) {
      await logOrdenHistory(id, 'updated', { email: u.email, rol: u.rol }, {
        estatus_prev: orden.estatus, estatus_new: update.estatus, note: body.note || ''
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    const { data: orden } = await supabase.from('ordenes').select('*').eq('id', id).single()
    if (!orden) throw new Error('OC no encontrada')

    const esAdmin = hasRol(u.rol, u.rolesExtra, 'ADMIN')
    const esPropioBorrador = orden.solicitante_email === u.email && orden.estatus === 'borrador'
    if (!esAdmin && !esPropioBorrador) throw new Error('No autorizado')

    if (orden.pdf_filename) {
      await supabase.storage.from('compras-docs').remove([`oc/${orden.pdf_filename}`])
    }
    await supabase.from('ordenes').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
