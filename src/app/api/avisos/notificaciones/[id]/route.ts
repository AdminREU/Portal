import { NextResponse } from 'next/server'
import { validateToken, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    const body = await req.json().catch(() => ({}))
    const update: any = {}
    if (body.leida !== undefined) update.leida = !!body.leida
    if (!Object.keys(update).length) update.leida = true
    const { error } = await supabase.from('notificaciones').update(update).eq('id', id).eq('user_email', u.email)
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
    await supabase.from('notificaciones').delete().eq('id', id).eq('user_email', u.email)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
