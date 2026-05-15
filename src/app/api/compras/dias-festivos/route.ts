import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const { data, error } = await supabase.from('dias_festivos').select('*').order('fecha')
    if (error) throw error
    return NextResponse.json({ ok: true, dias: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const b = await req.json()
    if (!b.fecha || !b.descripcion) throw new Error('fecha y descripcion requeridas')
    const { data: ex } = await supabase.from('dias_festivos').select('id').eq('fecha', b.fecha).single()
    if (ex) {
      await supabase.from('dias_festivos').update({ descripcion: b.descripcion }).eq('id', ex.id)
    } else {
      await supabase.from('dias_festivos').insert({ fecha: b.fecha, descripcion: b.descripcion })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const url = new URL(req.url)
    const fecha = url.searchParams.get('fecha')
    if (!fecha) throw new Error('fecha requerida')
    await supabase.from('dias_festivos').delete().eq('fecha', fecha)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
