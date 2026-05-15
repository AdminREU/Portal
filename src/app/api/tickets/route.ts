import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { sendNewTicketEmail } from '@/lib/email'

export async function GET(req: Request) {
  try {
    const { email, rol } = await validateToken(getToken(req))
    const { searchParams } = new URL(req.url)
    let query = supabase.from('tickets').select('*').order('fecha_creacion', { ascending: false })
    if (rol === 'USUARIO') query = query.eq('usuario_email', email)
    if (searchParams.get('estado')) query = query.eq('estado', searchParams.get('estado')!)
    if (searchParams.get('prioridad')) query = query.eq('prioridad', searchParams.get('prioridad')!)
    if (searchParams.get('q')) query = query.ilike('asunto', `%${searchParams.get('q')}%`)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ ok: true, tickets: data })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}

export async function POST(req: Request) {
  try {
    const { email, rol } = await validateToken(getToken(req))
    const body = await req.json()

    // Generar ID del ticket
    const { data: settings } = await supabase.from('settings').select('key,value')
    const cfg = Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]))
    const pad = parseInt(cfg['TICKET_PAD'] ?? '4')
    const seq = parseInt(cfg['TICKET_SEQ'] ?? '0') + 1
    await supabase.from('settings').upsert({ key: 'TICKET_SEQ', value: String(seq) }, { onConflict: 'key' })
    const ticketId = `Ticket-${String(seq).padStart(pad, '0')}`
    const usuarioEmail = rol !== 'USUARIO' && body.usuario_email ? body.usuario_email : email

    // Crear ticket
    const { data: ticket, error } = await supabase.from('tickets').insert({
      id: ticketId, usuario_email: usuarioEmail,
      area: body.area, ip: body.ip, almacen: body.almacen, equipo_num: body.equipoNum,
      categoria: body.categoria, subcategoria: body.subcategoria, servicio: body.servicio,
      prioridad: body.prioridad ?? 'MEDIA', asunto: body.asunto, descripcion: body.descripcion,
      estado: 'abierto', evidencias_json: body.evidencias ?? []
    }).select().single()
    if (error) throw error

    // Historial
    await supabase.from('ticket_history').insert({ ticket_id: ticketId, action: 'created', to: 'abierto', actor: email, note: `Creado por ${email}` })

    // Emails
    if (cfg['FEATURE_EMAIL_NEW_TICKET_TO_HELPDESK'] === 'true') {
      const { data: admins } = await supabase.from('users').select('email').in('rol', ['HELPDESK','ADMIN']).eq('estado','ACTIVO')
      for (const a of admins ?? []) {
        await sendNewTicketEmail({ to: a.email, ticketId, asunto: body.asunto, descripcion: body.descripcion, area: body.area, usuario: usuarioEmail, isHelpdesk: true }).catch(() => {})
      }
    }
    if (cfg['FEATURE_EMAIL_CONFIRM_TICKET_TO_USER'] === 'true') {
      await sendNewTicketEmail({ to: usuarioEmail, ticketId, asunto: body.asunto, descripcion: body.descripcion, area: body.area, usuario: usuarioEmail, isHelpdesk: false }).catch(() => {})
    }

    return NextResponse.json({ ok: true, ticket })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
