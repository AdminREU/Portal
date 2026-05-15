import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['HELPDESK','COMPRAS','APROBADOR','ADMIN'], u.rolesExtra)
    const { searchParams } = new URL(req.url)
    let query = supabase.from('users').select('*').order('created_at', { ascending: false })
    if (searchParams.get('rol')) query = query.eq('rol', searchParams.get('rol')!)
    if (searchParams.get('estado')) query = query.eq('estado', searchParams.get('estado')!)
    const { data } = await query
    return NextResponse.json({ ok: true, users: data })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}

export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()
    const payload: any = {
      email: body.email.toLowerCase().trim(),
      nombre: body.nombre,
      rol: body.rol ?? 'USUARIO',
      roles_extra: Array.isArray(body.roles_extra) ? body.roles_extra : [],
      estado: body.estado || 'ACTIVO',
      puesto: body.puesto || null,
      departamento: body.departamento || null,
      telefono: body.telefono || null,
      nivel_aprobacion: body.nivel_aprobacion ?? null,
    }
    const { data, error } = await supabase.from('users').insert(payload).select().single()
    if (error) throw error
    return NextResponse.json({ ok: true, user: data })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
