import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { email, rol } = await validateToken(getToken(req))
    requireRoles(rol, ['HELPDESK','ADMIN'])
    const { data: ticket } = await supabase.from('tickets').update({ tecnico_asignado: email, estado: 'asignado' }).eq('id', params.id).select().single()
    await supabase.from('ticket_history').insert({ ticket_id: params.id, action: 'assigned', to: 'asignado', actor: email, note: `Asignado a ${email}` })
    return NextResponse.json({ ok: true, ticket })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}
