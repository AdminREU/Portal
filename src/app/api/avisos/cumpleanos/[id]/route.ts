import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()
    const allow = ['email','nombre','departamento','tipo','dia','mes','anio','foto_url','mostrar','notas']
    const update: any = {}
    for (const k of allow) if (body[k] !== undefined) update[k] = body[k]
    const { error } = await supabase.from('cumpleanos').update(update).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    await supabase.from('cumpleanos').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
