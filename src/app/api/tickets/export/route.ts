import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['HELPDESK', 'ADMIN'])
    const { searchParams } = new URL(req.url)
    let query = supabase.from('tickets').select('*').order('fecha_creacion', { ascending: false })
    if (searchParams.get('estado')) query = query.eq('estado', searchParams.get('estado')!)
    if (searchParams.get('prioridad')) query = query.eq('prioridad', searchParams.get('prioridad')!)
    const { data, error } = await query
    if (error) throw error
    const heads = ['ID','Usuario','Área','Categoría','Subcategoría','Servicio','Asunto','Estado','Prioridad','Técnico','Motivo cierre','Creado','Actualizado','Rating']
    const rows = (data ?? []).map(t => [
      t.id, t.usuario_email, t.area??'', t.categoria??'', t.subcategoria??'', t.servicio??'',
      `"${(t.asunto??'').replace(/"/g,'""')}"`, t.estado, t.prioridad,
      t.tecnico_asignado??'', t.motivo_cierre??'',
      t.fecha_creacion?new Date(t.fecha_creacion).toLocaleString('es-MX'):'',
      t.fecha_actualizacion?new Date(t.fecha_actualizacion).toLocaleString('es-MX'):'',
      t.rating??''
    ].join(','))
    const csv = [heads.join(','), ...rows].join('\n')
    return new Response('\uFEFF'+csv, { headers: { 'Content-Type':'text/csv;charset=utf-8', 'Content-Disposition':`attachment;filename="tickets-${new Date().toISOString().slice(0,10)}.csv"` } })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}
