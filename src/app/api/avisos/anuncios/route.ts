import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    await validateToken(getToken(req))
    const url = new URL(req.url)
    const incluirInactivos = url.searchParams.get('todos') === '1'
    let q = supabase.from('anuncios').select('*').order('prioridad', { ascending: false }).order('publicado_at', { ascending: false })
    if (!incluirInactivos) q = q.eq('activo', true)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ ok: true, anuncios: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()
    const { data, error } = await supabase.from('anuncios').insert({
      categoria: (body.categoria || 'ANUNCIO').toUpperCase(),
      titulo: body.titulo,
      mensaje: body.mensaje || '',
      color: body.color || '#ffd400',
      icono: body.icono || '📢',
      prioridad: Number(body.prioridad) || 0,
      publicado_at: body.publicado_at || new Date().toISOString(),
      expira_at: body.expira_at || null,
      activo: body.activo !== false,
      autor_email: u.email,
      autor_nombre: u.nombre || u.email,
      link: body.link || null,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ ok: true, anuncio: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
