import { NextResponse } from 'next/server'
import { validateToken, getToken, hasRol } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// GET — datos consolidados para el dashboard portal (compras + helpdesk del usuario)
export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))

    const puedeVerTodoCompras = hasRol(u.rol, u.rolesExtra, 'COMPRAS') ||
                                hasRol(u.rol, u.rolesExtra, 'APROBADOR') ||
                                hasRol(u.rol, u.rolesExtra, 'ADMIN')
    const puedeVerTodoTickets = hasRol(u.rol, u.rolesExtra, 'HELPDESK') ||
                                hasRol(u.rol, u.rolesExtra, 'ADMIN')

    // Compras del usuario o todas si tiene rol
    let qC = supabase.from('ordenes').select('id,estatus,total,created_at,solicitante_email').order('created_at', { ascending: false }).limit(50)
    if (!puedeVerTodoCompras) qC = qC.eq('solicitante_email', u.email)

    // Tickets del usuario o todos si tiene rol
    let qT = supabase.from('tickets').select('id,estado,asunto,prioridad,fecha_creacion,usuario_email').order('fecha_creacion', { ascending: false }).limit(50)
    if (!puedeVerTodoTickets) qT = qT.eq('usuario_email', u.email)

    const [{ data: oc }, { data: tk }] = await Promise.all([qC, qT])

    return NextResponse.json({
      ok: true,
      dashboard: {
        ordenes: oc || [],
        tickets: tk || [],
        accesos: {
          puede_helpdesk_admin: hasRol(u.rol, u.rolesExtra, 'HELPDESK') || hasRol(u.rol, u.rolesExtra, 'ADMIN'),
          puede_compras_admin: hasRol(u.rol, u.rolesExtra, 'COMPRAS') || hasRol(u.rol, u.rolesExtra, 'APROBADOR') || hasRol(u.rol, u.rolesExtra, 'ADMIN'),
          es_admin: hasRol(u.rol, u.rolesExtra, 'ADMIN'),
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}
