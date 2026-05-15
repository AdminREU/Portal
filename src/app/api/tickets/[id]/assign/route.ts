import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { email, rol, rolesExtra } = await validateToken(getToken(req))
    requireRoles(rol, ['HELPDESK','ADMIN'], rolesExtra)
    const { data: ticket } = await supabase.from('tickets').update({ tecnico_asignado: email, estado: 'asignado' }).eq('id', id).select().single()
    await supabase.from('ticket_history').insert({ ticket_id: id, action: 'assigned', to: 'asignado', actor: email, note: `Asignado a ${email}` })
    return NextResponse.json({ ok: true, ticket })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}
