import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    await validateToken(getToken(req))
    const { data, error } = await supabase.from('frases').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ ok: true, frases: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()
    if (!body.texto) {
      return NextResponse.json({ ok: false, error: 'Texto requerido' }, { status: 400 })
    }
    const { data, error } = await supabase.from('frases').insert({
      texto: body.texto,
      autor: body.autor || null,
      categoria: body.categoria || 'motivacion',
      activo: body.activo !== false,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ ok: true, frase: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
