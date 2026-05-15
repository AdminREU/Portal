import { NextResponse } from 'next/server'
import { validateToken, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    await validateToken(getToken(req))
    const { data } = await supabase
      .from('users')
      .select('email, nombre, agent_status, agent_status_detail, agent_status_updated_at, ultimo_acceso')
      .in('rol', ['HELPDESK', 'ADMIN'])
      .eq('estado', 'ACTIVO')
    return NextResponse.json({ ok: true, agents: data ?? [] })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}

export async function PATCH(req: Request) {
  try {
    const { email } = await validateToken(getToken(req))
    const body = await req.json()
    const updates: Record<string, any> = { agent_status_updated_at: new Date().toISOString() }
    if (body.status !== undefined) updates.agent_status = body.status
    if (body.detail !== undefined) updates.agent_status_detail = body.detail
    await supabase.from('users').update(updates).eq('email', email)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
