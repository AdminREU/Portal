import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { sendTicketReplyEmail } from '@/lib/email'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { email, rol, rolesExtra } = await validateToken(getToken(req))
    const { data: ticket, error } = await supabase.from('tickets').select('*').eq('id', id).single()
    if (error || !ticket) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 })

    const esTecnico = rol !== 'USUARIO' || rolesExtra.includes('HELPDESK') || rolesExtra.includes('ADMIN')
    // Usuario común solo puede ver sus propios tickets
    if (!esTecnico && ticket.usuario_email !== email) {
      return NextResponse.json({ ok: false, error: 'Sin acceso' }, { status: 403 })
    }
    return NextResponse.json({ ok: true, ticket })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { email, rol, rolesExtra } = await validateToken(getToken(req))
    const body = await req.json()
    const { data: ticket } = await supabase.from('tickets').select('*').eq('id', id).single()
    if (!ticket) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 })

    const esTecnico = rol !== 'USUARIO' || rolesExtra.includes('HELPDESK') || rolesExtra.includes('ADMIN')

    let updates: Record<string, any> = {}
    const notes: string[] = []

    if (!esTecnico) {
      // Usuario común solo puede: agregar rating en sus tickets
      if (ticket.usuario_email !== email) return NextResponse.json({ ok: false, error: 'Sin acceso' }, { status: 403 })
      if (body.rating) { updates.rating = body.rating; updates.rating_comment = body.rating_comment }
    } else {
      requireRoles(rol, ['HELPDESK', 'ADMIN'], rolesExtra)
      if (body.estado) {
        updates.estado = body.estado
        if (ticket.estado !== body.estado) notes.push(`Estado: ${ticket.estado} → ${body.estado}`)
        if (body.estado === 'cerrado' && body.motivo_cierre) {
          updates.motivo_cierre = body.motivo_cierre
          notes.push(`Motivo: ${body.motivo_cierre}`)
        }
      }
      if (body.tecnico_asignado !== undefined) { updates.tecnico_asignado = body.tecnico_asignado; notes.push(`Asignado a ${body.tecnico_asignado}`) }
      if (body.respuesta_tecnico !== undefined) { updates.respuesta_tecnico = body.respuesta_tecnico; notes.push('Respuesta actualizada') }
      if (body.prioridad) updates.prioridad = body.prioridad
    }

    if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true, ticket })

    const { data: updated, error } = await supabase.from('tickets').update(updates).eq('id', id).select().single()
    if (error) throw new Error(error.message)

    if (notes.length) {
      await supabase.from('ticket_history').insert({ ticket_id: id, action: 'updated', from: ticket.estado, to: updates.estado ?? ticket.estado, actor: email, note: notes.join('; ') })
    }

    if (body.respuesta_tecnico && esTecnico) {
      const { data: flags } = await supabase.from('settings').select('key,value')
      const fm = Object.fromEntries((flags ?? []).map((f: any) => [f.key, f.value]))
      if (fm['FEATURE_EMAIL_USER_ON_REPLY'] === 'true') {
        await sendTicketReplyEmail(ticket.usuario_email, { id: id, asunto: ticket.asunto, respuesta: body.respuesta_tecnico }).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true, ticket: updated })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
