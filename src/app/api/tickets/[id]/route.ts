import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { sendTicketReplyEmail } from '@/lib/email'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { email, rol } = await validateToken(getToken(req))
    const { data: ticket } = await supabase.from('tickets').select('*').eq('id', params.id).single()
    if (!ticket) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 })
    if (rol === 'USUARIO' && ticket.usuario_email !== email) return NextResponse.json({ ok: false, error: 'Sin acceso' }, { status: 403 })
    return NextResponse.json({ ok: true, ticket })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { email, rol } = await validateToken(getToken(req))
    const body = await req.json()
    const { data: ticket } = await supabase.from('tickets').select('*').eq('id', params.id).single()
    if (!ticket) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 })

    let updates: Record<string, any> = {}
    const notes: string[] = []

    if (rol === 'USUARIO') {
      // Usuario solo puede: agregar rating (ya no cierra tickets)
      if (ticket.usuario_email !== email) return NextResponse.json({ ok: false, error: 'Sin acceso' }, { status: 403 })
      if (body.rating) { updates.rating = body.rating; updates.rating_comment = body.rating_comment }
    } else {
      requireRoles(rol, ['HELPDESK', 'ADMIN'])
      if (body.estado) {
        updates.estado = body.estado
        if (ticket.estado !== body.estado) notes.push(`Estado: ${ticket.estado} → ${body.estado}`)
        // Si se cierra, guardar motivo
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

    const { data: updated, error } = await supabase.from('tickets').update(updates).eq('id', params.id).select().single()
    if (error) throw new Error(error.message)

    if (notes.length) {
      await supabase.from('ticket_history').insert({ ticket_id: params.id, action: 'updated', from: ticket.estado, to: updates.estado ?? ticket.estado, actor: email, note: notes.join('; ') })
    }

    if (body.respuesta_tecnico && rol !== 'USUARIO') {
      const { data: flags } = await supabase.from('settings').select('key,value')
      const fm = Object.fromEntries((flags ?? []).map((f: any) => [f.key, f.value]))
      if (fm['FEATURE_EMAIL_USER_ON_REPLY'] === 'true') {
        await sendTicketReplyEmail(ticket.usuario_email, { id: params.id, asunto: ticket.asunto, respuesta: body.respuesta_tecnico }).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true, ticket: updated })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
