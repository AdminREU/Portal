import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()
    const allow = ['nombre','rol','roles_extra','estado','puesto','departamento','telefono','nivel_aprobacion','foto_url']
    const upd: any = {}
    for (const k of allow) if (body[k] !== undefined) upd[k] = body[k]
    const { data } = await supabase.from('users').update(upd).eq('id', id).select().single()
    return NextResponse.json({ ok: true, user: data })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    await supabase.from('users').update({ estado: 'INACTIVO' }).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
