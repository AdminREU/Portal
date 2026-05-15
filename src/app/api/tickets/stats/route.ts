import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['HELPDESK','ADMIN'])
    const { data } = await supabase.from('tickets').select('estado, tecnico_asignado')
    const t = data ?? []
    return NextResponse.json({ ok: true, stats: {
      total: t.length,
      abiertos: t.filter(x => x.estado === 'abierto').length,
      en_proceso: t.filter(x => ['asignado','en_espera_recurso','en_espera_confirmacion'].includes(x.estado)).length,
      resueltos: t.filter(x => x.estado === 'resuelto').length,
      cerrados: t.filter(x => x.estado === 'cerrado').length,
      sin_asignar: t.filter(x => !x.tecnico_asignado && x.estado === 'abierto').length,
    }})
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}
