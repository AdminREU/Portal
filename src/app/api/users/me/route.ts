import { NextResponse } from 'next/server'
import { validateToken, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const { data: user, error } = await supabase.from('users').select('*').eq('email', u.email).single()
    if (error) throw error
    return NextResponse.json({
      ok: true,
      user,
      rol: u.rol,
      roles_extra: u.rolesExtra,
    })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}

export async function PATCH(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const body = await req.json()
    const allow = ['nombre','puesto','departamento','telefono','foto_url']
    const upd: any = {}
    for (const k of allow) if (body[k] !== undefined) upd[k] = body[k]

    if (Object.keys(upd).length === 0) {
      return NextResponse.json({ ok: false, error: 'No hay datos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users').update(upd).eq('email', u.email).select().single()
    if (error) throw error
    return NextResponse.json({ ok: true, user: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Error al guardar perfil' }, { status: 400 })
  }
}
