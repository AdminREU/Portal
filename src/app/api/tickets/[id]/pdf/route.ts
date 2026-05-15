import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['HELPDESK','ADMIN'])
    const { data: t } = await supabase.from('tickets').select('*').eq('id', params.id).single()
    if (!t) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 })
    const fmt = (d: string) => d ? new Date(d).toLocaleString('es-MX') : '—'
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t.id} — Resolución</title>
    <style>body{font-family:sans-serif;padding:40px;color:#191919;max-width:800px;margin:0 auto}
    h1{font-size:22px;margin-bottom:4px}h2{font-size:15px;color:#555;font-weight:400;margin-bottom:24px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
    .field{margin-bottom:0}.label{font-size:11px;text-transform:uppercase;color:#999;margin-bottom:4px}
    .value{font-size:14px;padding:10px;background:#f7f6f3;border-radius:6px;min-height:36px}
    .full{grid-column:1/-1}.footer{margin-top:40px;font-size:12px;color:#999;border-top:1px solid #e5e4e0;padding-top:16px}
    </style></head><body>
    <h1>${t.id} — ${t.asunto}</h1>
    <h2>Resolución generada el ${fmt(new Date().toISOString())}</h2>
    <div class="grid">
      <div class="field"><div class="label">Usuario</div><div class="value">${t.usuario_email}</div></div>
      <div class="field"><div class="label">Técnico asignado</div><div class="value">${t.tecnico_asignado||'—'}</div></div>
      <div class="field"><div class="label">Estado final</div><div class="value">${t.estado}</div></div>
      <div class="field"><div class="label">Prioridad</div><div class="value">${t.prioridad}</div></div>
      <div class="field"><div class="label">Área</div><div class="value">${t.area||'—'}</div></div>
      <div class="field"><div class="label">Categoría</div><div class="value">${t.categoria||'—'} ${t.servicio?'/ '+t.servicio:''}</div></div>
      <div class="field"><div class="label">Fecha de creación</div><div class="value">${fmt(t.fecha_creacion)}</div></div>
      <div class="field"><div class="label">Última actualización</div><div class="value">${fmt(t.fecha_actualizacion)}</div></div>
      <div class="field full"><div class="label">Descripción del problema</div><div class="value" style="white-space:pre-wrap">${t.descripcion||'—'}</div></div>
      <div class="field full"><div class="label">Resolución / Respuesta técnica</div><div class="value" style="white-space:pre-wrap;min-height:80px">${t.respuesta_tecnico||'—'}</div></div>
    </div>
    <div class="footer">${process.env.NEXT_PUBLIC_APP_NAME||'Helpdesk'} — Documento generado automáticamente</div>
    </body></html>`
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename="${t.id}-resolucion.html"` } })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}
