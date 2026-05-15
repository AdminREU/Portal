import { NextResponse } from 'next/server'
import { validateToken, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const { data: user } = await supabase.from('users').select('*').eq('email', u.email).single()
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
    const allow = ['nombre','puesto','departamento','telefono','foto_url']  // el usuario puede editar su propio perfil (NO roles)
    const upd: any = {}
    for (const k of allow) if (body[k] !== undefined) upd[k] = body[k]
    await supabase.from('users').update(upd).eq('email', u.email)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
