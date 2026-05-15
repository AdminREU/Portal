import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const url = new URL(req.url)
    const soloNoLeidas = url.searchParams.get('no_leidas') === '1'

    let q = supabase.from('notificaciones').select('*').eq('user_email', u.email).order('created_at', { ascending: false }).limit(50)
    if (soloNoLeidas) q = q.eq('leida', false)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ ok: true, notificaciones: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

/**
 * POST — Crear notificaciones (uso interno o admin).
 * body: { user_email, tipo, titulo, mensaje, link, icono, color }
 * O bulk: { destinatarios: ['a@x.com', ...], tipo, ... }
 */
export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()

    const base = {
      tipo: body.tipo || 'sistema',
      titulo: body.titulo || null,
      mensaje: body.mensaje,
      link: body.link || null,
      icono: body.icono || null,
      color: body.color || null,
    }
    if (!base.mensaje) throw new Error('mensaje requerido')

    let rows: any[]
    if (Array.isArray(body.destinatarios) && body.destinatarios.length) {
      rows = body.destinatarios.map((e: string) => ({ ...base, user_email: e }))
    } else if (body.user_email) {
      rows = [{ ...base, user_email: body.user_email }]
    } else {
      throw new Error('Especifica user_email o destinatarios[]')
    }

    const { error } = await supabase.from('notificaciones').insert(rows)
    if (error) throw error
    return NextResponse.json({ ok: true, count: rows.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}

/**
 * PATCH — marcar todas como leídas
 */
export async function PATCH(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const { error } = await supabase.from('notificaciones').update({ leida: true }).eq('user_email', u.email).eq('leida', false)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
