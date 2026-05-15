import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles, hasRol } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const url = new URL(req.url)
    const depto = url.searchParams.get('depto') || ''
    const anio = parseInt(url.searchParams.get('anio') || `${new Date().getFullYear()}`, 10)

    let q = supabase.from('presupuestos').select('*').eq('anio', anio).order('mes')
    if (depto) q = q.eq('departamento', depto)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ ok: true, presupuestos: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN','COMPRAS'], u.rolesExtra)
    const b = await req.json()
    if (!b.departamento || !b.anio || !b.mes) throw new Error('departamento, anio, mes requeridos')
    const payload = {
      departamento: b.departamento, anio: parseInt(b.anio, 10), mes: parseInt(b.mes, 10),
      monto: Number(b.monto || 0), gastado: Number(b.gastado || 0),
      updated_at: new Date().toISOString(),
    }
    const { data: ex } = await supabase.from('presupuestos').select('id')
      .eq('departamento', payload.departamento).eq('anio', payload.anio).eq('mes', payload.mes).single()
    if (ex) {
      const { error } = await supabase.from('presupuestos').update(payload).eq('id', ex.id)
      if (error) throw error
      return NextResponse.json({ ok: true, modo: 'update' })
    }
    const { error } = await supabase.from('presupuestos').insert(payload)
    if (error) throw error
    return NextResponse.json({ ok: true, modo: 'create' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
