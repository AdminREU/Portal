import { NextResponse } from 'next/server'
import { validateToken, getToken, hasRol } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// GET — métricas (dashboard)
export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const url = new URL(req.url)
    const mine = url.searchParams.get('mine') === '1'
    const puedeVerTodo = !mine && (
      hasRol(u.rol, u.rolesExtra, 'COMPRAS') ||
      hasRol(u.rol, u.rolesExtra, 'APROBADOR') ||
      hasRol(u.rol, u.rolesExtra, 'ADMIN')
    )

    let q = supabase.from('ordenes').select('estatus,tipo_compra,total,created_at,solicitante_email')
    if (!puedeVerTodo) q = q.eq('solicitante_email', u.email)
    const { data, error } = await q
    if (error) throw error

    const byEstatus: Record<string, number> = {}
    const byTipo:    Record<string, number> = {}
    let totalMonto = 0
    let pendientes = 0, aprobadas = 0
    for (const o of data || []) {
      byEstatus[o.estatus] = (byEstatus[o.estatus] || 0) + 1
      byTipo[o.tipo_compra] = (byTipo[o.tipo_compra] || 0) + 1
      totalMonto += Number(o.total) || 0
      if (o.estatus === 'pendiente_aprob') pendientes++
      if (o.estatus === 'aprobada' || o.estatus === 'en_compra' || o.estatus === 'pagada') aprobadas++
    }

    return NextResponse.json({
      ok: true,
      stats: {
        total: data?.length || 0,
        totalMonto: +totalMonto.toFixed(2),
        pendientes,
        aprobadas,
        byEstatus,
        byTipo,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}
