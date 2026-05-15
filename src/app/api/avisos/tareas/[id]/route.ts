import { NextResponse } from 'next/server'
import { validateToken, getToken, hasRol } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    const body = await req.json()

    const { data: tarea } = await supabase.from('tareas').select('*').eq('id', id).single()
    if (!tarea) throw new Error('Tarea no encontrada')

    const esAdmin = hasRol(u.rol, u.rolesExtra, 'ADMIN')
    const esPropietario = tarea.creador_email === u.email || tarea.asignado_email === u.email
    if (!esAdmin && !esPropietario) throw new Error('Sin permiso')

    const allow = ['titulo','descripcion','fecha','hora','asignado_email','prioridad','status','modulo','link']
    const update: any = {}
    for (const k of allow) if (body[k] !== undefined) update[k] = body[k]
    const { error } = await supabase.from('tareas').update(update).eq('id', id)
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

    const { data: tarea } = await supabase.from('tareas').select('*').eq('id', id).single()
    if (!tarea) throw new Error('Tarea no encontrada')

    const esAdmin = hasRol(u.rol, u.rolesExtra, 'ADMIN')
    const esPropietario = tarea.creador_email === u.email
    if (!esAdmin && !esPropietario) throw new Error('Sin permiso')

    await supabase.from('tareas').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
